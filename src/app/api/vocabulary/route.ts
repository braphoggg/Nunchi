import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const user = await getAuthenticatedUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const items = await prisma.vocabularyItem.findMany({
    where: { userId: user.id },
    orderBy: { savedAt: "desc" },
  });

  return NextResponse.json(
    items.map((item) => ({
      id: item.id,
      korean: item.korean,
      romanization: item.romanization,
      english: item.english,
      savedAt: item.savedAt.toISOString(),
      easeFactor: item.easeFactor,
      interval: item.interval,
      repetitions: item.repetitions,
      nextReview: item.nextReview?.toISOString() ?? null,
      lastGrade: item.lastGrade,
    })),
  );
}

export async function POST(req: Request) {
  const user = await getAuthenticatedUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { items } = await req.json();
  if (!Array.isArray(items)) {
    return NextResponse.json({ error: "items must be an array" }, { status: 400 });
  }

  let created = 0;
  for (const item of items.slice(0, 100)) {
    try {
      await prisma.vocabularyItem.upsert({
        where: { userId_korean: { userId: user.id, korean: item.korean } },
        create: {
          userId: user.id,
          korean: item.korean ?? "",
          romanization: item.romanization ?? "",
          english: item.english ?? "",
          savedAt: item.savedAt ? new Date(item.savedAt) : new Date(),
          easeFactor: item.easeFactor ?? 2.5,
          interval: item.interval ?? 0,
          repetitions: item.repetitions ?? 0,
          nextReview: item.nextReview ? new Date(item.nextReview) : null,
          lastGrade: item.lastGrade ?? null,
        },
        update: {
          romanization: item.romanization ?? "",
          english: item.english ?? "",
          easeFactor: item.easeFactor ?? 2.5,
          interval: item.interval ?? 0,
          repetitions: item.repetitions ?? 0,
          nextReview: item.nextReview ? new Date(item.nextReview) : null,
          lastGrade: item.lastGrade ?? null,
        },
      });
      created++;
    } catch {
      // Skip duplicates or invalid items
    }
  }

  return NextResponse.json({ count: created });
}
