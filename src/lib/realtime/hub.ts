import pg from "pg";
import { prisma } from "@/lib/prisma";

const CHANNEL = "mikroplay_rt";
const RECONNECT_DELAY_MS = 2000;
const MAX_PAYLOAD_BYTES = 7000;

export type RealtimeEvent = {
  topic: string;
  event: string;
  data?: unknown;
};

type Subscriber = (evt: RealtimeEvent) => void;

type HubState = {
  client: pg.Client | null;
  subscribers: Map<string, Set<Subscriber>>;
  connecting: Promise<void> | null;
};

const globalForHub = globalThis as unknown as { __mikroplayRtHub?: HubState };

function state(): HubState {
  if (!globalForHub.__mikroplayRtHub) {
    globalForHub.__mikroplayRtHub = {
      client: null,
      subscribers: new Map(),
      connecting: null,
    };
  }
  return globalForHub.__mikroplayRtHub;
}

function scheduleReconnect() {
  const s = state();
  s.client = null;
  setTimeout(() => {
    ensureListener().catch((err) => {
      console.error("[realtime] reconnect failed:", err?.message ?? err);
    });
  }, RECONNECT_DELAY_MS);
}

async function ensureListener(): Promise<void> {
  const s = state();
  if (s.client) return;
  if (s.connecting) return s.connecting;

  s.connecting = (async () => {
    const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
    client.on("error", (err) => {
      console.error("[realtime] pg client error:", err.message);
      try { client.end().catch(() => {}); } catch {}
      scheduleReconnect();
    });
    client.on("end", () => {
      if (state().client === client) scheduleReconnect();
    });
    client.on("notification", (msg) => {
      if (msg.channel !== CHANNEL || !msg.payload) return;
      let evt: RealtimeEvent;
      try { evt = JSON.parse(msg.payload) as RealtimeEvent; } catch { return; }
      if (!evt.topic || !evt.event) return;
      const subs = state().subscribers.get(evt.topic);
      if (!subs) return;
      for (const fn of subs) {
        try { fn(evt); } catch (err) {
          console.error("[realtime] subscriber error:", err);
        }
      }
    });
    await client.connect();
    await client.query(`LISTEN ${CHANNEL}`);
    s.client = client;
  })();

  try {
    await s.connecting;
  } finally {
    s.connecting = null;
  }
}

export async function subscribe(topic: string, fn: Subscriber): Promise<() => void> {
  await ensureListener();
  const s = state();
  let set = s.subscribers.get(topic);
  if (!set) {
    set = new Set();
    s.subscribers.set(topic, set);
  }
  set.add(fn);
  return () => {
    const cur = state().subscribers.get(topic);
    if (!cur) return;
    cur.delete(fn);
    if (cur.size === 0) state().subscribers.delete(topic);
  };
}

export async function publish(evt: RealtimeEvent): Promise<void> {
  const payload = JSON.stringify(evt);
  if (Buffer.byteLength(payload, "utf8") > MAX_PAYLOAD_BYTES) {
    console.warn(`[realtime] payload too large (${payload.length}B), dropping`, evt.topic, evt.event);
    return;
  }
  try {
    await prisma.$executeRaw`SELECT pg_notify(${CHANNEL}, ${payload})`;
  } catch (err) {
    console.error("[realtime] publish failed:", (err as Error).message);
  }
}
