import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const user = await getAuthenticatedUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const settings = await prisma.userSettings.findUnique({
    where: { userId: user.id },
  });

  if (!settings) {
    return NextResponse.json({
      theme: "dark",
      fontScale: 1,
      reduceAnimations: false,
      showRomanization: true,
      ttsRate: 0.85,
    });
  }

  return NextResponse.json({
    theme: settings.theme,
    fontScale: settings.fontScale,
    reduceAnimations: settings.reduceAnimations,
    showRomanization: settings.showRomanization,
    ttsRate: settings.ttsRate,
  });
}

export async function PUT(req: Request) {
  const user = await getAuthenticatedUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();

  const settings = await prisma.userSettings.upsert({
    where: { userId: user.id },
    create: {
      userId: user.id,
      theme: body.theme ?? "dark",
      fontScale: body.fontScale ?? 1,
      reduceAnimations: body.reduceAnimations ?? false,
      showRomanization: body.showRomanization ?? true,
      ttsRate: body.ttsRate ?? 0.85,
    },
    update: {
      theme: body.theme,
      fontScale: body.fontScale,
      reduceAnimations: body.reduceAnimations,
      showRomanization: body.showRomanization,
      ttsRate: body.ttsRate,
    },
  });

  return NextResponse.json(settings);
}
