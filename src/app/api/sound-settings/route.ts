import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const user = await getAuthenticatedUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const ss = await prisma.soundSettings.findUnique({
    where: { userId: user.id },
  });

  return NextResponse.json({
    muted: ss?.muted ?? false,
    volume: ss?.volume ?? 80,
  });
}

export async function PUT(req: Request) {
  const user = await getAuthenticatedUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();

  await prisma.soundSettings.upsert({
    where: { userId: user.id },
    create: {
      userId: user.id,
      muted: body.muted ?? false,
      volume: Math.max(0, Math.min(100, body.volume ?? 80)),
    },
    update: {
      muted: body.muted,
      volume: Math.max(0, Math.min(100, body.volume ?? 80)),
    },
  });

  return NextResponse.json({ success: true });
}
