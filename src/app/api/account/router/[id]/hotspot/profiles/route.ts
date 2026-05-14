export const dynamic = "force-dynamic";
import { NextRequest } from "next/server";
import { withCredentialApi } from "@/lib/router-api-auth";

// Format on-login script kompatibel dengan Mikhmon v3:
// - Meta `,{expmode},{price},{validity},{sprice},,{lockflag},` bisa di-decode kembali
// - Untuk expmode "remc"/"ntfc": inject block `$record` Mikhmon yang nge-log
//   transaksi ke /system/script ?comment=mikhmon. Inilah yang dibaca Mikhmon
//   selling.php DAN Mikroplay Report Selling — supaya sync 2 arah.
// expmode: "0" no expire | "rem" hapus | "ntf" notify | "remc" hapus+track | "ntfc" notify+track
//
// CATATAN: kita SENGAJA gak adopt expiry mechanism full Mikhmon (temporary
// scheduler + bg-service per profile) supaya gak nge-spam scheduler RouterOS.
// Expiry tetap kerja via limit-uptime (di-set per user saat generate voucher).
// Konsekuensi: Mikhmon UI saat lihat profile bikinan Mikroplay mungkin gak
// tampilin "expiry date" di comment user — tapi revenue tracking tetep jalan.
export function buildOnLogin(opts: {
  expmode: string;
  validity: string;
  price: number;
  sprice: number;
  lockUser: boolean;
  profileName: string;
}): string {
  const lockBlock = opts.lockUser
    ? '; [:local mac $"mac-address"; /ip hotspot user set mac-address=$mac [find where name=$user]]'
    : "";
  const lockFlag = opts.lockUser ? "Enable" : "";

  // Meta format Mikhmon-compatible. Lockflag = "Enable" / "" / "noexp" (untuk expmode 0).
  // Mikhmon: expmode 0 → `,,${price},,,noexp,${lock},` ; lainnya → `,${expmode},${price},${validity},${sprice},,${lock},`
  const meta = opts.expmode === "0"
    ? `,,${opts.price},,,noexp,${lockFlag},`
    : `,${opts.expmode},${opts.price},${opts.validity},${opts.sprice},,${lockFlag},`;

  // Record block: trigger saat user login pertama kali. RouterOS jalanin script
  // ini → bikin entry baru di /system/script dengan name format `-|-` separator.
  // Variable RouterOS literal ($date, $time, $user, $address, $mac, $comment, $month, $year)
  // di-resolve runtime. Variable JS (price, validity, profileName) di-hardcode sekarang.
  const trackRevenue = opts.expmode === "remc" || opts.expmode === "ntfc";
  const recordBlock = trackRevenue
    ? `; :local mac $"mac-address"; :local time [/system clock get time ]; /system script add name="$date-|-$time-|-$user-|-${opts.price}-|-$address-|-$mac-|-${opts.validity}-|-${opts.profileName}-|-$comment" owner="$month$year" source="$date" comment="mikhmon"`
    : "";

  return `:put ("${meta}")${recordBlock}${lockBlock};`;
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return withCredentialApi(id, async (api) => {
    const rows = await api.write("/ip/hotspot/user/profile/print");
    const pools = await api.write("/ip/pool/print").catch(() => []);
    return {
      profiles: (rows as Array<Record<string, unknown>>).map((p) => {
        const onLogin = String(p["on-login"] ?? "");
        // Coba decode meta dari onLogin
        const m = onLogin.match(/"(,[^"]*,)"/);
        let expmode = "0", price = "0", validity = "", sprice = "0", lockUser = false;
        if (m) {
          const parts = m[1].split(",");
          expmode = parts[1] ?? "0";
          price = parts[2] ?? "0";
          validity = parts[3] ?? "";
          sprice = parts[4] ?? "0";
          lockUser = (parts[6] ?? "") === "Enable";
        }
        return {
          id: String(p[".id"] ?? ""),
          name: String(p.name ?? ""),
          sharedUsers: String(p["shared-users"] ?? "1"),
          rateLimit: p["rate-limit"] ? String(p["rate-limit"]) : "",
          addressPool: p["address-pool"] ? String(p["address-pool"]) : "",
          parentQueue: p["parent-queue"] ? String(p["parent-queue"]) : "",
          expmode, price, validity, sprice, lockUser,
        };
      }),
      pools: (pools as Array<Record<string, unknown>>).map((p) => String(p.name ?? "")),
    };
  });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const { name, sharedUsers, rateLimit, addressPool, parentQueue, expmode, validity, price, sprice, lockUser } = body as Record<string, string | number | boolean>;
  if (!name) return new Response(JSON.stringify({ error: "Name wajib" }), { status: 400 });

  return withCredentialApi(id, async (api) => {
    const onLogin = buildOnLogin({
      expmode: String(expmode ?? "0"),
      validity: String(validity ?? ""),
      price: Number(price ?? 0),
      sprice: Number(sprice ?? 0),
      lockUser: !!lockUser,
      profileName: String(name),
    });
    const args: string[] = [
      `=name=${name}`,
      `=shared-users=${sharedUsers ?? 1}`,
      `=on-login=${onLogin}`,
    ];
    if (rateLimit) args.push(`=rate-limit=${rateLimit}`);
    if (addressPool) args.push(`=address-pool=${addressPool}`);
    if (parentQueue && parentQueue !== "none") args.push(`=parent-queue=${parentQueue}`);
    await api.write("/ip/hotspot/user/profile/add", args);
    return { ok: true };
  });
}
