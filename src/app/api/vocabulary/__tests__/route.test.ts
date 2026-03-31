import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth", () => ({
  getAuthenticatedUser: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    vocabularyItem: {
      findMany: vi.fn(),
      upsert: vi.fn(),
    },
  },
}));

import { GET, POST } from "../route";
import { getAuthenticatedUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

describe("GET /api/vocabulary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue(null);

    const req = new Request("http://localhost:3000/api/vocabulary", {
      method: "GET",
    });
    const response = await GET(req);

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Unauthorized" });
  });

  it("returns vocabulary items with dates serialized as ISO strings", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue({ id: "user-1" });

    const savedAt = new Date("2026-03-01T12:00:00.000Z");
    const nextReview = new Date("2026-03-15T12:00:00.000Z");

    vi.mocked(prisma.vocabularyItem.findMany).mockResolvedValue([
      {
        id: "vocab-1",
        korean: "hello",
        romanization: "annyeong",
        english: "hello",
        savedAt,
        easeFactor: 2.5,
        interval: 1,
        repetitions: 1,
        nextReview,
        lastGrade: 3,
      },
    ] as never);

    const req = new Request("http://localhost:3000/api/vocabulary", {
      method: "GET",
    });
    const response = await GET(req);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual([
      {
        id: "vocab-1",
        korean: "hello",
        romanization: "annyeong",
        english: "hello",
        savedAt: "2026-03-01T12:00:00.000Z",
        easeFactor: 2.5,
        interval: 1,
        repetitions: 1,
        nextReview: "2026-03-15T12:00:00.000Z",
        lastGrade: 3,
      },
    ]);
  });

  it("returns empty array when no items", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue({ id: "user-1" });
    vi.mocked(prisma.vocabularyItem.findMany).mockResolvedValue([]);

    const req = new Request("http://localhost:3000/api/vocabulary", {
      method: "GET",
    });
    const response = await GET(req);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual([]);
  });
});

describe("POST /api/vocabulary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue(null);

    const req = new Request("http://localhost:3000/api/vocabulary", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: [] }),
    });
    const response = await POST(req);

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Unauthorized" });
  });

  it("returns 400 when items is not an array", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue({ id: "user-1" });

    const req = new Request("http://localhost:3000/api/vocabulary", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: "not-an-array" }),
    });
    const response = await POST(req);

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "items must be an array" });
  });

  it("creates vocabulary items via upsert", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue({ id: "user-1" });
    vi.mocked(prisma.vocabularyItem.upsert).mockResolvedValue({} as never);

    const items = [
      {
        korean: "hello",
        romanization: "annyeong",
        english: "hello",
        savedAt: "2026-03-01T12:00:00.000Z",
        easeFactor: 2.5,
        interval: 1,
        repetitions: 1,
        nextReview: "2026-03-15T12:00:00.000Z",
        lastGrade: 3,
      },
    ];

    const req = new Request("http://localhost:3000/api/vocabulary", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items }),
    });
    const response = await POST(req);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ count: 1 });
    expect(prisma.vocabularyItem.upsert).toHaveBeenCalledTimes(1);
    expect(prisma.vocabularyItem.upsert).toHaveBeenCalledWith({
      where: { userId_korean: { userId: "user-1", korean: "hello" } },
      create: {
        userId: "user-1",
        korean: "hello",
        romanization: "annyeong",
        english: "hello",
        savedAt: new Date("2026-03-01T12:00:00.000Z"),
        easeFactor: 2.5,
        interval: 1,
        repetitions: 1,
        nextReview: new Date("2026-03-15T12:00:00.000Z"),
        lastGrade: 3,
      },
      update: {
        romanization: "annyeong",
        english: "hello",
        easeFactor: 2.5,
        interval: 1,
        repetitions: 1,
        nextReview: new Date("2026-03-15T12:00:00.000Z"),
        lastGrade: 3,
      },
    });
  });

  it("limits to 100 items", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue({ id: "user-1" });
    vi.mocked(prisma.vocabularyItem.upsert).mockResolvedValue({} as never);

    const items = Array.from({ length: 150 }, (_, i) => ({
      korean: `word-${i}`,
      romanization: `rom-${i}`,
      english: `eng-${i}`,
    }));

    const req = new Request("http://localhost:3000/api/vocabulary", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items }),
    });
    const response = await POST(req);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ count: 100 });
    expect(prisma.vocabularyItem.upsert).toHaveBeenCalledTimes(100);
  });

  it("skips items that throw on upsert", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue({ id: "user-1" });
    vi.mocked(prisma.vocabularyItem.upsert)
      .mockResolvedValueOnce({} as never)
      .mockRejectedValueOnce(new Error("duplicate"))
      .mockResolvedValueOnce({} as never);

    const items = [
      { korean: "a", romanization: "a", english: "a" },
      { korean: "b", romanization: "b", english: "b" },
      { korean: "c", romanization: "c", english: "c" },
    ];

    const req = new Request("http://localhost:3000/api/vocabulary", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items }),
    });
    const response = await POST(req);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ count: 2 });
    expect(prisma.vocabularyItem.upsert).toHaveBeenCalledTimes(3);
  });

  it("returns count of created items", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue({ id: "user-1" });
    vi.mocked(prisma.vocabularyItem.upsert).mockResolvedValue({} as never);

    const items = [
      { korean: "a", romanization: "a", english: "a" },
      { korean: "b", romanization: "b", english: "b" },
    ];

    const req = new Request("http://localhost:3000/api/vocabulary", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items }),
    });
    const response = await POST(req);

    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json).toEqual({ count: 2 });
  });
});
