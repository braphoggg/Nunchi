import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * Bulk import all localStorage data into the database.
 * Called on first login when the user has localStorage data but no DB data.
 */
export async function POST(req: Request) {
  const user = await getAuthenticatedUser(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { data } = await req.json();

    await prisma.$transaction(async (tx) => {
      // Settings
      if (data["nunchi-settings"]) {
        const settings = JSON.parse(data["nunchi-settings"]);
        await tx.userSettings.upsert({
          where: { userId: user.id },
          create: {
            userId: user.id,
            theme: settings.theme ?? "dark",
            fontScale: settings.fontScale ?? 1,
            reduceAnimations: settings.reduceAnimations ?? false,
            showRomanization: settings.showRomanization ?? true,
            ttsRate: settings.ttsRate ?? 0.85,
          },
          update: {
            theme: settings.theme ?? "dark",
            fontScale: settings.fontScale ?? 1,
            reduceAnimations: settings.reduceAnimations ?? false,
            showRomanization: settings.showRomanization ?? true,
            ttsRate: settings.ttsRate ?? 0.85,
          },
        });
      }

      // Vocabulary
      if (data["nunchi-vocabulary"]) {
        const items = JSON.parse(data["nunchi-vocabulary"]);
        if (Array.isArray(items)) {
          for (const item of items.slice(0, 5000)) {
            await tx.vocabularyItem.upsert({
              where: {
                userId_korean: { userId: user.id, korean: item.korean },
              },
              create: {
                userId: user.id,
                korean: item.korean ?? "",
                romanization: item.romanization ?? "",
                english: item.english ?? "",
                savedAt: item.savedAt ? new Date(item.savedAt) : new Date(),
                easeFactor: item.easeFactor ?? 2.5,
                interval: item.interval ?? 0,
                repetitions: item.repetitions ?? 0,
                nextReview: item.nextReview
                  ? new Date(item.nextReview)
                  : null,
                lastGrade: item.lastGrade ?? null,
              },
              update: {},
            });
          }
        }
      }

      // Gamification
      if (data["nunchi-gamification"]) {
        const gam = JSON.parse(data["nunchi-gamification"]);
        await tx.gamification.upsert({
          where: { userId: user.id },
          create: {
            userId: user.id,
            totalXP: gam.xp?.totalXP ?? 0,
            currentStreak: gam.streak?.currentStreak ?? 0,
            longestStreak: gam.streak?.longestStreak ?? 0,
            lastPracticeDate: gam.streak?.lastPracticeDate ?? null,
            totalMessages: gam.stats?.totalMessages ?? 0,
            totalFlashcardSessions: gam.stats?.totalFlashcardSessions ?? 0,
            totalTranslations: gam.stats?.totalTranslations ?? 0,
            messagesWithoutTranslate:
              gam.stats?.messagesWithoutTranslate ?? 0,
          },
          update: {
            totalXP: gam.xp?.totalXP ?? 0,
            currentStreak: gam.streak?.currentStreak ?? 0,
            longestStreak: gam.streak?.longestStreak ?? 0,
            lastPracticeDate: gam.streak?.lastPracticeDate ?? null,
            totalMessages: gam.stats?.totalMessages ?? 0,
            totalFlashcardSessions: gam.stats?.totalFlashcardSessions ?? 0,
            totalTranslations: gam.stats?.totalTranslations ?? 0,
            messagesWithoutTranslate:
              gam.stats?.messagesWithoutTranslate ?? 0,
          },
        });
      }

      // Achievements
      if (data["nunchi-achievements"]) {
        const ach = JSON.parse(data["nunchi-achievements"]);
        await tx.userAchievements.upsert({
          where: { userId: user.id },
          create: {
            userId: user.id,
            unlockedIds: ach.unlockedIds ?? [],
            unlockTimestamps: ach.unlockTimestamps ?? {},
          },
          update: {
            unlockedIds: ach.unlockedIds ?? [],
            unlockTimestamps: ach.unlockTimestamps ?? {},
          },
        });
      }

      // Lesson History
      if (data["nunchi-lesson-history"]) {
        const convs = JSON.parse(data["nunchi-lesson-history"]);
        if (Array.isArray(convs)) {
          for (const conv of convs.slice(0, 20)) {
            await tx.conversation.upsert({
              where: { id: conv.id },
              create: {
                id: conv.id,
                userId: user.id,
                savedAt: conv.savedAt ? new Date(conv.savedAt) : new Date(),
                preview: conv.preview ?? "",
                messageCount: conv.messageCount ?? 0,
                messages: conv.messages ?? [],
              },
              update: {},
            });
          }
        }
      }

      // Daily Challenges
      if (data["nunchi-daily-challenges"]) {
        const dc = JSON.parse(data["nunchi-daily-challenges"]);
        await tx.dailyChallengeState.upsert({
          where: { userId: user.id },
          create: {
            userId: user.id,
            date: dc.date ?? "",
            challengeIds: dc.challengeIds ?? [],
            progress: dc.progress ?? {},
            completedIds: dc.completedIds ?? [],
          },
          update: {
            date: dc.date ?? "",
            challengeIds: dc.challengeIds ?? [],
            progress: dc.progress ?? {},
            completedIds: dc.completedIds ?? [],
          },
        });
      }

      // Sound Settings
      const muted = data["nunchi-sound-muted"] === "1";
      const volume = parseInt(data["nunchi-sound-volume"] ?? "80", 10);
      await tx.soundSettings.upsert({
        where: { userId: user.id },
        create: {
          userId: user.id,
          muted,
          volume: isNaN(volume) ? 80 : Math.max(0, Math.min(100, volume)),
        },
        update: {
          muted,
          volume: isNaN(volume) ? 80 : Math.max(0, Math.min(100, volume)),
        },
      });

      // Onboarding
      await tx.userOnboarding.upsert({
        where: { userId: user.id },
        create: {
          userId: user.id,
          tutorialCompleted: data["nunchi-tutorial-completed"] === "1",
          onboarded: data["nunchi-onboarded"] === "1",
        },
        update: {
          tutorialCompleted: data["nunchi-tutorial-completed"] === "1",
          onboarded: data["nunchi-onboarded"] === "1",
        },
      });

      // Visited Topics
      if (data["nunchi-visited-topics"]) {
        const topics = JSON.parse(data["nunchi-visited-topics"]);
        if (Array.isArray(topics)) {
          for (const topicId of topics) {
            await tx.visitedTopic.upsert({
              where: {
                userId_topicId: { userId: user.id, topicId: String(topicId) },
              },
              create: { userId: user.id, topicId: String(topicId) },
              update: {},
            });
          }
        }
      }
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Migration error:", err);
    return NextResponse.json(
      { error: "Migration failed" },
      { status: 500 },
    );
  }
}
