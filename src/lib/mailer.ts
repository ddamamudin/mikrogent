import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = "MikroGent <noreply@mikrogent.com>";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://mikrogent.com";

export async function sendVerificationEmail(email: string, name: string, token: string) {
  const url = `${APP_URL}/verifikasi-email?token=${token}`;
  await resend.emails.send({
    from: FROM,
    to: email,
    subject: "Konfirmasi Email Akun MikroGent Anda",
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;">
        <h2 style="color:#2563eb;">Selamat datang di MikroGent, ${name}!</h2>
        <p>Klik tombol di bawah untuk mengaktifkan akun Anda:</p>
        <a href="${url}" style="display:inline-block;padding:12px 24px;background:#2563eb;color:#fff;border-radius:6px;text-decoration:none;font-weight:bold;">
          Konfirmasi Email
        </a>
        <p style="color:#888;font-size:12px;margin-top:24px;">Link berlaku 24 jam. Abaikan jika Anda tidak mendaftar.</p>
      </div>
    `,
  });
}

export async function sendPasswordResetEmail(email: string, name: string, token: string) {
  const url = `${APP_URL}/atur-ulang-password?token=${token}`;
  await resend.emails.send({
    from: FROM,
    to: email,
    subject: "Reset Password Akun MikroGent Anda",
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;">
        <h2 style="color:#2563eb;">Reset Password</h2>
        <p>Halo ${name}, kami menerima permintaan reset password untuk akun Anda.</p>
        <a href="${url}" style="display:inline-block;padding:12px 24px;background:#2563eb;color:#fff;border-radius:6px;text-decoration:none;font-weight:bold;">
          Reset Password
        </a>
        <p style="color:#888;font-size:12px;margin-top:24px;">Link berlaku 1 jam. Abaikan jika Anda tidak meminta reset password.</p>
      </div>
    `,
  });
}
