import OpenAI from "openai";
import type Anthropic from "@anthropic-ai/sdk";
import { TOOL_SCHEMAS, TOOL_LABELS, executeTool, ToolContext } from "./tools";
import { buildSystemPrompt, fallbackText, type RouterInfo } from "./persona";
import type { SseEvent } from "./anthropic-runner";

const MAX_ITERATIONS = 12;

const OPENAI_TOOLS: OpenAI.Chat.ChatCompletionTool[] = TOOL_SCHEMAS.map((t) => ({
  type: "function",
  function: {
    name: t.name,
    description: t.description,
    parameters: t.parameters,
  },
}));

// Konversi messages format Anthropic (wire format) -> OpenAI
function toOpenAIMessages(
  systemPrompt: string,
  msgs: Anthropic.MessageParam[],
): OpenAI.Chat.ChatCompletionMessageParam[] {
  const out: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: "system", content: systemPrompt },
  ];

  for (const m of msgs) {
    if (typeof m.content === "string") {
      out.push({ role: m.role, content: m.content });
      continue;
    }

    if (m.role === "assistant") {
      let text = "";
      const tool_calls: OpenAI.Chat.ChatCompletionMessageToolCall[] = [];
      for (const b of m.content) {
        if (b.type === "text") text += b.text;
        else if (b.type === "tool_use") {
          tool_calls.push({
            id: b.id,
            type: "function",
            function: { name: b.name, arguments: JSON.stringify(b.input ?? {}) },
          });
        }
      }
      const msg: OpenAI.Chat.ChatCompletionAssistantMessageParam = {
        role: "assistant",
        content: text || null,
      };
      if (tool_calls.length) msg.tool_calls = tool_calls;
      out.push(msg);
    } else {
      // role === "user" dengan content array
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const blocks = m.content as any[];
      const hasImage = blocks.some((b) => b.type === "image");

      if (hasImage) {
        // Combine into one multimodal user message
        const parts: OpenAI.Chat.ChatCompletionContentPart[] = [];
        for (const b of blocks) {
          if (b.type === "text") {
            parts.push({ type: "text", text: b.text });
          } else if (b.type === "image" && b.source?.type === "base64") {
            parts.push({ type: "image_url", image_url: { url: `data:${b.source.media_type};base64,${b.source.data}` } });
          }
        }
        if (parts.length > 0) out.push({ role: "user", content: parts });
      } else {
        for (const b of blocks) {
          if (b.type === "tool_result") {
            const content =
              typeof b.content === "string"
                ? b.content
                : Array.isArray(b.content)
                  ? b.content.map((c: { type: string; text?: string }) => (c.type === "text" ? c.text : "")).join("")
                  : "";
            out.push({ role: "tool", tool_call_id: b.tool_use_id, content });
          } else if (b.type === "text") {
            out.push({ role: "user", content: b.text });
          }
        }
      }
    }
  }

  return out;
}

export async function runOpenAI(opts: {
  apiKey: string;
  model: string;
  inputMessages: Anthropic.MessageParam[];
  persona: string;
  knowledge: string;
  memory: string | null;
  firstName: string;
  userId: string;
  sessionId: string;
  routers: RouterInfo[];
  activeCredentialId: string | null;
  emit: (evt: SseEvent) => void;
}): Promise<void> {
  const client = new OpenAI({ apiKey: opts.apiKey });
  let activeCredentialId = opts.activeCredentialId;
  const ctx: ToolContext = {
    userId: opts.userId,
    sessionId: opts.sessionId,
    activeCredentialId,
    setActiveCredentialId: (id) => { activeCredentialId = id; ctx.activeCredentialId = id; },
  };

  const activeRouter = opts.activeCredentialId
    ? opts.routers.find((r) => r.id === opts.activeCredentialId) ?? null
    : null;

  const systemPrompt = buildSystemPrompt({
    persona: opts.persona,
    knowledge: opts.knowledge,
    memory: opts.memory,
    firstName: opts.firstName,
    routers: opts.routers,
    activeRouter,
  });

  // messages dalam wire format Anthropic - kita maintain di sini, convert ke OpenAI tiap iterasi
  const messages: Anthropic.MessageParam[] = [...opts.inputMessages];

  let totalTextEmitted = 0;

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    const openaiMessages = toOpenAIMessages(systemPrompt, messages);

    const stream = await client.chat.completions.create({
      model: opts.model,
      messages: openaiMessages,
      tools: OPENAI_TOOLS,
      stream: true,
    });

    let assistantText = "";
    const toolCallAcc = new Map<number, { id: string; name: string; args: string }>();
    let finishReason: string | null = null;

    for await (const chunk of stream) {
      const choice = chunk.choices[0];
      if (!choice) continue;
      const delta = choice.delta;

      if (delta?.content) {
        assistantText += delta.content;
        totalTextEmitted += delta.content.length;
        opts.emit({ type: "text", text: delta.content });
      }

      if (delta?.tool_calls) {
        for (const tc of delta.tool_calls) {
          const idx = tc.index;
          let entry = toolCallAcc.get(idx);
          if (!entry) {
            entry = { id: tc.id ?? "", name: tc.function?.name ?? "", args: "" };
            toolCallAcc.set(idx, entry);
          }
          if (tc.id) entry.id = tc.id;
          if (tc.function?.name) entry.name = tc.function.name;
          if (tc.function?.arguments) entry.args += tc.function.arguments;
        }
      }

      if (choice.finish_reason) finishReason = choice.finish_reason;
    }

    // Assemble assistant message dalam Anthropic wire format
    const assistantBlocks: Anthropic.ContentBlockParam[] = [];
    if (assistantText) assistantBlocks.push({ type: "text", text: assistantText });
    for (const tc of toolCallAcc.values()) {
      let parsedInput: unknown = {};
      try { parsedInput = tc.args ? JSON.parse(tc.args) : {}; } catch { parsedInput = {}; }
      assistantBlocks.push({
        type: "tool_use",
        id: tc.id,
        name: tc.name,
        input: parsedInput,
      });
    }
    messages.push({
      role: "assistant",
      content: assistantBlocks.length ? assistantBlocks : assistantText,
    });

    if (finishReason === "stop" || finishReason === null) {
      if (totalTextEmitted === 0) {
        opts.emit({ type: "text", text: fallbackText(opts.firstName) });
      }
      opts.emit({ type: "done", messages });
      return;
    }

    if (finishReason === "length") {
      opts.emit({ type: "text", text: "\n\n_(Respons terpotong karena terlalu panjang. Tanya bagian spesifik untuk detail lebih lanjut.)_" });
      opts.emit({ type: "done", messages });
      return;
    }

    if (finishReason !== "tool_calls") {
      if (totalTextEmitted === 0) {
        opts.emit({ type: "text", text: `Agent berhenti dengan alasan: ${finishReason}.` });
      }
      opts.emit({ type: "done", messages });
      return;
    }

    // finishReason === "tool_calls" - eksekusi semua tool, push hasil sebagai user message
    const toolResultBlocks: Anthropic.ContentBlockParam[] = [];
    for (const tc of toolCallAcc.values()) {
      let parsedInput: Record<string, unknown> = {};
      try {
        parsedInput = tc.args ? (JSON.parse(tc.args) as Record<string, unknown>) : {};
      } catch { parsedInput = {}; }
      opts.emit({ type: "tool", label: TOOL_LABELS[tc.name]?.(parsedInput) ?? tc.name });
      const result = await executeTool(tc.name, parsedInput, ctx);
      toolResultBlocks.push({
        type: "tool_result",
        tool_use_id: tc.id,
        content: result,
      });
    }
    messages.push({ role: "user", content: toolResultBlocks });
  }

  opts.emit({ type: "text", text: "\n\n_(Agent mencapai batas iterasi. Coba lagi atau pecah pertanyaan jadi lebih kecil.)_" });
  opts.emit({ type: "done", messages });
}
