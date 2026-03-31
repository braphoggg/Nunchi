import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const user = await getAuthenticatedUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const ob = await prisma.userOnboarding.findUnique({
    where: { userId: user.id },
  });

  return NextResponse.json({
    tutorialCompleted: ob?.tutorialCompleted ?? false,
    onboarded: ob?.onboarded ?? false,
  });
}

export async function PUT(req: Request) {
  const user = await getAuthenticatedUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();

  await prisma.userOnboarding.upsert({
    where: { userId: user.id },
    create: {
      userId: user.id,
      tutorialCompleted: body.tutorialCompleted ?? false,
      onboarded: body.onboarded ?? false,
    },
    update: {
      tutorialCompleted: body.tutorialCompleted,
      onboarded: body.onboarded,
    },
  });

  return NextResponse.json({ success: true });
}
