export const dynamic = "force-dynamic";
import { NextRequest } from "next/server";
import { withCredentialApi } from "@/lib/router-api-auth";

// Char pool ala mikhmon — hilangkan ambigu (l/L/o/O/0/1)
const LC = "abcdefghijkmnpqrstuvwxyz";
const UC = "ABCDEFGHIJKMNPQRSTUVWXYZ";
const NUM = "23456789";

function pickN(pool: string, n: number): string {
  let out = "";
  for (let i = 0; i < n; i++) out += pool[Math.floor(Math.random() * pool.length)];
  return out;
}

function randByMode(mode: string, len: number): string {
  if (mode === "lower") return pickN(LC, len);
  if (mode === "upper") return pickN(UC, len);
  if (mode === "upplow") return pickN(LC + UC, len);
  if (mode === "num") return pickN(NUM, len);
  if (mode === "mix") return pickN(NUM + LC, len);
  if (mode === "mix1") return pickN(NUM + UC, len);
  if (mode === "mix2") return pickN(NUM + LC + UC, len);
  return pickN(LC, len);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const qty = Math.min(500, Math.max(1, parseInt(String(body.qty ?? 1), 10) || 1));
  const userMode: "up" | "vc" = body.userMode === "vc" ? "vc" : "up"; // up=user+pass beda, vc=user==pass
  const userLen = Math.min(10, Math.max(3, parseInt(String(body.userLen ?? 4), 10) || 4));
  const charMode = String(body.charMode ?? "lower");
  const prefix = String(body.prefix ?? "");
  const profile = String(body.profile ?? "default");
  const server = String(body.server ?? "all");
  const timeLimit = String(body.timeLimit ?? "");
  const dataLimit = String(body.dataLimit ?? "");
  const adComment = String(body.comment ?? "");
  if (!profile) return new Response(JSON.stringify({ error: "Profile wajib" }), { status: 400 });

  return withCredentialApi(id, async (api) => {
    // Build comment seragam buat semua voucher di batch ini, jadi gampang
    // filter / hapus expired by comment.
    const batchCode = Math.floor(100 + Math.random() * 900);
    const today = new Date();
    const dateTag = `${String(today.getMonth() + 1).padStart(2, "0")}.${String(today.getDate()).padStart(2, "0")}.${String(today.getFullYear()).slice(-2)}`;
    const baseComment = `${userMode}-${batchCode}-${dateTag}${adComment ? "-" + adComment : ""}`;

    const created: Array<{ user: string; password: string }> = [];
    const errors: string[] = [];

    for (let i = 0; i < qty; i++) {
      const u = userMode === "up"
        ? prefix + randByMode(charMode, userLen)
        : prefix + randByMode(charMode, userLen);
      const p = userMode === "up"
        ? pickN(NUM, userLen)
        : u; // voucher-style: password = username
      try {
        const args: string[] = [
          `=name=${u}`,
          `=password=${p}`,
          `=profile=${profile}`,
          `=comment=${baseComment}`,
        ];
        if (server && server !== "all") args.push(`=server=${server}`);
        if (timeLimit) args.push(`=limit-uptime=${timeLimit}`);
        if (dataLimit) args.push(`=limit-bytes-total=${dataLimit}`);
        await api.write("/ip/hotspot/user/add", args);
        created.push({ user: u, password: p });
      } catch (e) {
        errors.push(`${u}: ${e instanceof Error ? e.message : String(e)}`);
      }
    }

    return { ok: true, created, errors, batchComment: baseComment };
  });
}
