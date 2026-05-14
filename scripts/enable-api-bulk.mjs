// Bulk enable RouterOS API service di semua MikrotikCredential.
// Idempotent: skip router yang apiEnabled=true di DB, atau yang API-nya udah
// reachable dari Mikroplay (auto-flip flag-nya tanpa SSH command).
//
// Cara jalan di server LXC CT100:
//   cd /var/www/mikroplay && node scripts/enable-api-bulk.mjs
//
// Flow per-router:
//   1. SSH login pakai kred existing
//   2. /ip service print where name=api → cek state
//   3. Kalau disabled → /ip service set [find name=api] disabled=no
//   4. Kalau env MIKROPLAY_SERVER_IP di-set → /ip service set address=<ip>/32
//   5. Test connect via RouterOS API (port apiPort) → ambil /system/identity
//   6. Update DB apiEnabled=true kalau sukses
//
// Output: log per-row + ringkasan akhir.

import "dotenv/config";
import crypto from "crypto";
import pg from "pg";
import { Client as SshClient } from "ssh2";
import { RouterOSAPI } from "node-routeros";

const PREFIX = "enc:v1:";

function getKey() {
  const raw = process.env.SSH_ENCRYPTION_KEY;
  if (!raw) throw new Error("SSH_ENCRYPTION_KEY belum di-set di env");
  const key = Buffer.from(raw, "base64");
  if (key.length !== 32) throw new Error(`SSH_ENCRYPTION_KEY harus 32 byte, sekarang ${key.length}`);
  return key;
}

function isEncrypted(v) {
  return typeof v === "string" && v.startsWith(PREFIX);
}

function decrypt(stored) {
  if (!isEncrypted(stored)) return stored;
  const [iv, ct, tag] = stored.slice(PREFIX.length).split(":");
  const d = crypto.createDecipheriv("aes-256-gcm", getKey(), Buffer.from(iv, "base64"));
  d.setAuthTag(Buffer.from(tag, "base64"));
  return Buffer.concat([d.update(Buffer.from(ct, "base64")), d.final()]).toString("utf8");
}

function execSsh(cfg, command) {
  return new Promise((resolve, reject) => {
    const conn = new SshClient();
    const timeout = setTimeout(() => {
      conn.end();
      reject(new Error("SSH timeout (10s)"));
    }, 10000);

    conn.on("ready", () => {
      conn.exec(command, (err, stream) => {
        if (err) { clearTimeout(timeout); conn.end(); reject(err); return; }
        let out = "";
        let errOut = "";
        stream.on("data", (d) => { out += d.toString(); });
        stream.stderr.on("data", (d) => { errOut += d.toString(); });
        stream.on("close", () => {
          clearTimeout(timeout);
          conn.end();
          resolve(out || errOut || "");
        });
      });
    });
    conn.on("error", (e) => { clearTimeout(timeout); reject(e); });
    conn.connect({
      host: cfg.host,
      port: cfg.port,
      username: cfg.username,
      password: cfg.password,
      readyTimeout: 10000,
      algorithms: {
        kex: [
          "diffie-hellman-group14-sha256",
          "diffie-hellman-group14-sha1",
          "diffie-hellman-group1-sha1",
        ],
      },
    });
  });
}

async function testApi(cfg) {
  const api = new RouterOSAPI({
    host: cfg.host,
    user: cfg.username,
    password: cfg.password,
    port: cfg.apiPort,
    timeout: 8,
    keepalive: false,
  });
  try {
    await api.connect();
    const rows = await api.write("/system/identity/print");
    return { ok: true, identity: rows?.[0]?.name };
  } catch (e) {
    return { ok: false, error: e.message ?? String(e) };
  } finally {
    try { api.close(); } catch {}
  }
}

async function processOne(row) {
  const tag = `${row.name} (${row.host}:${row.port})`;
  const password = decrypt(row.sshPass);
  const sshCfg = { host: row.host, port: row.port, username: row.sshUser, password };
  const apiCfg = { host: row.host, apiPort: row.apiPort, username: row.sshUser, password };

  // Fast path: kalau API udah reachable, flip flag aja
  const initialTest = await testApi(apiCfg);
  if (initialTest.ok) {
    return { tag, status: "already-on", identity: initialTest.identity };
  }

  // Cek state via SSH
  let printOut;
  try {
    printOut = await execSsh(sshCfg, "/ip service print where name=api");
  } catch (e) {
    return { tag, status: "ssh-fail", error: e.message ?? String(e) };
  }

  const apiLine = printOut.split(/\r?\n/).find((l) => /\bapi\b/.test(l) && !/api-ssl/.test(l)) ?? "";
  const isDisabled = /^\s*\d+\s+[A-Z]*X/.test(apiLine);

  const restrictIp = process.env.MIKROPLAY_SERVER_IP?.trim();
  const restrictCidr = restrictIp ? `${restrictIp}/32` : "";

  const cmds = [];
  if (isDisabled) cmds.push("/ip service set [find name=api] disabled=no");
  if (restrictCidr) cmds.push(`/ip service set [find name=api] address=${restrictCidr}`);

  for (const cmd of cmds) {
    try {
      await execSsh(sshCfg, cmd);
    } catch (e) {
      return { tag, status: "ssh-fail", error: `cmd "${cmd}": ${e.message ?? String(e)}` };
    }
  }

  // Verify via API
  const finalTest = await testApi(apiCfg);
  if (!finalTest.ok) {
    return { tag, status: "api-unreachable", error: finalTest.error };
  }
  return { tag, status: "enabled", identity: finalTest.identity };
}

async function main() {
  console.log("=== Bulk Enable RouterOS API ===\n");

  const { Client: PgClient } = pg;
  const db = new PgClient({ connectionString: process.env.DATABASE_URL });
  await db.connect();

  try {
    const { rows } = await db.query(
      `SELECT id, name, host, port, "sshUser", "sshPass", "apiPort", "apiEnabled"
       FROM "MikrotikCredential"
       ORDER BY "createdAt" ASC`,
    );
    console.log(`Total router: ${rows.length}\n`);

    const counts = { enabled: 0, alreadyOn: 0, sshFail: 0, apiUnreachable: 0 };
    let i = 0;

    for (const row of rows) {
      i++;
      const prefix = `[${i}/${rows.length}]`;
      if (row.apiEnabled) {
        console.log(`${prefix} ${row.name} (${row.host}) — flag apiEnabled=true di DB, skip`);
        counts.alreadyOn++;
        continue;
      }
      const res = await processOne(row);
      if (res.status === "enabled" || res.status === "already-on") {
        await db.query(`UPDATE "MikrotikCredential" SET "apiEnabled" = true WHERE id = $1`, [row.id]);
        console.log(`${prefix} ${res.tag} — ${res.status} ✓ (identity: ${res.identity ?? "?"})`);
        if (res.status === "enabled") counts.enabled++;
        else counts.alreadyOn++;
      } else if (res.status === "ssh-fail") {
        console.log(`${prefix} ${res.tag} — SSH gagal: ${res.error}`);
        counts.sshFail++;
      } else if (res.status === "api-unreachable") {
        console.log(`${prefix} ${res.tag} — API tetep gak reachable: ${res.error}`);
        counts.apiUnreachable++;
      }
    }

    console.log("\n=== Ringkasan ===");
    console.log(`Total                  : ${rows.length}`);
    console.log(`Enabled (baru)         : ${counts.enabled}`);
    console.log(`Already on / flag flip : ${counts.alreadyOn}`);
    console.log(`SSH gagal              : ${counts.sshFail}`);
    console.log(`API gak reachable      : ${counts.apiUnreachable}`);

    const failed = counts.sshFail + counts.apiUnreachable;
    if (failed > 0) {
      console.log(`\n⚠️  ${failed} router gagal. Cek log di atas — user bisa retry manual lewat tombol "Aktifkan API" di /dashboard/router.`);
      process.exitCode = 1;
    } else {
      console.log("\n✅ Selesai. Semua router siap konek via RouterOS API.");
    }
  } finally {
    await db.end();
  }
}

main().catch((e) => {
  console.error("FATAL:", e);
  process.exit(1);
});
