export const dynamic = "force-dynamic";
import { NextRequest } from "next/server";
import { withCredentialApi } from "@/lib/router-api-auth";

// Format on-login script ala mikhmon supaya metadata (validity/price/lock)
// bisa di-decode pas generate voucher. Field di-comma-separated.
// expmode: "rem" hapus, "ntf" notify (limit-uptime=1s), "0" no expire
function buildOnLogin(opts: { expmode: string; validity: string; price: number; sprice: number; lockUser: boolean }): string {
  const lock = opts.lockUser
    ? '; [:local mac $"mac-address"; /ip hotspot user set mac-address=$mac [find where name=$user]]'
    : "";
  // Format yang dibaca mikhmon/voucher generator: ",expmode,price,validity,sprice,,lockflag,"
  const meta = `,${opts.expmode},${opts.price},${opts.validity},${opts.sprice},,${opts.lockUser ? "Enable" : ""},`;
  // Hanya simpan meta saja kalau expmode="0" (no expire). Kalau ada expire,
  // di mikhmon ada script kompleks bikin scheduler — kita simplifikasi: just
  // pakai limit-uptime di user level (gak pakai scheduler), atau biarin
  // RouterOS handle expired via limit-uptime kalau di-set di voucher.
  return `:put ("${meta}")${lock};`;
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
