import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth", () => ({
  getAuthenticatedUser: vi.fn(),
}));

const mockTx = {
  userSettings: { upsert: vi.fn() },
  vocabularyItem: { upsert: vi.fn() },
  gamification: { upsert: vi.fn() },
  userAchievements: { upsert: vi.fn() },
  conversation: { upsert: vi.fn() },
  dailyChallengeState: { upsert: vi.fn() },
  soundSettings: { upsert: vi.fn() },
  userOnboarding: { upsert: vi.fn() },
  visitedTopic: { upsert: vi.fn() },
};

vi.mock("@/lib/prisma", () => ({
  prisma: {
    $transaction: vi.fn(),
  },
}));

import { POST } from "../route";
import { getAuthenticatedUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function createRequest(body: unknown): Request {
  return new Request("http://localhost:3000/api/user/migrate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function setupTransaction(): void {
  vi.mocked(prisma.$transaction).mockImplementation(async (cb: unknown) => {
    return (cb as (tx: typeof mockTx) => Promise<void>)(mockTx);
  });
}

describe("POST /api/user/migrate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    for (const model of Object.values(mockTx)) {
      model.upsert.mockResolvedValue({});
    }
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue(null);

    const req = createRequest({ data: {} });
    const response = await POST(req);

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Unauthorized" });
  });

  it("migrates settings from localStorage format", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue({ id: "user-1" });
    setupTransaction();

    const settings = {
      theme: "light",
      fontScale: 1.2,
      reduceAnimations: true,
      showRomanization: false,
      ttsRate: 0.9,
    };

    const req = createRequest({
      data: {
        "nunchi-settings": JSON.stringify(settings),
        "nunchi-sound-muted": "0",
        "nunchi-sound-volume": "80",
      },
    });
    const response = await POST(req);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ success: true });
    expect(mockTx.userSettings.upsert).toHaveBeenCalledWith({
      where: { userId: "user-1" },
      create: {
        userId: "user-1",
        theme: "light",
        fontScale: 1.2,
        reduceAnimations: true,
        showRomanization: false,
        ttsRate: 0.9,
      },
      update: {
        theme: "light",
        fontScale: 1.2,
        reduceAnimations: true,
        showRomanization: false,
        ttsRate: 0.9,
      },
    });
  });

  it("migrates vocabulary items limited to 5000", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue({ id: "user-1" });
    setupTransaction();

    const items = Array.from({ length: 5002 }, (_, i) => ({
      korean: `word-${i}`,
      romanization: `rom-${i}`,
      english: `eng-${i}`,
    }));

    const req = createRequest({
      data: {
        "nunchi-vocabulary": JSON.stringify(items),
        "nunchi-sound-muted": "0",
        "nunchi-sound-volume": "80",
      },
    });
    const response = await POST(req);

    expect(response.status).toBe(200);
    expect(mockTx.vocabularyItem.upsert).toHaveBeenCalledTimes(5000);
  });

  it("migrates gamification data", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue({ id: "user-1" });
    setupTransaction();

    const gam = {
      xp: { totalXP: 500 },
      streak: { currentStreak: 3, longestStreak: 10, lastPracticeDate: "2026-03-30" },
      stats: {
        totalMessages: 100,
        totalFlashcardSessions: 20,
        totalTranslations: 50,
        messagesWithoutTranslate: 30,
      },
    };

    const req = createRequest({
      data: {
        "nunchi-gamification": JSON.stringify(gam),
        "nunchi-sound-muted": "0",
        "nunchi-sound-volume": "80",
      },
    });
    const response = await POST(req);

    expect(response.status).toBe(200);
    expect(mockTx.gamification.upsert).toHaveBeenCalledWith({
      where: { userId: "user-1" },
      create: {
        userId: "user-1",
        totalXP: 500,
        currentStreak: 3,
        longestStreak: 10,
        lastPracticeDate: "2026-03-30",
        totalMessages: 100,
        totalFlashcardSessions: 20,
        totalTranslations: 50,
        messagesWithoutTranslate: 30,
      },
      update: {
        totalXP: 500,
        currentStreak: 3,
        longestStreak: 10,
        lastPracticeDate: "2026-03-30",
        totalMessages: 100,
        totalFlashcardSessions: 20,
        totalTranslations: 50,
        messagesWithoutTranslate: 30,
      },
    });
  });

  it("migrates achievements data", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue({ id: "user-1" });
    setupTransaction();

    const ach = {
      unlockedIds: ["ach-1", "ach-2"],
      unlockTimestamps: { "ach-1": 1000, "ach-2": 2000 },
    };

    const req = createRequest({
      data: {
        "nunchi-achievements": JSON.stringify(ach),
        "nunchi-sound-muted": "0",
        "nunchi-sound-volume": "80",
      },
    });
    const response = await POST(req);

    expect(response.status).toBe(200);
    expect(mockTx.userAchievements.upsert).toHaveBeenCalledWith({
      where: { userId: "user-1" },
      create: {
        userId: "user-1",
        unlockedIds: ["ach-1", "ach-2"],
        unlockTimestamps: { "ach-1": 1000, "ach-2": 2000 },
      },
      update: {
        unlockedIds: ["ach-1", "ach-2"],
        unlockTimestamps: { "ach-1": 1000, "ach-2": 2000 },
      },
    });
  });

  it("migrates lesson history limited to 20", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue({ id: "user-1" });
    setupTransaction();

    const convs = Array.from({ length: 25 }, (_, i) => ({
      id: `conv-${i}`,
      savedAt: "2026-03-01T00:00:00.000Z",
      preview: `preview-${i}`,
      messageCount: i,
      messages: [],
    }));

    const req = createRequest({
      data: {
        "nunchi-lesson-history": JSON.stringify(convs),
        "nunchi-sound-muted": "0",
        "nunchi-sound-volume": "80",
      },
    });
    const response = await POST(req);

    expect(response.status).toBe(200);
    expect(mockTx.conversation.upsert).toHaveBeenCalledTimes(20);
  });

  it("migrates daily challenges", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue({ id: "user-1" });
    setupTransaction();

    const dc = {
      date: "2026-03-31",
      challengeIds: ["c1"],
      progress: { c1: 75 },
      completedIds: [],
    };

    const req = createRequest({
      data: {
        "nunchi-daily-challenges": JSON.stringify(dc),
        "nunchi-sound-muted": "0",
        "nunchi-sound-volume": "80",
      },
    });
    const response = await POST(req);

    expect(response.status).toBe(200);
    expect(mockTx.dailyChallengeState.upsert).toHaveBeenCalledWith({
      where: { userId: "user-1" },
      create: {
        userId: "user-1",
        date: "2026-03-31",
        challengeIds: ["c1"],
        progress: { c1: 75 },
        completedIds: [],
      },
      update: {
        date: "2026-03-31",
        challengeIds: ["c1"],
        progress: { c1: 75 },
        completedIds: [],
      },
    });
  });

  it("migrates sound settings parsing muted and volume", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue({ id: "user-1" });
    setupTransaction();

    const req = createRequest({
      data: {
        "nunchi-sound-muted": "1",
        "nunchi-sound-volume": "60",
      },
    });
    const response = await POST(req);

    expect(response.status).toBe(200);
    expect(mockTx.soundSettings.upsert).toHaveBeenCalledWith({
      where: { userId: "user-1" },
      create: {
        userId: "user-1",
        muted: true,
        volume: 60,
      },
      update: {
        muted: true,
        volume: 60,
      },
    });
  });

  it("migrates onboarding flags", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue({ id: "user-1" });
    setupTransaction();

    const req = createRequest({
      data: {
        "nunchi-tutorial-completed": "1",
        "nunchi-onboarded": "1",
        "nunchi-sound-muted": "0",
        "nunchi-sound-volume": "80",
      },
    });
    const response = await POST(req);

    expect(response.status).toBe(200);
    expect(mockTx.userOnboarding.upsert).toHaveBeenCalledWith({
      where: { userId: "user-1" },
      create: {
        userId: "user-1",
        tutorialCompleted: true,
        onboarded: true,
      },
      update: {
        tutorialCompleted: true,
        onboarded: true,
      },
    });
  });

  it("migrates visited topics", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue({ id: "user-1" });
    setupTransaction();

    const topics = ["topic-1", "topic-2"];

    const req = createRequest({
      data: {
        "nunchi-visited-topics": JSON.stringify(topics),
        "nunchi-sound-muted": "0",
        "nunchi-sound-volume": "80",
      },
    });
    const response = await POST(req);

    expect(response.status).toBe(200);
    expect(mockTx.visitedTopic.upsert).toHaveBeenCalledTimes(2);
    expect(mockTx.visitedTopic.upsert).toHaveBeenCalledWith({
      where: { userId_topicId: { userId: "user-1", topicId: "topic-1" } },
      create: { userId: "user-1", topicId: "topic-1" },
      update: {},
    });
    expect(mockTx.visitedTopic.upsert).toHaveBeenCalledWith({
      where: { userId_topicId: { userId: "user-1", topicId: "topic-2" } },
      create: { userId: "user-1", topicId: "topic-2" },
      update: {},
    });
  });

  it("returns 500 on transaction failure", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue({ id: "user-1" });
    vi.mocked(prisma.$transaction).mockRejectedValue(new Error("DB error"));

    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const req = createRequest({
      data: {
        "nunchi-sound-muted": "0",
        "nunchi-sound-volume": "80",
      },
    });
    const response = await POST(req);

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: "Migration failed" });

    consoleSpy.mockRestore();
  });

  it("handles missing/empty data keys gracefully", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue({ id: "user-1" });
    setupTransaction();

    const req = createRequest({ data: {} });
    const response = await POST(req);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ success: true });

    expect(mockTx.userSettings.upsert).not.toHaveBeenCalled();
    expect(mockTx.vocabularyItem.upsert).not.toHaveBeenCalled();
    expect(mockTx.gamification.upsert).not.toHaveBeenCalled();
    expect(mockTx.userAchievements.upsert).not.toHaveBeenCalled();
    expect(mockTx.conversation.upsert).not.toHaveBeenCalled();
    expect(mockTx.dailyChallengeState.upsert).not.toHaveBeenCalled();
    expect(mockTx.visitedTopic.upsert).not.toHaveBeenCalled();

    // Sound settings and onboarding are always upserted
    expect(mockTx.soundSettings.upsert).toHaveBeenCalled();
    expect(mockTx.userOnboarding.upsert).toHaveBeenCalled();
  });
});
