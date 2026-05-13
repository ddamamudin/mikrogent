export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSessionFromCookie } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { logAdmin } from "@/lib/admin-log";
import { RT } from "@/lib/realtime/events";

async function requireAdmin() {
  const cookieStore = await cookies();
  const session = getSessionFromCookie(cookieStore.get("session")?.value);
  if (!session || session.role !== "ADMIN") return null;
  const admin = await prisma.user.findUnique({ where: { id: session.userId }, select: { id: true, name: true, adminLevel: true } });
  return admin;
}

export async function GET() {
  if (!await requireAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const config = await prisma.appConfig.findUnique({ where: { id: "singleton" } });
  return NextResponse.json(config ?? { adminSetupEnabled: true });
}

export async function PATCH(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();

  // VALIDATOR cuma boleh ganti password sendiri, gak bisa otak-atik config
  if (admin.adminLevel === "VALIDATOR" && !body.newPassword) {
    return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });
  }

  if (typeof body.adminSetupEnabled === "boolean") {
    const config = await prisma.appConfig.upsert({
      where: { id: "singleton" },
      update: { adminSetupEnabled: body.adminSetupEnabled },
      create: { id: "singleton", adminSetupEnabled: body.adminSetupEnabled },
    });
    await logAdmin({ adminId: admin.id, adminName: admin.name, action: "set_admin_setup_enabled", details: String(body.adminSetupEnabled) });
    RT.configUpdated().catch(() => {});
    RT.publicConfigChanged().catch(() => {});
    return NextResponse.json(config);
  }

  if (typeof body.registrationEnabled === "boolean") {
    const config = await prisma.appConfig.upsert({
      where: { id: "singleton" },
      update: { registrationEnabled: body.registrationEnabled },
      create: { id: "singleton", registrationEnabled: body.registrationEnabled },
    });
    await logAdmin({ adminId: admin.id, adminName: admin.name, action: "set_registration_enabled", details: String(body.registrationEnabled) });
    RT.configUpdated().catch(() => {});
    RT.publicConfigChanged().catch(() => {});
    return NextResponse.json(config);
  }

  if (typeof body.showBrandField === "boolean") {
    const config = await prisma.appConfig.upsert({
      where: { id: "singleton" },
      update: { showBrandField: body.showBrandField },
      create: { id: "singleton", showBrandField: body.showBrandField },
    });
    await logAdmin({ adminId: admin.id, adminName: admin.name, action: "set_show_brand_field", details: String(body.showBrandField) });
    RT.configUpdated().catch(() => {});
    return NextResponse.json(config);
  }

  if ("defaultMaxRouters" in body) {
    const v = body.defaultMaxRouters;
    const n = typeof v === "number" ? v : parseInt(String(v), 10);
    if (!Number.isFinite(n) || n < 1 || n > 5) {
      return NextResponse.json({ error: "Default kuota router harus 1 - 5" }, { status: 400 });
    }
    const syncExisting = body.syncExisting === true;
    const config = await prisma.appConfig.upsert({
      where: { id: "singleton" },
      update: { defaultMaxRouters: n },
      create: { id: "singleton", defaultMaxRouters: n },
    });
    let synced = 0;
    if (syncExisting) {
      // Naikkin maxRouters semua user yang masih di bawah n. User yang sudah > n di-skip
      // supaya gak nurunin kuota orang yang admin manual-naikkin sebelumnya.
      // Fetch ID dulu supaya bisa fire event ke user:* channel per-orang.
      const affected = await prisma.user.findMany({
        where: { role: "USER", maxRouters: { lt: n } },
        select: { id: true },
      });
      const result = await prisma.user.updateMany({
        where: { role: "USER", maxRouters: { lt: n } },
        data: { maxRouters: n },
      });
      synced = result.count;
      for (const u of affected) {
        RT.userMaxRoutersChanged(u.id).catch(() => {});
      }
    }
    await logAdmin({
      adminId: admin.id, adminName: admin.name,
      action: "set_default_max_routers",
      details: `${n}${syncExisting ? ` (sync existing: ${synced} user)` : ""}`,
    });
    RT.configUpdated().catch(() => {});
    return NextResponse.json({ ...config, syncedCount: synced });
  }

  if (body.agentConfig) {
    const {
      llmProvider,
      claudeApiKey,
      openaiApiKey,
      anthropicModel,
      openaiModel,
      openaiRealtimeModel,
      openaiVoice,
      agentPersona,
      agentKnowledge,
      dailyChatLimit,
      voiceCallEnabled,
      voiceDailySeconds,
    } = body.agentConfig;

    if (llmProvider !== undefined && llmProvider !== "anthropic" && llmProvider !== "openai") {
      return NextResponse.json({ error: "Provider tidak valid" }, { status: 400 });
    }

    // Voice call wajib OpenAI provider + API key terisi
    if (voiceCallEnabled === true) {
      const existing = await prisma.appConfig.findUnique({ where: { id: "singleton" } });
      const effectiveProvider = llmProvider ?? existing?.llmProvider;
      const effectiveOpenaiKey = openaiApiKey !== undefined ? openaiApiKey : existing?.openaiApiKey;
      if (effectiveProvider !== "openai") {
        return NextResponse.json({ error: "Voice call hanya bisa diaktifkan saat provider = OpenAI" }, { status: 400 });
      }
      if (!effectiveOpenaiKey || !String(effectiveOpenaiKey).trim()) {
        return NextResponse.json({ error: "API Key OpenAI wajib diisi sebelum mengaktifkan voice call" }, { status: 400 });
      }
    }

    if (voiceDailySeconds !== undefined) {
      const n = Number(voiceDailySeconds);
      if (!Number.isFinite(n) || n < 30 || n > 3600) {
        return NextResponse.json({ error: "Batas durasi voice per hari harus 30 - 3600 detik" }, { status: 400 });
      }
    }

    const data: Record<string, unknown> = {};
    const changed: string[] = [];
    if (llmProvider !== undefined) { data.llmProvider = llmProvider; changed.push(`provider=${llmProvider}`); }
    if (claudeApiKey !== undefined) { data.claudeApiKey = claudeApiKey || null; changed.push("claudeApiKey"); }
    if (openaiApiKey !== undefined) { data.openaiApiKey = openaiApiKey || null; changed.push("openaiApiKey"); }
    if (anthropicModel !== undefined && anthropicModel) { data.anthropicModel = anthropicModel; changed.push(`anthropicModel=${anthropicModel}`); }
    if (openaiModel !== undefined && openaiModel) { data.openaiModel = openaiModel; changed.push(`openaiModel=${openaiModel}`); }
    if (openaiRealtimeModel !== undefined && openaiRealtimeModel) { data.openaiRealtimeModel = openaiRealtimeModel; changed.push(`openaiRealtimeModel=${openaiRealtimeModel}`); }
    if (openaiVoice !== undefined && openaiVoice) {
      const allowed = ["alloy", "ash", "ballad", "coral", "echo", "marin", "sage", "shimmer", "verse", "cedar"];
      if (!allowed.includes(openaiVoice)) {
        return NextResponse.json({ error: "Voice tidak valid" }, { status: 400 });
      }
      data.openaiVoice = openaiVoice;
      changed.push(`openaiVoice=${openaiVoice}`);
    }
    if (agentPersona !== undefined) { data.agentPersona = agentPersona; changed.push("persona"); }
    if (agentKnowledge !== undefined) { data.agentKnowledge = agentKnowledge; changed.push("knowledge"); }
    if (dailyChatLimit !== undefined) { data.dailyChatLimit = dailyChatLimit; changed.push(`dailyChatLimit=${dailyChatLimit}`); }
    if (typeof voiceCallEnabled === "boolean") { data.voiceCallEnabled = voiceCallEnabled; changed.push(`voiceCallEnabled=${voiceCallEnabled}`); }
    if (voiceDailySeconds !== undefined) { data.voiceDailySeconds = Number(voiceDailySeconds); changed.push(`voiceDailySeconds=${voiceDailySeconds}`); }

    const config = await prisma.appConfig.upsert({
      where: { id: "singleton" },
      update: data,
      create: { id: "singleton", ...data },
    });
    await logAdmin({ adminId: admin.id, adminName: admin.name, action: "update_agent_config", details: changed.join(", ") });
    RT.configUpdated().catch(() => {});
    return NextResponse.json(config);
  }

  if (body.newPassword) {
    const bcrypt = await import("bcryptjs");
    const hashed = await bcrypt.hash(body.newPassword, 12);
    await prisma.user.update({ where: { id: admin.id }, data: { password: hashed } });
    await logAdmin({ adminId: admin.id, adminName: admin.name, action: "change_password" });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Tidak ada perubahan" }, { status: 400 });
}
