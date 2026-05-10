import net from "net";

class RouterOSAPI {
  constructor(host, port = 8728, user = "admin", password = "", timeout = 10000) {
    this.host = host;
    this.port = port;
    this.user = user;
    this.password = password;
    this.timeout = timeout;
  }

  encodeLength(len) {
    if (len < 0x80) return Buffer.from([len]);
    if (len < 0x4000) return Buffer.from([(len >> 8) | 0x80, len & 0xff]);
    if (len < 0x200000) return Buffer.from([(len >> 16) | 0xc0, (len >> 8) & 0xff, len & 0xff]);
    return Buffer.from([(len >> 24) | 0xe0, (len >> 16) & 0xff, (len >> 8) & 0xff, len & 0xff]);
  }

  encodeWord(word) {
    const wordBuf = Buffer.from(word, "utf8");
    return Buffer.concat([this.encodeLength(wordBuf.length), wordBuf]);
  }

  encodeSentence(words) {
    const parts = words.map((w) => this.encodeWord(w));
    parts.push(Buffer.from([0]));
    return Buffer.concat(parts);
  }

  decodeLength(buf, offset) {
    const b = buf[offset];
    if ((b & 0x80) === 0) return { len: b, bytes: 1 };
    if ((b & 0xc0) === 0x80) return { len: ((b & 0x3f) << 8) | buf[offset + 1], bytes: 2 };
    if ((b & 0xe0) === 0xc0) return { len: ((b & 0x1f) << 16) | (buf[offset + 1] << 8) | buf[offset + 2], bytes: 3 };
    return { len: ((b & 0x0f) << 24) | (buf[offset + 1] << 16) | (buf[offset + 2] << 8) | buf[offset + 3], bytes: 4 };
  }

  query(command, params = {}) {
    return new Promise((resolve, reject) => {
      const socket = new net.Socket();
      socket.setTimeout(this.timeout);

      let buf = Buffer.alloc(0);
      let loginState = 0; // 0=initial, 1=credentials sent, 2=logged in
      const results = [];
      let currentRow = {};

      const send = (words) => {
        console.log("SEND:", words);
        socket.write(this.encodeSentence(words));
      };

      const sendCommand = () => {
        const words = [command];
        for (const [k, v] of Object.entries(params)) words.push(`=${k}=${v}`);
        send(words);
      };

      const parseBuf = () => {
        while (buf.length > 0) {
          if (buf[0] === 0) {
            buf = buf.slice(1);
            console.log(`[state=${loginState}] sentence end, currentRow:`, currentRow);

            if (loginState === 0) {
              if (currentRow["!trap"] !== undefined) {
                socket.destroy();
                reject(new Error(currentRow["message"] || "Login failed"));
                return;
              }
              loginState = 1;
              send(["/login", `=name=${this.user}`, `=password=${this.password}`]);
            } else if (loginState === 1) {
              if (currentRow["!trap"] !== undefined) {
                socket.destroy();
                reject(new Error(currentRow["message"] || "Login failed"));
                return;
              }
              loginState = 2;
              sendCommand();
            } else {
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
          console.log("RECV word:", JSON.stringify(word));

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
        console.log(`Connected to ${this.host}:${this.port}`);
        send(["/login"]);
      });

      socket.on("data", (data) => {
        buf = Buffer.concat([buf, data]);
        try { parseBuf(); } catch (e) { socket.destroy(); reject(e); }
      });

      socket.on("timeout", () => { socket.destroy(); reject(new Error("Connection timeout")); });
      socket.on("error", (err) => reject(new Error(`Connection error: ${err.message}`)));
      socket.on("close", () => {
        if (loginState < 2) reject(new Error("Connection closed before login"));
      });
    });
  }
}

async function main() {
  const api = new RouterOSAPI("103.191.218.137", 8780, "milmelland", "12346789", 15000);
  try {
    const identity = await api.query("/system/identity/print");
    console.log("\n=== SUCCESS ===");
    console.log("Router identity:", identity);
  } catch (err) {
    console.log("\n=== FAILED ===");
    console.log("Error:", err.message);
  }
}

main();
