export function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const required = ["NEXTAUTH_SECRET", "DATABASE_URL", "RESEND_API_KEY", "SSH_ENCRYPTION_KEY"] as const;
  const missing = required.filter((k) => !process.env[k]);
  if (missing.length > 0) {
    throw new Error(`Env var wajib belum di-set: ${missing.join(", ")}`);
  }

  const sshKey = Buffer.from(process.env.SSH_ENCRYPTION_KEY!, "base64");
  if (sshKey.length !== 32) {
    throw new Error(`SSH_ENCRYPTION_KEY harus 32 byte (base64). Sekarang: ${sshKey.length} byte`);
  }
}
