import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const user = await getAuthenticatedUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { action, amount } = await req.json();
  if (!action || typeof amount !== "number") {
    return NextResponse.json({ error: "Invalid XP event" }, { status: 400 });
  }

  // Ensure gamification record exists
  const gam = await prisma.gamification.upsert({
    where: { userId: user.id },
    create: { userId: user.id },
    update: {},
  });

  // Create XP event
  await prisma.xPEvent.create({
    data: {
      gamificationId: gam.id,
      action,
      amount,
    },
  });

  // Update total XP
  await prisma.gamification.update({
    where: { userId: user.id },
    data: { totalXP: { increment: amount } },
  });

  return NextResponse.json({ success: true });
}
