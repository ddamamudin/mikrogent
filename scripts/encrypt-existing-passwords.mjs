// Stage B migration: encrypt semua row MikrotikCredential.sshPass yang masih plain.
// Idempotent — skip row yang sudah ber-prefix "enc:v1:". Aman dijalankan ulang.
//
// Cara jalan di server:
//   cd /var/www/mikroplay && node scripts/encrypt-existing-passwords.mjs
//
// Output: log per-row + ringkasan akhir.

import "dotenv/config";
import crypto from "crypto";
import pg from "pg";

const PREFIX = "enc:v1:";

function getKey() {
  const raw = process.env.SSH_ENCRYPTION_KEY;
  if (!raw) throw new Error("SSH_ENCRYPTION_KEY belum di-set di env");
  const key = Buffer.from(raw, "base64");
  if (key.length !== 32) throw new Error(`SSH_ENCRYPTION_KEY harus 32 byte (base64), sekarang ${key.length}`);
  return key;
}

function isEncrypted(v) {
  return typeof v === "string" && v.startsWith(PREFIX);
}

function encrypt(plain) {
  const key = getKey();
  const iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv("aes-256-gcm", key, iv);
  const enc = Buffer.concat([c.update(plain, "utf8"), c.final()]);
  return `${PREFIX}${iv.toString("base64")}:${enc.toString("base64")}:${c.getAuthTag().toString("base64")}`;
}

function decrypt(stored) {
  if (!isEncrypted(stored)) return stored;
  const [iv, ct, tag] = stored.slice(PREFIX.length).split(":");
  const d = crypto.createDecipheriv("aes-256-gcm", getKey(), Buffer.from(iv, "base64"));
  d.setAuthTag(Buffer.from(tag, "base64"));
  return Buffer.concat([d.update(Buffer.from(ct, "base64")), d.final()]).toString("utf8");
}

async function main() {
  console.log("=== Encrypt Existing sshPass — Stage B ===\n");

  // Sanity check: key bisa encrypt + decrypt roundtrip
  const test = encrypt("roundtrip-test-" + Date.now());
  if (decrypt(test).startsWith("roundtrip-test-")) {
    console.log("✓ Encryption key roundtrip OK\n");
  } else {
    throw new Error("Encryption key roundtrip GAGAL — abort");
  }

  const { Client } = pg;
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  try {
    const { rows } = await client.query(
      `SELECT id, name, host, "sshPass" FROM "MikrotikCredential" ORDER BY "createdAt" ASC`
    );
    console.log(`Total row di MikrotikCredential: ${rows.length}\n`);

    let encrypted = 0;
    let skipped = 0;
    let errors = 0;
    let i = 0;

    for (const row of rows) {
      i++;
      const tag = `[${i}/${rows.length}] ${row.name} (${row.host})`;
      if (isEncrypted(row.sshPass)) {
        console.log(`${tag} — sudah encrypted, skip`);
        skipped++;
        continue;
      }
      try {
        const ciphertext = encrypt(row.sshPass);
        await client.query(
          `UPDATE "MikrotikCredential" SET "sshPass" = $1 WHERE id = $2`,
          [ciphertext, row.id]
        );
        console.log(`${tag} — plain → encrypted ✓`);
        encrypted++;
      } catch (e) {
        console.error(`${tag} — ERROR: ${e.message ?? e}`);
        errors++;
      }
    }

    console.log("\n=== Ringkasan ===");
    console.log(`Total          : ${rows.length}`);
    console.log(`Encrypted (new): ${encrypted}`);
    console.log(`Skipped (sudah): ${skipped}`);
    console.log(`Errors         : ${errors}`);

    // Verify
    const { rows: after } = await client.query(
      `SELECT id, name, "sshPass" FROM "MikrotikCredential"`
    );
    const stillPlain = after.filter((r) => !isEncrypted(r.sshPass));
    if (stillPlain.length === 0) {
      console.log("\n✅ Semua row terenkripsi. Stage B selesai.");
    } else {
      console.log(`\n⚠️ Masih ada ${stillPlain.length} row plain:`);
      stillPlain.forEach((r) => console.log(`   - ${r.name} (id=${r.id})`));
    }

    process.exitCode = errors > 0 ? 1 : 0;
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  console.error("FATAL:", e);
  process.exit(1);
});
