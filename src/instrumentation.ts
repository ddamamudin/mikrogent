export function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const required = ["NEXTAUTH_SECRET", "DATABASE_URL", "RESEND_API_KEY"] as const;
  const missing = required.filter((k) => !process.env[k]);
  if (missing.length > 0) {
    throw new Error(`Env var wajib belum di-set: ${missing.join(", ")}`);
  }
}
