import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth", () => ({
  getAuthenticatedUser: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    gamification: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
    },
  },
}));

import { GET, PUT } from "../route";
import { getAuthenticatedUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function createRequest(
  method: string,
  body?: unknown,
  headers?: Record<string, string>,
): Request {
  const init: RequestInit = {
    method,
    headers: { "Content-Type": "application/json", ...headers },
  };
  if (body !== undefined) {
    init.body = JSON.stringify(body);
  }
  return new Request("http://localhost:3000/api/gamification", init);
}

describe("GET /api/gamification", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue(null);

    const req = createRequest("GET");
    const response = await GET(req);

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Unauthorized" });
  });

  it("returns empty defaults when no gamification record", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue({ id: "user-1" } as never);
    vi.mocked(prisma.gamification.findUnique).mockResolvedValue(null);

    const req = createRequest("GET");
    const response = await GET(req);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      xp: { totalXP: 0, history: [] },
      streak: { currentStreak: 0, longestStreak: 0, lastPracticeDate: "" },
      stats: {
        totalMessages: 0,
        totalFlashcardSessions: 0,
        totalTranslations: 0,
        messagesWithoutTranslate: 0,
      },
    });
  });

  it("returns full gamification data with XP history", async () => {
    const timestamp = new Date("2025-06-15T10:00:00Z");
    vi.mocked(getAuthenticatedUser).mockResolvedValue({ id: "user-1" } as never);
    vi.mocked(prisma.gamification.findUnique).mockResolvedValue({
      id: "gam1",
      userId: "user-1",
      totalXP: 250,
      currentStreak: 5,
      longestStreak: 10,
      lastPracticeDate: "2025-06-15",
      totalMessages: 42,
      totalFlashcardSessions: 8,
      totalTranslations: 15,
      messagesWithoutTranslate: 20,
      xpHistory: [
        { id: "xp1", action: "message_sent", amount: 10, timestamp },
        { id: "xp2", action: "flashcard_review", amount: 5, timestamp },
      ],
    } as never);

    const req = createRequest("GET");
    const response = await GET(req);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      xp: {
        totalXP: 250,
        history: [
          { action: "message_sent", amount: 10, timestamp: timestamp.toISOString() },
          { action: "flashcard_review", amount: 5, timestamp: timestamp.toISOString() },
        ],
      },
      streak: { currentStreak: 5, longestStreak: 10, lastPracticeDate: "2025-06-15" },
      stats: {
        totalMessages: 42,
        totalFlashcardSessions: 8,
        totalTranslations: 15,
        messagesWithoutTranslate: 20,
      },
    });
  });

  it("XP history timestamps are serialized as ISO strings", async () => {
    const ts = new Date("2025-03-20T14:30:00.000Z");
    vi.mocked(getAuthenticatedUser).mockResolvedValue({ id: "user-1" } as never);
    vi.mocked(prisma.gamification.findUnique).mockResolvedValue({
      id: "gam1",
      userId: "user-1",
      totalXP: 10,
      currentStreak: 0,
      longestStreak: 0,
      lastPracticeDate: null,
      totalMessages: 1,
      totalFlashcardSessions: 0,
      totalTranslations: 0,
      messagesWithoutTranslate: 0,
      xpHistory: [{ id: "xp1", action: "chat", amount: 10, timestamp: ts }],
    } as never);

    const req = createRequest("GET");
    const response = await GET(req);
    const data = await response.json();

    expect(data.xp.history[0].timestamp).toBe("2025-03-20T14:30:00.000Z");
    expect(data.streak.lastPracticeDate).toBe("");
  });
});

describe("PUT /api/gamification", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue(null);

    const req = createRequest("PUT", {});
    const response = await PUT(req);

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Unauthorized" });
  });

  it("upserts gamification data", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue({ id: "user-1" } as never);
    vi.mocked(prisma.gamification.upsert).mockResolvedValue({} as never);

    const body = {
      xp: { totalXP: 100 },
      streak: { currentStreak: 3, longestStreak: 7, lastPracticeDate: "2025-06-15" },
      stats: {
        totalMessages: 20,
        totalFlashcardSessions: 5,
        totalTranslations: 10,
        messagesWithoutTranslate: 8,
      },
    };

    const req = createRequest("PUT", body);
    const response = await PUT(req);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ success: true });
    expect(prisma.gamification.upsert).toHaveBeenCalledWith({
      where: { userId: "user-1" },
      create: {
        userId: "user-1",
        totalXP: 100,
        currentStreak: 3,
        longestStreak: 7,
        lastPracticeDate: "2025-06-15",
        totalMessages: 20,
        totalFlashcardSessions: 5,
        totalTranslations: 10,
        messagesWithoutTranslate: 8,
      },
      update: {
        totalXP: 100,
        currentStreak: 3,
        longestStreak: 7,
        lastPracticeDate: "2025-06-15",
        totalMessages: 20,
        totalFlashcardSessions: 5,
        totalTranslations: 10,
        messagesWithoutTranslate: 8,
      },
    });
  });

  it("uses defaults for missing nested fields", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue({ id: "user-1" } as never);
    vi.mocked(prisma.gamification.upsert).mockResolvedValue({} as never);

    const req = createRequest("PUT", {});
    await PUT(req);

    expect(prisma.gamification.upsert).toHaveBeenCalledWith({
      where: { userId: "user-1" },
      create: {
        userId: "user-1",
        totalXP: 0,
        currentStreak: 0,
        longestStreak: 0,
        lastPracticeDate: null,
        totalMessages: 0,
        totalFlashcardSessions: 0,
        totalTranslations: 0,
        messagesWithoutTranslate: 0,
      },
      update: {
        totalXP: undefined,
        currentStreak: undefined,
        longestStreak: undefined,
        lastPracticeDate: undefined,
        totalMessages: undefined,
        totalFlashcardSessions: undefined,
        totalTranslations: undefined,
        messagesWithoutTranslate: undefined,
      },
    });
  });
});
