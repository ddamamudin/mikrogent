import Anthropic from "@anthropic-ai/sdk";
import { TOOL_SCHEMAS, TOOL_LABELS, executeTool, ToolContext } from "./tools";
import { buildSystemPrompt, fallbackText } from "./persona";

export type SseEvent =
  | { type: "text"; text: string }
  | { type: "tool"; label: string }
  | { type: "done"; messages: unknown[]; cacheRead?: number; cacheWrite?: number }
  | { type: "error"; error: string };

const MAX_ITERATIONS = 12;

const ANTHROPIC_TOOLS: Anthropic.Tool[] = TOOL_SCHEMAS.map((t) => ({
  name: t.name,
  description: t.description,
  input_schema: {
    type: "object" as const,
    properties: t.parameters.properties as Record<string, { type: string; description: string }>,
    required: t.parameters.required,
  },
}));

export async function runAnthropic(opts: {
  apiKey: string;
  model: string;
  inputMessages: Anthropic.MessageParam[];
  persona: string;
  knowledge: string;
  isConnected: boolean;
  memory: string | null;
  firstName: string;
  userId: string;
  emit: (evt: SseEvent) => void;
}): Promise<void> {
  const client = new Anthropic({ apiKey: opts.apiKey });
  let isConnected = opts.isConnected;
  const ctx: ToolContext = {
    userId: opts.userId,
    isConnected,
    setConnected: (v) => { isConnected = v; ctx.isConnected = v; },
  };

  const systemBlocks: Anthropic.TextBlockParam[] = [
    {
      type: "text",
      text: buildSystemPrompt({
        persona: opts.persona,
        knowledge: opts.knowledge,
        isConnected,
        memory: opts.memory,
        firstName: opts.firstName,
      }),
      cache_control: { type: "ephemeral" },
    },
  ];

  const messages: Anthropic.MessageParam[] = [...opts.inputMessages];

  let totalTextEmitted = 0;
  let cacheRead = 0;
  let cacheWrite = 0;

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    // Add PDF beta header when document blocks are present in messages
    const hasPdf = messages.some(m =>
      Array.isArray(m.content) &&
      (m.content as { type: string }[]).some(b => b.type === "document")
    );

    const msgStream = client.messages.stream(
      { model: opts.model, max_tokens: 1024, system: systemBlocks, tools: ANTHROPIC_TOOLS, messages },
      hasPdf ? { headers: { "anthropic-beta": "pdfs-2024-09-25" } } : undefined,
    );

    for await (const event of msgStream) {
      if (
        event.type === "content_block_delta" &&
        event.delta.type === "text_delta" &&
        event.delta.text
      ) {
        totalTextEmitted += event.delta.text.length;
        opts.emit({ type: "text", text: event.delta.text });
      }
    }

    const finalMsg = await msgStream.finalMessage();
    messages.push({ role: "assistant", content: finalMsg.content });

    if (finalMsg.usage) {
      cacheRead += finalMsg.usage.cache_read_input_tokens ?? 0;
      cacheWrite += finalMsg.usage.cache_creation_input_tokens ?? 0;
    }

    if (finalMsg.stop_reason === "end_turn") {
      if (totalTextEmitted === 0) {
        opts.emit({ type: "text", text: fallbackText(isConnected, opts.firstName) });
      }
      opts.emit({ type: "done", messages, cacheRead, cacheWrite });
      return;
    }

    if (finalMsg.stop_reason === "max_tokens") {
      opts.emit({ type: "text", text: "\n\n_(Respons terpotong karena terlalu panjang. Tanya bagian spesifik untuk detail lebih lanjut.)_" });
      opts.emit({ type: "done", messages, cacheRead, cacheWrite });
      return;
    }

    if (finalMsg.stop_reason !== "tool_use") {
      if (totalTextEmitted === 0) {
        opts.emit({ type: "text", text: `Agent berhenti dengan alasan: ${finalMsg.stop_reason ?? "tidak diketahui"}.` });
      }
      opts.emit({ type: "done", messages, cacheRead, cacheWrite });
      return;
    }

    const toolResults: Anthropic.ToolResultBlockParam[] = [];
    for (const block of finalMsg.content) {
      if (block.type !== "tool_use") continue;
      const input = (block.input as Record<string, unknown>) ?? {};
      opts.emit({ type: "tool", label: TOOL_LABELS[block.name]?.(input) ?? block.name });
      const result = await executeTool(block.name, input, ctx);
      toolResults.push({ type: "tool_result", tool_use_id: block.id, content: result });
    }

    messages.push({ role: "user", content: toolResults });
  }

  opts.emit({ type: "text", text: "\n\n_(Agent mencapai batas iterasi. Coba lagi atau pecah pertanyaan jadi lebih kecil.)_" });
  opts.emit({ type: "done", messages, cacheRead, cacheWrite });
}
