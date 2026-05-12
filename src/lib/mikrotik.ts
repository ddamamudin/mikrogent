import { Client } from 'ssh2';

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
  // Identity & resource — kecil, penting
  { cmd: '/system identity print' },
  { cmd: '/system resource print' },
  { cmd: '/system routerboard print' },

  // Network basics — biasanya kecil
  { cmd: '/interface print detail' },
  { cmd: '/ip address print' },
  { cmd: '/ip dns print' },
  { cmd: '/ip route print terse' },

  // Berpotensi besar — count saja, detail on-demand
  { cmd: '/ip firewall filter print count-only', label: '/ip firewall filter count' },
  { cmd: '/ip firewall nat print count-only', label: '/ip firewall nat count' },
  { cmd: '/ip firewall mangle print count-only', label: '/ip firewall mangle count' },
  { cmd: '/queue simple print count-only', label: '/queue simple count' },
  { cmd: '/queue tree print count-only', label: '/queue tree count' },
  { cmd: '/ppp secret print count-only', label: '/ppp secret count' },

  // Hotspot/DHCP/PPP profile — biasanya kecil
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
