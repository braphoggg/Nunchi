import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const user = await getAuthenticatedUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const gam = await prisma.gamification.findUnique({
    where: { userId: user.id },
    include: {
      xpHistory: {
        orderBy: { timestamp: "desc" },
        take: 1000,
      },
    },
  });

  if (!gam) {
    return NextResponse.json({
      xp: { totalXP: 0, history: [] },
      streak: { currentStreak: 0, longestStreak: 0, lastPracticeDate: "" },
      stats: {
        totalMessages: 0,
        totalFlashcardSessions: 0,
        totalTranslations: 0,
        messagesWithoutTranslate: 0,
      },
    });
  }

  return NextResponse.json({
    xp: {
      totalXP: gam.totalXP,
      history: gam.xpHistory.map((e) => ({
        action: e.action,
        amount: e.amount,
        timestamp: e.timestamp.toISOString(),
      })),
    },
    streak: {
      currentStreak: gam.currentStreak,
      longestStreak: gam.longestStreak,
      lastPracticeDate: gam.lastPracticeDate ?? "",
    },
    stats: {
      totalMessages: gam.totalMessages,
      totalFlashcardSessions: gam.totalFlashcardSessions,
      totalTranslations: gam.totalTranslations,
      messagesWithoutTranslate: gam.messagesWithoutTranslate,
    },
  });
}

export async function PUT(req: Request) {
  const user = await getAuthenticatedUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();

  await prisma.gamification.upsert({
    where: { userId: user.id },
    create: {
      userId: user.id,
      totalXP: body.xp?.totalXP ?? 0,
      currentStreak: body.streak?.currentStreak ?? 0,
      longestStreak: body.streak?.longestStreak ?? 0,
      lastPracticeDate: body.streak?.lastPracticeDate ?? null,
      totalMessages: body.stats?.totalMessages ?? 0,
      totalFlashcardSessions: body.stats?.totalFlashcardSessions ?? 0,
      totalTranslations: body.stats?.totalTranslations ?? 0,
      messagesWithoutTranslate: body.stats?.messagesWithoutTranslate ?? 0,
    },
    update: {
      totalXP: body.xp?.totalXP,
      currentStreak: body.streak?.currentStreak,
      longestStreak: body.streak?.longestStreak,
      lastPracticeDate: body.streak?.lastPracticeDate,
      totalMessages: body.stats?.totalMessages,
      totalFlashcardSessions: body.stats?.totalFlashcardSessions,
      totalTranslations: body.stats?.totalTranslations,
      messagesWithoutTranslate: body.stats?.messagesWithoutTranslate,
    },
  });

  return NextResponse.json({ success: true });
}
