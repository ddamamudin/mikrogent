export const dynamic = "force-dynamic";
import { NextRequest } from "next/server";
import { withCredentialApi } from "@/lib/router-api-auth";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return withCredentialApi(id, async (api) => {
    const rows = await api.write("/system/scheduler/print");
    return {
      tasks: (rows as Array<Record<string, unknown>>).map((s) => ({
        id: String(s[".id"] ?? ""),
        name: String(s.name ?? ""),
        startTime: s["start-time"] ? String(s["start-time"]) : "",
        startDate: s["start-date"] ? String(s["start-date"]) : "",
        interval: s.interval ? String(s.interval) : "",
        onEvent: s["on-event"] ? String(s["on-event"]) : "",
        nextRun: s["next-run"] ? String(s["next-run"]) : "",
        runCount: s["run-count"] ? String(s["run-count"]) : "0",
        comment: s.comment ? String(s.comment) : "",
        disabled: s.disabled === "true",
      })),
    };
  });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const { name, startTime, startDate, interval, onEvent, comment } = body as Record<string, string>;
  if (!name) return new Response(JSON.stringify({ error: "Name wajib" }), { status: 400 });

  return withCredentialApi(id, async (api) => {
    const args: string[] = [`=name=${name}`];
    if (startTime) args.push(`=start-time=${startTime}`);
    if (startDate) args.push(`=start-date=${startDate}`);
    if (interval) args.push(`=interval=${interval}`);
    if (onEvent) args.push(`=on-event=${onEvent}`);
    if (comment) args.push(`=comment=${comment}`);
    await api.write("/system/scheduler/add", args);
    return { ok: true };
  });
}
