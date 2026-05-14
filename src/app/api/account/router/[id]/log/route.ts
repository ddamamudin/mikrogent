export const dynamic = "force-dynamic";
import { NextRequest } from "next/server";
import { withCredentialApi } from "@/lib/router-api-auth";

// GET /api/account/router/[id]/log?topic=hotspot&search=&limit=300
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sp = req.nextUrl.searchParams;
  const topic = sp.get("topic") ?? "";
  const search = sp.get("search") ?? "";
  const limit = Math.min(parseInt(sp.get("limit") ?? "300", 10) || 300, 1000);

  return withCredentialApi(id, async (api) => {
    const rows = await api.write("/log/print");
    // RouterOS log default oldest-first; reverse jadi newest-first untuk display.
    const all = (rows as Array<Record<string, unknown>>).map((r) => ({
      id: String(r[".id"] ?? ""),
      time: String(r.time ?? ""),
      topics: String(r.topics ?? ""),
      message: String(r.message ?? ""),
    }));
    const filtered = all.filter((l) => {
      if (topic && !l.topics.toLowerCase().includes(topic.toLowerCase())) return false;
      if (search && !l.message.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
    const sliced = filtered.slice(-limit).reverse();
    return { entries: sliced, total: filtered.length, displayed: sliced.length };
  });
}
