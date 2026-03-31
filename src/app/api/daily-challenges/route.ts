import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const user = await getAuthenticatedUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const dc = await prisma.dailyChallengeState.findUnique({
    where: { userId: user.id },
  });

  if (!dc) {
    return NextResponse.json({
      date: "",
      challengeIds: [],
      progress: {},
      completedIds: [],
    });
  }

  return NextResponse.json({
    date: dc.date,
    challengeIds: dc.challengeIds,
    progress: dc.progress,
    completedIds: dc.completedIds,
  });
}

export async function PUT(req: Request) {
  const user = await getAuthenticatedUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();

  await prisma.dailyChallengeState.upsert({
    where: { userId: user.id },
    create: {
      userId: user.id,
      date: body.date ?? "",
      challengeIds: body.challengeIds ?? [],
      progress: body.progress ?? {},
      completedIds: body.completedIds ?? [],
    },
    update: {
      date: body.date,
      challengeIds: body.challengeIds,
      progress: body.progress,
      completedIds: body.completedIds,
    },
  });

  return NextResponse.json({ success: true });
}
