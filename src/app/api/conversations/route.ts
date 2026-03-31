import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const user = await getAuthenticatedUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const convs = await prisma.conversation.findMany({
    where: { userId: user.id },
    orderBy: { savedAt: "desc" },
    take: 20,
  });

  return NextResponse.json(
    convs.map((c) => ({
      id: c.id,
      savedAt: c.savedAt.toISOString(),
      preview: c.preview,
      messageCount: c.messageCount,
      messages: c.messages,
    })),
  );
}

export async function POST(req: Request) {
  const user = await getAuthenticatedUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();

  const conv = await prisma.conversation.create({
    data: {
      id: body.id,
      userId: user.id,
      savedAt: body.savedAt ? new Date(body.savedAt) : new Date(),
      preview: body.preview ?? "",
      messageCount: body.messageCount ?? 0,
      messages: body.messages ?? [],
    },
  });

  // Enforce max 20 conversations
  const convs = await prisma.conversation.findMany({
    where: { userId: user.id },
    orderBy: { savedAt: "desc" },
    select: { id: true },
  });

  if (convs.length > 20) {
    const toDelete = convs.slice(20).map((c) => c.id);
    await prisma.conversation.deleteMany({
      where: { id: { in: toDelete } },
    });
  }

  return NextResponse.json({ id: conv.id }, { status: 201 });
}
