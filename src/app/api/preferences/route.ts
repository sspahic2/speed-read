import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const prefs = await prisma.userPreferences.findUnique({
    where: { userId: session.user.id },
    select: { settings: true },
  });

  return NextResponse.json({ settings: prefs?.settings ?? {} });
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as { settings?: Record<string, unknown> };
  if (!body.settings || typeof body.settings !== "object") {
    return NextResponse.json({ error: "settings object is required" }, { status: 400 });
  }

  // Merge incoming settings with existing
  const existing = await prisma.userPreferences.findUnique({
    where: { userId: session.user.id },
    select: { settings: true },
  });

  const existingObj = existing?.settings && typeof existing.settings === "object" && !Array.isArray(existing.settings)
    ? (existing.settings as Record<string, unknown>)
    : {};

  const merged = { ...existingObj, ...body.settings };

  await prisma.userPreferences.upsert({
    where: { userId: session.user.id },
    create: { userId: session.user.id, settings: JSON.parse(JSON.stringify(merged)) },
    update: { settings: JSON.parse(JSON.stringify(merged)) },
  });

  return NextResponse.json({ ok: true });
}
