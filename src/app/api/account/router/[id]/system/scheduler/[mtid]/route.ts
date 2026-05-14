export const dynamic = "force-dynamic";
import { NextRequest } from "next/server";
import { withCredentialApi } from "@/lib/router-api-auth";

type Ctx = { params: Promise<{ id: string; mtid: string }> };

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const { id, mtid } = await params;
  const decoded = decodeURIComponent(mtid);
  const body = await req.json().catch(() => ({}));
  const action = String(body.action ?? "set");
  const fields = (body.fields ?? {}) as Record<string, string>;

  return withCredentialApi(id, async (api) => {
    if (action === "enable") {
      await api.write("/system/scheduler/enable", [`=.id=${decoded}`]);
      return { ok: true };
    }
    if (action === "disable") {
      await api.write("/system/scheduler/disable", [`=.id=${decoded}`]);
      return { ok: true };
    }
    const args: string[] = [`=.id=${decoded}`];
    if (fields.name !== undefined) args.push(`=name=${fields.name}`);
    if (fields.startTime !== undefined) args.push(`=start-time=${fields.startTime || "startup"}`);
    if (fields.startDate !== undefined) args.push(`=start-date=${fields.startDate ?? ""}`);
    if (fields.interval !== undefined) args.push(`=interval=${fields.interval ?? "0"}`);
    if (fields.onEvent !== undefined) args.push(`=on-event=${fields.onEvent ?? ""}`);
    if (fields.comment !== undefined) args.push(`=comment=${fields.comment ?? ""}`);
    if (args.length === 1) return { ok: true, noop: true };
    await api.write("/system/scheduler/set", args);
    return { ok: true };
  });
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const { id, mtid } = await params;
  const decoded = decodeURIComponent(mtid);
  return withCredentialApi(id, async (api) => {
    await api.write("/system/scheduler/remove", [`=.id=${decoded}`]);
    return { ok: true };
  });
}
