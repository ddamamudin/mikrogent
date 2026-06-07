const FONNTE_API_URL = "https://api.fonnte.com/send";

export async function sendWhatsApp(phone: string, message: string): Promise<boolean> {
  const token = process.env.FONNTE_API_TOKEN;
  if (!token) {
    console.warn("[fonnte] FONNTE_API_TOKEN not set, skipping WA notification");
    return false;
  }

  try {
    const res = await fetch(FONNTE_API_URL, {
      method: "POST",
      headers: { Authorization: token },
      body: new URLSearchParams({ target: phone, message }),
    });
    const data = await res.json();
    if (data?.status) return true;
    console.error("[fonnte] API error:", data);
    return false;
  } catch (err) {
    console.error("[fonnte] send failed:", err instanceof Error ? err.message : String(err));
    return false;
  }
}

export async function notifyNewUser(opts: { name: string; email: string; brand?: string | null; noWa?: string | null }): Promise<void> {
  const targetPhone = process.env.FONNTE_TARGET_PHONE;
  if (!targetPhone) return;

  const lines = [
    "🎉 *Pengguna Baru di MikroGent!*",
    "",
    `👤 Nama: ${opts.name}`,
    `📧 Email: ${opts.email}`,
  ];
  if (opts.brand) lines.push(`🏷️ Brand: ${opts.brand}`);
  if (opts.noWa) lines.push(`📱 WA: ${opts.noWa}`);
  lines.push(`🕐 Waktu: ${new Date().toLocaleString("id-ID", { timeZone: "Asia/Jakarta" })} WIB`);
  lines.push("");
  lines.push("👉 Cek admin panel untuk validasi: https://mikrogent.com/admin/tenant");

  await sendWhatsApp(targetPhone, lines.join("\n"));
}
