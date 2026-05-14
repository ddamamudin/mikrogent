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

  // Fast path: kalau API udah reachable di port yang ke-save di DB, flip flag aja
  const initialTest = await testApi({ host: row.host, apiPort: row.apiPort, username: row.sshUser, password });
  if (initialTest.ok) {
    return { tag, status: "already-on", identity: initialTest.identity, port: row.apiPort };
  }

  // Query state + port aktual via SSH (pakai :put — output 1 baris bersih)
  let disabledStr;
  let portStr;
  try {
    disabledStr = (await execSsh(sshCfg, ":put [/ip service get [find name=api] disabled]")).trim();
    portStr = (await execSsh(sshCfg, ":put [/ip service get [find name=api] port]")).trim();
  } catch (e) {
    return { tag, status: "ssh-fail", error: e.message ?? String(e) };
  }

  const isDisabled = disabledStr === "true";
  const actualPort = parseInt(portStr, 10) || 8728;

  const restrictIp = process.env.MIKROPLAY_SERVER_IP?.trim();
  const restrictCidr = restrictIp ? `${restrictIp}/32` : "";

  const cmds = [];
  if (isDisabled) cmds.push("/ip service set [find name=api] disabled=no");
  if (restrictCidr) cmds.push(`/ip service set [find name=api] address=${restrictCidr}`);

  for (const cmd of cmds) {
    try {
      await execSsh(sshCfg, cmd);
    } catch (e) {
      return { tag, status: "ssh-fail", error: `cmd "${cmd}": ${e.message ?? String(e)}`, port: actualPort };
    }
  }

  // Verify via API pakai port aktual
  const finalTest = await testApi({ host: row.host, apiPort: actualPort, username: row.sshUser, password });
  if (!finalTest.ok) {
    return { tag, status: "api-unreachable", error: finalTest.error || "(timeout)", port: actualPort };
  }
  return { tag, status: "enabled", identity: finalTest.identity, port: actualPort };
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
        await db.query(
          `UPDATE "MikrotikCredential" SET "apiEnabled" = true, "apiPort" = $2 WHERE id = $1`,
          [row.id, res.port],
        );
        const portNote = res.port !== row.apiPort ? ` [port diubah ${row.apiPort}→${res.port}]` : "";
        console.log(`${prefix} ${res.tag} — ${res.status} ✓ (identity: ${res.identity ?? "?"}, port: ${res.port})${portNote}`);
        if (res.status === "enabled") counts.enabled++;
        else counts.alreadyOn++;
      } else if (res.status === "ssh-fail") {
        console.log(`${prefix} ${res.tag} — SSH gagal: ${res.error}`);
        counts.sshFail++;
      } else if (res.status === "api-unreachable") {
        // Tetep update apiPort biar gak hardcode 8728 di DB
        if (res.port) {
          await db.query(`UPDATE "MikrotikCredential" SET "apiPort" = $2 WHERE id = $1`, [row.id, res.port]);
        }
        const portNote = res.port && res.port !== row.apiPort ? ` [port di router: ${res.port}, di-save ke DB]` : "";
        console.log(`${prefix} ${res.tag} — API gak reachable di port ${res.port ?? row.apiPort}: ${res.error}${portNote}`);
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
