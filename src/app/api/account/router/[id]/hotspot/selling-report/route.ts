export const dynamic = "force-dynamic";
import { NextRequest } from "next/server";
import { withCredentialApi } from "@/lib/router-api-auth";

// Report Selling — kompatibel format Mikhmon v3.
//
// Mikhmon nyimpen tiap transaksi voucher di /system/script (bukan tabel DB).
// Trigger-nya: profile on-login script jalanin `/system script add` saat user
// login pertama kali. Hasilnya entry baru di /system/script dengan:
// - name: `${date}-|-${time}-|-${user}-|-${price}-|-${address}-|-${mac}-|-${validity}-|-${profile}-|-${comment}`
// - owner: `${month}${year}` (mis. "may2026")
// - source: `${date}` (date saat user login)
// - comment: "mikhmon" (marker — filter ini buat ambil cuma entry tracking)
//
// Endpoint ini juga jadi sumber Report Mikhmon — sync 2 arah otomatis.
//
// Query params:
//   from=YYYY-MM-DD (filter tanggal mulai, optional)
//   to=YYYY-MM-DD   (filter tanggal akhir inklusif, optional)
//   profile=...      (filter nama profile, optional)
//   prefix=...       (filter prefix username, optional — sama kayak Mikhmon)

const MONTH_MAP: Record<string, number> = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
  jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
};

// Parse format RouterOS native: "may/14/2026" → Date.
// Fallback: kalau gak match, coba parse standar (ISO, dll.). Return null kalau gagal.
function parseRouterDate(s: string): Date | null {
  if (!s) return null;
  const m = s.toLowerCase().match(/^([a-z]{3})\/(\d{1,2})\/(\d{4})$/);
  if (m && MONTH_MAP[m[1]] !== undefined) {
    return new Date(Date.UTC(parseInt(m[3], 10), MONTH_MAP[m[1]], parseInt(m[2], 10)));
  }
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) {
    return new Date(Date.UTC(parseInt(iso[1], 10), parseInt(iso[2], 10) - 1, parseInt(iso[3], 10)));
  }
  return null;
}

function toIsoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sp = req.nextUrl.searchParams;
  const from = sp.get("from"); // YYYY-MM-DD
  const to = sp.get("to");     // YYYY-MM-DD
  const profile = sp.get("profile");
  const prefix = sp.get("prefix");

  return withCredentialApi(id, async (api) => {
    const rows = await api.write("/system/script/print", [`?comment=mikhmon`]);
    const fromDate = from ? new Date(from + "T00:00:00Z") : null;
    const toDate = to ? new Date(to + "T23:59:59Z") : null;

    type Entry = {
      id: string;
      rawDate: string;
      date: string | null;
      time: string;
      user: string;
      price: number;
      address: string;
      mac: string;
      validity: string;
      profile: string;
      comment: string;
    };

    const entries: Entry[] = [];
    let unparsable = 0;

    for (const r of rows as Array<Record<string, unknown>>) {
      const name = String(r.name ?? "");
      const parts = name.split("-|-");
      if (parts.length < 9) { unparsable++; continue; }

      const rawDate = parts[0] ?? "";
      const parsed = parseRouterDate(rawDate);
      const isoDate = parsed ? toIsoDate(parsed) : null;

      // Date range filter (skip kalau di luar)
      if (parsed) {
        if (fromDate && parsed < fromDate) continue;
        if (toDate && parsed > toDate) continue;
      }

      const user = parts[2] ?? "";
      if (prefix && !user.startsWith(prefix)) continue;
      if (profile && parts[7] !== profile) continue;

      entries.push({
        id: String(r[".id"] ?? ""),
        rawDate,
        date: isoDate,
        time: parts[1] ?? "",
        user,
        price: parseInt(parts[3] ?? "0", 10) || 0,
        address: parts[4] ?? "",
        mac: parts[5] ?? "",
        validity: parts[6] ?? "",
        profile: parts[7] ?? "",
        comment: parts[8] ?? "",
      });
    }

    // Aggregate
    const totalRevenue = entries.reduce((s, e) => s + e.price, 0);
    const count = entries.length;
    const avgPrice = count > 0 ? Math.round(totalRevenue / count) : 0;

    // Daily aggregate (key = ISO date kalau ke-parse, else rawDate)
    const dailyMap = new Map<string, { date: string; count: number; revenue: number }>();
    for (const e of entries) {
      const key = e.date ?? e.rawDate;
      const cur = dailyMap.get(key) ?? { date: key, count: 0, revenue: 0 };
      cur.count++;
      cur.revenue += e.price;
      dailyMap.set(key, cur);
    }
    const daily = Array.from(dailyMap.values()).sort((a, b) => a.date.localeCompare(b.date));

    // Per-profile aggregate
    const profileMap = new Map<string, { profile: string; count: number; revenue: number }>();
    for (const e of entries) {
      const cur = profileMap.get(e.profile) ?? { profile: e.profile, count: 0, revenue: 0 };
      cur.count++;
      cur.revenue += e.price;
      profileMap.set(e.profile, cur);
    }
    const byProfile = Array.from(profileMap.values()).sort((a, b) => b.revenue - a.revenue);

    // Newest first untuk display
    entries.sort((a, b) => {
      if (a.date && b.date) {
        const c = b.date.localeCompare(a.date);
        if (c !== 0) return c;
      }
      return b.time.localeCompare(a.time);
    });

    return {
      summary: { totalRevenue, count, avgPrice, unparsable },
      daily,
      byProfile,
      entries,
    };
  });
}

// DELETE: bersihin log lama. Mikhmon punya fitur ini juga ("Remove report").
// Body: { olderThan: "YYYY-MM-DD" } → hapus semua entry sebelum tanggal itu.
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const olderThan = String(body.olderThan ?? "");
  if (!olderThan.match(/^\d{4}-\d{2}-\d{2}$/)) {
    return new Response(JSON.stringify({ error: "olderThan harus format YYYY-MM-DD" }), { status: 400 });
  }
  const cutoff = new Date(olderThan + "T00:00:00Z");

  return withCredentialApi(id, async (api) => {
    const rows = await api.write("/system/script/print", [`?comment=mikhmon`]);
    const toDelete: string[] = [];
    for (const r of rows as Array<Record<string, unknown>>) {
      const name = String(r.name ?? "");
      const rawDate = name.split("-|-")[0] ?? "";
      const parsed = parseRouterDate(rawDate);
      if (parsed && parsed < cutoff) {
        toDelete.push(String(r[".id"] ?? ""));
      }
    }
    for (const sid of toDelete) {
      await api.write("/system/script/remove", [`=.id=${sid}`]).catch(() => {});
    }
    return { ok: true, deleted: toDelete.length };
  });
}
