import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendVerificationEmail(email: string, name: string, token: string) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://mikroplay.com";
  const verifyUrl = `${appUrl}/verify-email?token=${token}`;

  await resend.emails.send({
    from: "Mikroplay <noreply@mikroplay.com>",
    to: email,
    subject: "Konfirmasi Email Akun Mikroplay Anda",
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2 style="color: #2563eb;">Selamat datang di Mikroplay, ${name}!</h2>
        <p>Klik tombol di bawah untuk mengaktifkan akun Anda:</p>
        <a href="${verifyUrl}" style="display:inline-block;padding:12px 24px;background:#2563eb;color:#fff;border-radius:6px;text-decoration:none;font-weight:bold;">
          Konfirmasi Email
        </a>
        <p style="color:#888;font-size:12px;margin-top:24px;">Link berlaku 24 jam. Abaikan email ini jika Anda tidak mendaftar.</p>
      </div>
    `,
  });
}
