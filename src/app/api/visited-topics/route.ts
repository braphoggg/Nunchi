import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const user = await getAuthenticatedUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const topics = await prisma.visitedTopic.findMany({
    where: { userId: user.id },
    select: { topicId: true },
  });

  return NextResponse.json(topics.map((t) => t.topicId));
}

export async function POST(req: Request) {
  const user = await getAuthenticatedUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { topicId } = await req.json();
  if (!topicId || typeof topicId !== "string") {
    return NextResponse.json({ error: "Invalid topicId" }, { status: 400 });
  }

  await prisma.visitedTopic.upsert({
    where: { userId_topicId: { userId: user.id, topicId } },
    create: { userId: user.id, topicId },
    update: {},
  });

  return NextResponse.json({ success: true });
}
