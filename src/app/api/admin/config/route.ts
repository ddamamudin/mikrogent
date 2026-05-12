export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSessionFromCookie } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { logAdmin } from "@/lib/admin-log";

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
    return NextResponse.json(config);
  }

  if (typeof body.showBrandField === "boolean") {
    const config = await prisma.appConfig.upsert({
      where: { id: "singleton" },
      update: { showBrandField: body.showBrandField },
      create: { id: "singleton", showBrandField: body.showBrandField },
    });
    await logAdmin({ adminId: admin.id, adminName: admin.name, action: "set_show_brand_field", details: String(body.showBrandField) });
    return NextResponse.json(config);
  }

  if (body.agentConfig) {
    const {
      llmProvider,
      claudeApiKey,
      openaiApiKey,
      anthropicModel,
      openaiModel,
      agentPersona,
      agentKnowledge,
      dailyChatLimit,
    } = body.agentConfig;

    if (llmProvider !== undefined && llmProvider !== "anthropic" && llmProvider !== "openai") {
      return NextResponse.json({ error: "Provider tidak valid" }, { status: 400 });
    }

    const data: Record<string, unknown> = {};
    const changed: string[] = [];
    if (llmProvider !== undefined) { data.llmProvider = llmProvider; changed.push(`provider=${llmProvider}`); }
    if (claudeApiKey !== undefined) { data.claudeApiKey = claudeApiKey || null; changed.push("claudeApiKey"); }
    if (openaiApiKey !== undefined) { data.openaiApiKey = openaiApiKey || null; changed.push("openaiApiKey"); }
    if (anthropicModel !== undefined && anthropicModel) { data.anthropicModel = anthropicModel; changed.push(`anthropicModel=${anthropicModel}`); }
    if (openaiModel !== undefined && openaiModel) { data.openaiModel = openaiModel; changed.push(`openaiModel=${openaiModel}`); }
    if (agentPersona !== undefined) { data.agentPersona = agentPersona; changed.push("persona"); }
    if (agentKnowledge !== undefined) { data.agentKnowledge = agentKnowledge; changed.push("knowledge"); }
    if (dailyChatLimit !== undefined) { data.dailyChatLimit = dailyChatLimit; changed.push(`dailyChatLimit=${dailyChatLimit}`); }

    const config = await prisma.appConfig.upsert({
      where: { id: "singleton" },
      update: data,
      create: { id: "singleton", ...data },
    });
    await logAdmin({ adminId: admin.id, adminName: admin.name, action: "update_agent_config", details: changed.join(", ") });
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
