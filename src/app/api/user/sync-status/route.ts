import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const user = await getAuthenticatedUser(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check if the user has any data in the database
  const [vocabCount, gamification] = await Promise.all([
    prisma.vocabularyItem.count({ where: { userId: user.id } }),
    prisma.gamification.findUnique({ where: { userId: user.id } }),
  ]);

  const hasData = vocabCount > 0 || (gamification?.totalXP ?? 0) > 0;

  return NextResponse.json({ hasData });
}
