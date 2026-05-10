import net from "net";

type RouterOSResponse = Record<string, string>;

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
    parts.push(Buffer.from([0])); // empty word = end of sentence
    return Buffer.concat(parts);
  }

  private async communicate(sentences: string[][]): Promise<RouterOSResponse[][]> {
    return new Promise((resolve, reject) => {
      const socket = new net.Socket();
      socket.setTimeout(this.timeout);

      let buffer = Buffer.alloc(0);
      const responses: RouterOSResponse[][] = [];
      let currentBlock: RouterOSResponse[] = [];
      let sentenceIndex = 0;

      socket.connect(this.port, this.host, () => {
        const sendNext = () => {
          if (sentenceIndex < sentences.length) {
            socket.write(this.encodeSentence(sentences[sentenceIndex++]));
          }
        };
        sendNext();
      });

      socket.on("data", (data) => {
        buffer = Buffer.concat([buffer, data]);

        while (buffer.length > 0) {
          const { length: wordLen, bytesRead } = this.decodeLength(buffer);
          if (buffer.length < bytesRead + wordLen) break;

          const word = buffer.slice(bytesRead, bytesRead + wordLen).toString("utf8");
          buffer = buffer.slice(bytesRead + wordLen);

          if (wordLen === 0) {
            // End of sentence
            responses.push([...currentBlock]);
            currentBlock = [];

            const lastResponse = responses[responses.length - 1];
            const lastWord = lastResponse[lastResponse.length - 1];
            const isDone =
              lastResponse.some((r) => r["!done"] !== undefined) ||
              (lastWord && lastWord["!done"] !== undefined);

            if (isDone || responses.length >= sentences.length) {
              socket.destroy();
              resolve(responses);
            }
          } else if (word.startsWith("!done")) {
            currentBlock.push({ "!done": "" });
          } else if (word.startsWith("!re")) {
            currentBlock.push({ "!re": "" });
          } else if (word.startsWith("!trap")) {
            currentBlock.push({ "!trap": word });
          } else if (word.startsWith("=")) {
            const eqIdx = word.indexOf("=", 1);
            if (eqIdx > 0) {
              const key = word.slice(1, eqIdx);
              const val = word.slice(eqIdx + 1);
              if (currentBlock.length === 0) currentBlock.push({});
              currentBlock[currentBlock.length - 1][key] = val;
            }
          } else if (word.startsWith(".id=")) {
            if (currentBlock.length === 0) currentBlock.push({});
            currentBlock[currentBlock.length - 1][".id"] = word.slice(4);
          }
        }
      });

      socket.on("timeout", () => {
        socket.destroy();
        reject(new Error("Connection timeout"));
      });

      socket.on("error", (err) => {
        reject(new Error(`Connection error: ${err.message}`));
      });

      socket.on("close", () => {
        if (currentBlock.length > 0) responses.push(currentBlock);
        resolve(responses);
      });
    });
  }

  private decodeLength(buf: Buffer): { length: number; bytesRead: number } {
    const b = buf[0];
    if ((b & 0x80) === 0) return { length: b, bytesRead: 1 };
    if ((b & 0xc0) === 0x80) return { length: ((b & 0x3f) << 8) | buf[1], bytesRead: 2 };
    if ((b & 0xe0) === 0xc0) return { length: ((b & 0x1f) << 16) | (buf[1] << 8) | buf[2], bytesRead: 3 };
    return { length: ((b & 0x0f) << 24) | (buf[1] << 16) | (buf[2] << 8) | buf[3], bytesRead: 4 };
  }

  private md5(str: string): string {
    return require("crypto").createHash("md5").update(str).digest("hex");
  }

  async connect(): Promise<void> {
    // Login sequence
    const loginResp = await this.communicate([["/login"]]);
    const challenge = loginResp.flat().find((r) => r["ret"])?.["ret"];

    let loginSentence: string[];
    if (challenge) {
      // Old RouterOS auth (v6)
      const digest = this.md5(
        "\x00" +
        this.password +
        Buffer.from(challenge, "hex").toString("binary")
      );
      loginSentence = ["/login", `=name=${this.user}`, `=response=00${digest}`];
    } else {
      // New RouterOS auth (v7)
      loginSentence = ["/login", `=name=${this.user}`, `=password=${this.password}`];
    }

    const authResp = await this.communicate([loginSentence]);
    const trap = authResp.flat().find((r) => r["!trap"]);
    if (trap) throw new Error("Login failed: wrong credentials");
  }

  async query(command: string, params: Record<string, string> = {}, filter?: string): Promise<RouterOSResponse[]> {
    const words = [command];
    for (const [k, v] of Object.entries(params)) {
      words.push(`=${k}=${v}`);
    }
    if (filter) words.push(`?${filter}`);

    await this.connect();
    const responses = await this.communicate([words]);
    return responses
      .flat()
      .filter((r) => !r["!done"] && !r["!re"] && !r["!trap"] && Object.keys(r).length > 0);
  }
}

// Helper: connect + run single command
export async function routerQuery(
  ip: string,
  port: number,
  user: string,
  password: string,
  command: string,
  params: Record<string, string> = {}
): Promise<RouterOSResponse[]> {
  const api = new RouterOSAPI(ip, port, user, password);
  return api.query(command, params);
}
