import { Client } from 'ssh2';
import { createConnection } from 'net';
import { RouterOSAPI } from 'node-routeros';

// Quick TCP port check (mirip mikhmon fsockopen).
// Cuma cek apakah port terbuka & host reachable, gak verify auth.
// Cepat: 1-3 detik biasanya.
export function pingMikrotikPort(host: string, port = 22, timeoutMs = 5000): Promise<{ ok: boolean; latencyMs?: number; error?: string }> {
  return new Promise((resolve) => {
    const start = Date.now();
    let done = false;
    const sock = createConnection({ host, port });
    const finish = (result: { ok: boolean; latencyMs?: number; error?: string }) => {
      if (done) return;
      done = true;
      try { sock.destroy(); } catch {}
      resolve(result);
    };
    sock.setTimeout(timeoutMs);
    sock.on('connect', () => finish({ ok: true, latencyMs: Date.now() - start }));
    sock.on('timeout', () => finish({ ok: false, error: `Timeout setelah ${timeoutMs}ms (port mungkin tertutup atau host gak reachable)` }));
    sock.on('error', (e) => finish({ ok: false, error: e.message }));
  });
}

export interface MikrotikConfig {
  host: string;
  port?: number;
  username: string;
  password: string;
}

export function executeMikrotikCommand(command: string, config: MikrotikConfig): Promise<string> {
  return new Promise((resolve, reject) => {
    const conn = new Client();

    const timeout = setTimeout(() => {
      conn.end();
      reject(new Error('Connection timeout (10s)'));
    }, 10000);

    conn.on('ready', () => {
      conn.exec(command, (err, stream) => {
        if (err) { clearTimeout(timeout); conn.end(); reject(err); return; }
        let output = '';
        let errOutput = '';
        stream.on('data', (data: Buffer) => { output += data.toString(); });
        stream.stderr.on('data', (data: Buffer) => { errOutput += data.toString(); });
        stream.on('close', () => {
          clearTimeout(timeout);
          conn.end();
          resolve(output || errOutput || '(no output)');
        });
      });
    });

    conn.on('error', (err) => { clearTimeout(timeout); reject(err); });

    conn.connect({
      host: config.host,
      port: config.port ?? 22,
      username: config.username,
      password: config.password,
      readyTimeout: 10000,
      algorithms: {
        kex: [
          'diffie-hellman-group14-sha256',
          'diffie-hellman-group14-sha1',
          'diffie-hellman-group1-sha1',
        ],
      },
    });
  });
}

// Scan konfigurasi MikroTik untuk dipakai sebagai context awal agent.
// Setiap perintah di-cap supaya total memory gak meledak walaupun router
// punya ribuan entries. Agent bisa fetch detail spesifik on-demand via
// execute_mikrotik_command (yang juga sudah di-cap 8KB).
//
// Strategi:
// - Perintah ringan & critical: dump full output, cap 4KB
// - Perintah yang berpotensi besar (firewall/queue/secret): count-only saja
// - Total memory di-cap di akhir sebagai safety net (~80KB max)
const PER_COMMAND_CAP = 4000;
const TOTAL_MEMORY_CAP = 80000;

type ScanCommand = { cmd: string; label?: string };

const SCAN_COMMANDS: ScanCommand[] = [
  // Identity & resource - kecil, penting
  { cmd: '/system identity print' },
  { cmd: '/system resource print' },
  { cmd: '/system routerboard print' },

  // Network basics - biasanya kecil
  { cmd: '/interface print detail' },
  { cmd: '/ip address print' },
  { cmd: '/ip dns print' },
  { cmd: '/ip route print terse' },

  // Berpotensi besar - count saja, detail on-demand
  { cmd: '/ip firewall filter print count-only', label: '/ip firewall filter count' },
  { cmd: '/ip firewall nat print count-only', label: '/ip firewall nat count' },
  { cmd: '/ip firewall mangle print count-only', label: '/ip firewall mangle count' },
  { cmd: '/queue simple print count-only', label: '/queue simple count' },
  { cmd: '/queue tree print count-only', label: '/queue tree count' },
  { cmd: '/ppp secret print count-only', label: '/ppp secret count' },

  // Hotspot/DHCP/PPP profile - biasanya kecil
  { cmd: '/ip hotspot print' },
  { cmd: '/ip hotspot profile print' },
  { cmd: '/ip pool print' },
  { cmd: '/ip dhcp-server print' },
  { cmd: '/ip dhcp-server network print' },
  { cmd: '/ppp profile print' },

  // Sistem
  { cmd: '/system user print' },
  { cmd: '/ip service print' },
];

function capOutput(text: string, cap: number, hint: string): string {
  if (text.length <= cap) return text;
  return text.slice(0, cap) +
    `\n\n[Output dipotong: ${text.length} → ${cap} karakter. ${hint}]`;
}

export async function scanMikrotikConfig(config: MikrotikConfig): Promise<string> {
  const results = await Promise.all(
    SCAN_COMMANDS.map(async ({ cmd, label }) => {
      const header = `=== ${label ?? cmd} ===`;
      try {
        const raw = await executeMikrotikCommand(cmd, config);
        const capped = capOutput(raw, PER_COMMAND_CAP, "Gunakan execute_mikrotik_command dengan filter spesifik (where, ?status=..., dll) untuk detail.");
        return `${header}\n${capped}`;
      } catch {
        return `${header}\n(error atau tidak tersedia)`;
      }
    })
  );

  const joined = results.join('\n\n');
  if (joined.length <= TOTAL_MEMORY_CAP) return joined;

  return joined.slice(0, TOTAL_MEMORY_CAP) +
    `\n\n[Snapshot total dipotong di ${TOTAL_MEMORY_CAP} karakter. ` +
    `Sisanya bisa di-query ad-hoc via execute_mikrotik_command.]`;
}

// =====================================================================
// RouterOS API helpers (port 8728 default)
// =====================================================================

export interface RouterosApiConfig {
  host: string;
  apiPort?: number;
  username: string;
  password: string;
  timeoutMs?: number;
}

// Open koneksi RouterOS API. Caller WAJIB panggil .close() (atau pakai
// withRouterosApi yang udah handle close otomatis di finally).
export async function connectRouterosApi(cfg: RouterosApiConfig): Promise<RouterOSAPI> {
  const api = new RouterOSAPI({
    host: cfg.host,
    user: cfg.username,
    password: cfg.password,
    port: cfg.apiPort ?? 8728,
    timeout: Math.ceil((cfg.timeoutMs ?? 8000) / 1000),
    keepalive: false,
  });
  await api.connect();
  return api;
}

// Helper buat operasi sekali pakai: connect → run → close otomatis.
// Aman dari leak koneksi kalau run throw exception.
//
// CATATAN: close() di node-routeros bisa hang kalau pending write masih
// in-flight (socket gak ke-ack quit). Kita defer close ke next tick via
// setImmediate supaya gak nge-block event loop — kalau ada outer timeout
// (Promise.race di caller), setTimeout-nya tetap bisa fire.
export async function withRouterosApi<T>(
  cfg: RouterosApiConfig,
  run: (api: RouterOSAPI) => Promise<T>,
): Promise<T> {
  const api = await connectRouterosApi(cfg);
  try {
    return await run(api);
  } finally {
    setImmediate(() => {
      try { api.close(); } catch {}
      // Defensive: paksa destroy socket internal kalau close gak resolve.
      // Akses internal socket via property — node-routeros nge-expose
      // socket di field bernama `socket` (TCP) atau `connection`.
      try {
        const internal = api as unknown as { socket?: { destroy?: () => void }; connection?: { destroy?: () => void } };
        internal.socket?.destroy?.();
        internal.connection?.destroy?.();
      } catch {}
    });
  }
}

// Aktifkan RouterOS API service via SSH. Idempotent: cek state dulu sebelum
// ngubah supaya gak generate change event ke router yang udah on.
// Set address restriction kalau MIKROPLAY_SERVER_IP di-env.
// Return juga `port` aktual yang ke-set di /ip service api (bisa beda dari
// default 8728 kalau user udah ganti). Caller wajib update DB pakai port ini.
export async function enableRouterosApiService(
  sshCfg: MikrotikConfig,
): Promise<{ ok: boolean; alreadyEnabled: boolean; addressRestricted: boolean; port: number; raw: string; error?: string }> {
  const restrictIp = process.env.MIKROPLAY_SERVER_IP?.trim();
  const restrictCidr = restrictIp ? `${restrictIp}/32` : "";

  // 1. Ambil state pakai :put dari script RouterOS — output bersih,
  //    1 baris per query, gak perlu parsing kolom.
  let disabledStr: string;
  let portStr: string;
  try {
    disabledStr = (await executeMikrotikCommand(
      ":put [/ip service get [find name=api] disabled]",
      sshCfg,
    )).trim();
    portStr = (await executeMikrotikCommand(
      ":put [/ip service get [find name=api] port]",
      sshCfg,
    )).trim();
  } catch (e) {
    return {
      ok: false,
      alreadyEnabled: false,
      addressRestricted: false,
      port: 8728,
      raw: "",
      error: e instanceof Error ? e.message : String(e),
    };
  }

  const isDisabled = disabledStr === "true";
  const portNum = parseInt(portStr, 10) || 8728;
  const alreadyEnabled = !isDisabled;

  // 2. Enable + (opsional) address restriction. Kalau udah on, skip enable.
  const cmds: string[] = [];
  if (isDisabled) cmds.push("/ip service set [find name=api] disabled=no");
  if (restrictCidr) cmds.push(`/ip service set [find name=api] address=${restrictCidr}`);

  let cmdOutput = "";
  for (const cmd of cmds) {
    try {
      cmdOutput += `\n$ ${cmd}\n` + (await executeMikrotikCommand(cmd, sshCfg));
    } catch (e) {
      return {
        ok: false,
        alreadyEnabled,
        addressRestricted: false,
        port: portNum,
        raw: cmdOutput,
        error: e instanceof Error ? e.message : String(e),
      };
    }
  }

  // 3. Verify ulang (cuma kalau tadi disabled — kalau udah on, skip)
  if (isDisabled) {
    try {
      const verifyDisabled = (await executeMikrotikCommand(
        ":put [/ip service get [find name=api] disabled]",
        sshCfg,
      )).trim();
      if (verifyDisabled === "true") {
        return {
          ok: false,
          alreadyEnabled,
          addressRestricted: !!restrictCidr,
          port: portNum,
          raw: cmdOutput,
          error: "Service tetap disabled setelah set disabled=no — kemungkinan user gak punya policy api atau RouterOS reject",
        };
      }
    } catch (e) {
      return {
        ok: false,
        alreadyEnabled,
        addressRestricted: !!restrictCidr,
        port: portNum,
        raw: cmdOutput,
        error: e instanceof Error ? e.message : String(e),
      };
    }
  }

  return {
    ok: true,
    alreadyEnabled,
    addressRestricted: !!restrictCidr,
    port: portNum,
    raw: cmdOutput,
  };
}

// Quick test koneksi via API. Pakai /system/identity/print (paling ringan).
// Auto-close. Return identity name kalau sukses.
export async function testRouterosApi(
  cfg: RouterosApiConfig,
): Promise<{ ok: boolean; identity?: string; error?: string }> {
  try {
    const identity = await withRouterosApi(cfg, async (api) => {
      const rows = await api.write("/system/identity/print");
      return rows?.[0]?.name as string | undefined;
    });
    return { ok: true, identity };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}
