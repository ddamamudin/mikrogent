import net from "net";

type RosWord = Record<string, string>;

export class RouterOSAPI {
  private host: string;
  private port: number;
  private user: string;
  private password: string;
  private timeout: number;

  constructor(host: string, port = 8728, user = "admin", password = "", timeout = 10000) {
    this.host = host;
    this.port = port;
    this.user = user;
    this.password = password;
    this.timeout = timeout;
  }

  private encodeLength(len: number): Buffer {
    if (len < 0x80) return Buffer.from([len]);
    if (len < 0x4000) return Buffer.from([(len >> 8) | 0x80, len & 0xff]);
    if (len < 0x200000) return Buffer.from([(len >> 16) | 0xc0, (len >> 8) & 0xff, len & 0xff]);
    return Buffer.from([(len >> 24) | 0xe0, (len >> 16) & 0xff, (len >> 8) & 0xff, len & 0xff]);
  }

  private encodeWord(word: string): Buffer {
    const wordBuf = Buffer.from(word, "utf8");
    return Buffer.concat([this.encodeLength(wordBuf.length), wordBuf]);
  }

  private encodeSentence(words: string[]): Buffer {
    const parts = words.map((w) => this.encodeWord(w));
    parts.push(Buffer.from([0]));
    return Buffer.concat(parts);
  }

  private decodeLength(buf: Buffer, offset: number): { len: number; bytes: number } {
    const b = buf[offset];
    if ((b & 0x80) === 0) return { len: b, bytes: 1 };
    if ((b & 0xc0) === 0x80) return { len: ((b & 0x3f) << 8) | buf[offset + 1], bytes: 2 };
    if ((b & 0xe0) === 0xc0) return { len: ((b & 0x1f) << 16) | (buf[offset + 1] << 8) | buf[offset + 2], bytes: 3 };
    return { len: ((b & 0x0f) << 24) | (buf[offset + 1] << 16) | (buf[offset + 2] << 8) | buf[offset + 3], bytes: 4 };
  }

  async query(command: string, params: Record<string, string> = {}): Promise<RosWord[]> {
    return new Promise((resolve, reject) => {
      const socket = new net.Socket();
      socket.setTimeout(this.timeout);

      let buf = Buffer.alloc(0);
      // Login states: 0=initial, 1=credentials sent (waiting confirm), 2=logged in
      let loginState = 0;
      const results: RosWord[] = [];
      let currentRow: RosWord = {};

      const send = (words: string[]) => socket.write(this.encodeSentence(words));

      const sendCommand = () => {
        const words = [command];
        for (const [k, v] of Object.entries(params)) words.push(`=${k}=${v}`);
        send(words);
      };

      const parseBuf = () => {
        while (buf.length > 0) {
          if (buf[0] === 0) {
            buf = buf.slice(1);

            if (loginState === 0) {
              // Waiting for /login response
              if (currentRow["!trap"] !== undefined) {
                socket.destroy();
                reject(new Error(currentRow["message"] || "Login failed"));
                return;
              }
              // v6: got challenge (=ret=) — send plain password
              // v7: got !done without challenge — also send credentials
              loginState = 1;
              send(["/login", `=name=${this.user}`, `=password=${this.password}`]);
            } else if (loginState === 1) {
              // Waiting for credential confirmation
              if (currentRow["!trap"] !== undefined) {
                socket.destroy();
                reject(new Error(currentRow["message"] || "Login failed"));
                return;
              }
              // !done = login success — send actual command
              loginState = 2;
              sendCommand();
            } else {
              // loginState === 2: collecting command results
              if (currentRow["!done"] !== undefined) {
                socket.destroy();
                resolve(results);
                return;
              } else if (currentRow["!trap"] !== undefined) {
                socket.destroy();
                reject(new Error(currentRow["message"] || "Command failed"));
                return;
              } else if (Object.keys(currentRow).length > 0) {
                results.push({ ...currentRow });
              }
            }
            currentRow = {};
            continue;
          }

          if (buf.length < 1) break;
          const { len, bytes } = this.decodeLength(buf, 0);
          if (buf.length < bytes + len) break;

          const word = buf.slice(bytes, bytes + len).toString("utf8");
          buf = buf.slice(bytes + len);

          if (word.startsWith("!done")) {
            currentRow["!done"] = "";
          } else if (word.startsWith("!trap")) {
            currentRow["!trap"] = "";
          } else if (word.startsWith("!re")) {
            if (Object.keys(currentRow).length > 0 && currentRow["!done"] === undefined && currentRow["!trap"] === undefined) {
              results.push({ ...currentRow });
              currentRow = {};
            }
          } else if (word.startsWith("=")) {
            const eq2 = word.indexOf("=", 1);
            if (eq2 > 0) currentRow[word.slice(1, eq2)] = word.slice(eq2 + 1);
          } else if (word.startsWith(".id=")) {
            currentRow[".id"] = word.slice(4);
          } else if (word.startsWith("message=")) {
            currentRow["message"] = word.slice(8);
          }
        }
      };

      socket.connect(this.port, this.host, () => {
        send(["/login"]);
      });

      socket.on("data", (data) => {
        buf = Buffer.concat([buf, data]);
        try { parseBuf(); } catch (e: any) { socket.destroy(); reject(e); }
      });

      socket.on("timeout", () => { socket.destroy(); reject(new Error("Connection timeout")); });
      socket.on("error", (err) => reject(new Error(`Connection error: ${err.message}`)));
      socket.on("close", () => {
        if (loginState < 2) reject(new Error("Connection closed before login"));
      });
    });
  }

  async testConnection(): Promise<string> {
    const identity = await this.query("/system/identity/print");
    return identity[0]?.["name"] || this.host;
  }
}

export async function routerQuery(
  ip: string, port: number, user: string, password: string,
  command: string, params: Record<string, string> = {}
): Promise<Record<string, string>[]> {
  const api = new RouterOSAPI(ip, port, user, password);
  return api.query(command, params);
}
