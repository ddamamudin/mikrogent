import crypto from "crypto";

// AES-256-GCM untuk enkripsi sshPass at-rest.
// Format ciphertext: "enc:v1:<iv_b64>:<cipher_b64>:<tag_b64>"
// Plain text (legacy data sebelum migrasi) di-passthrough oleh decryptSshPass.

const PREFIX = "enc:v1:";

function getKey(): Buffer {
  const raw = process.env.SSH_ENCRYPTION_KEY;
  if (!raw) {
    throw new Error("SSH_ENCRYPTION_KEY wajib di-set di environment");
  }
  const key = Buffer.from(raw, "base64");
  if (key.length !== 32) {
    throw new Error(`SSH_ENCRYPTION_KEY harus 32 byte (base64). Sekarang: ${key.length} byte`);
  }
  return key;
}

export function isEncrypted(value: string): boolean {
  return typeof value === "string" && value.startsWith(PREFIX);
}

export function encryptSshPass(plain: string): string {
  const key = getKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${PREFIX}${iv.toString("base64")}:${encrypted.toString("base64")}:${tag.toString("base64")}`;
}

export function decryptSshPass(stored: string): string {
  if (!isEncrypted(stored)) return stored;
  const body = stored.slice(PREFIX.length);
  const parts = body.split(":");
  if (parts.length !== 3) {
    throw new Error("Format ciphertext sshPass tidak valid");
  }
  const [ivB64, cipherB64, tagB64] = parts;
  const key = getKey();
  const iv = Buffer.from(ivB64, "base64");
  const ciphertext = Buffer.from(cipherB64, "base64");
  const tag = Buffer.from(tagB64, "base64");
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return decrypted.toString("utf8");
}
