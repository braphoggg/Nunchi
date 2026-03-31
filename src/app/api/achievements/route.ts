import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const user = await getAuthenticatedUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const ach = await prisma.userAchievements.findUnique({
    where: { userId: user.id },
  });

  return NextResponse.json({
    unlockedIds: ach?.unlockedIds ?? [],
    unlockTimestamps: ach?.unlockTimestamps ?? {},
  });
}

export async function PUT(req: Request) {
  const user = await getAuthenticatedUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();

  await prisma.userAchievements.upsert({
    where: { userId: user.id },
    create: {
      userId: user.id,
      unlockedIds: body.unlockedIds ?? [],
      unlockTimestamps: body.unlockTimestamps ?? {},
    },
    update: {
      unlockedIds: body.unlockedIds,
      unlockTimestamps: body.unlockTimestamps,
    },
  });

  return NextResponse.json({ success: true });
}
