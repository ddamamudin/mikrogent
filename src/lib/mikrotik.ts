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

// Scan semua konfigurasi MikroTik secara parallel
export async function scanMikrotikConfig(config: MikrotikConfig): Promise<string> {
  const commands = [
    '/system identity print',
    '/system resource print',
    '/system routerboard print',
    '/interface print detail',
    '/ip address print',
    '/ip route print',
    '/ip dns print',
    '/ip firewall filter print',
    '/ip firewall nat print',
    '/ip firewall mangle print',
    '/ip hotspot print',
    '/ip hotspot profile print',
    '/ip pool print',
    '/ip dhcp-server print',
    '/ip dhcp-server network print',
    '/ppp profile print',
    '/ppp secret print count-only',
    '/queue simple print',
    '/queue tree print',
    '/system user print',
    '/ip service print',
  ];

  const results = await Promise.all(
    commands.map(async (cmd) => {
      try {
        const out = await executeMikrotikCommand(cmd, config);
        return `=== ${cmd} ===\n${out}`;
      } catch {
        return `=== ${cmd} ===\n(error atau tidak tersedia)`;
      }
    })
  );

  return results.join('\n\n');
}
