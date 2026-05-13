export const dynamic = "force-dynamic";
import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { getSessionFromCookie, type SessionPayload } from "@/lib/session";
import { subscribe, type RealtimeEvent } from "@/lib/realtime/hub";
import { prisma } from "@/lib/prisma";

const enc = new TextEncoder();
const PING_MS = 15000;

type Authorizer = (session: SessionPayload, topic: string) => Promise<boolean>;

const TOPIC_ACL: Array<{ match: RegExp; check: Authorizer }> = [
  {
    match: /^admin:/,
    check: async (session) => {
      if (session.role !== "ADMIN") return false;
      const admin = await prisma.user.findUnique({
        where: { id: session.userId },
        select: { role: true },
      });
      return admin?.role === "ADMIN";
    },
  },
  {
    // user:<id> — boleh diri sendiri, atau admin (buat impersonate / monitoring)
    match: /^user:[^:]+$/,
    check: async (session, topic) => {
      const targetId = topic.slice("user:".length);
      if (session.userId === targetId) return true;
      if (session.role === "ADMIN") {
        const admin = await prisma.user.findUnique({
          where: { id: session.userId },
          select: { role: true },
        });
        return admin?.role === "ADMIN";
      }
      return false;
    },
  },
];

// "user:me" → "user:<sessionUserId>" — biar client gak perlu nyebut userId di URL
function resolveTopic(session: SessionPayload, topic: string): string {
  if (topic === "user:me") return `user:${session.userId}`;
  return topic;
}

async function authorize(session: SessionPayload, topic: string): Promise<boolean> {
  for (const rule of TOPIC_ACL) {
    if (rule.match.test(topic)) return rule.check(session, topic);
  }
  return false;
}

function formatSse(evt: RealtimeEvent): string {
  return `event: ${evt.event}\ndata: ${JSON.stringify(evt.data ?? null)}\n\n`;
}

export async function GET(req: NextRequest) {
  const cookieStore = await cookies();
  const session = getSessionFromCookie(cookieStore.get("session")?.value);
  if (!session) return new Response("Unauthorized", { status: 401 });

  const rawTopics = req.nextUrl.searchParams.getAll("topic").filter(Boolean);
  if (rawTopics.length === 0) return new Response("Missing topic", { status: 400 });
  if (rawTopics.length > 10) return new Response("Too many topics", { status: 400 });

  const topics = rawTopics.map((t) => resolveTopic(session, t));

  for (const topic of topics) {
    if (!(await authorize(session, topic))) {
      return new Response("Forbidden", { status: 403 });
    }
  }

  const unsubscribes: Array<() => void> = [];
  let ping: ReturnType<typeof setInterval> | null = null;
  let closed = false;

  const stream = new ReadableStream({
    async start(controller) {
      const send = (chunk: string) => {
        if (closed) return;
        try { controller.enqueue(enc.encode(chunk)); } catch {}
      };

      send(`retry: 5000\n\n`);
      send(`event: ready\ndata: ${JSON.stringify({ topics })}\n\n`);

      ping = setInterval(() => send(`: ping\n\n`), PING_MS);

      for (const topic of topics) {
        try {
          const unsub = await subscribe(topic, (evt) => send(formatSse(evt)));
          unsubscribes.push(unsub);
        } catch (err) {
          console.error("[api/realtime] subscribe failed:", topic, err);
          send(`event: error\ndata: ${JSON.stringify({ topic, message: "subscribe_failed" })}\n\n`);
        }
      }
    },
    cancel() {
      closed = true;
      if (ping) { clearInterval(ping); ping = null; }
      for (const u of unsubscribes) { try { u(); } catch {} }
      unsubscribes.length = 0;
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
