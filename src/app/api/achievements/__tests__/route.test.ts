import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth", () => ({
  getAuthenticatedUser: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    userAchievements: {
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
  return new Request("http://localhost:3000/api/achievements", init);
}

describe("GET /api/achievements", () => {
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

  it("returns empty defaults when no record", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue({ id: "user-1" } as never);
    vi.mocked(prisma.userAchievements.findUnique).mockResolvedValue(null);

    const req = createRequest("GET");
    const response = await GET(req);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      unlockedIds: [],
      unlockTimestamps: {},
    });
  });

  it("returns stored achievements", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue({ id: "user-1" } as never);
    vi.mocked(prisma.userAchievements.findUnique).mockResolvedValue({
      id: "ach1",
      userId: "user-1",
      unlockedIds: ["first-chat", "streak-3"],
      unlockTimestamps: { "first-chat": "2025-01-01", "streak-3": "2025-01-03" },
    } as never);

    const req = createRequest("GET");
    const response = await GET(req);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      unlockedIds: ["first-chat", "streak-3"],
      unlockTimestamps: { "first-chat": "2025-01-01", "streak-3": "2025-01-03" },
    });
  });
});

describe("PUT /api/achievements", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue(null);

    const req = createRequest("PUT", { unlockedIds: ["a"] });
    const response = await PUT(req);

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Unauthorized" });
  });

  it("upserts achievement data", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue({ id: "user-1" } as never);
    vi.mocked(prisma.userAchievements.upsert).mockResolvedValue({} as never);

    const body = {
      unlockedIds: ["first-chat", "streak-3"],
      unlockTimestamps: { "first-chat": "2025-01-01", "streak-3": "2025-01-03" },
    };

    const req = createRequest("PUT", body);
    const response = await PUT(req);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ success: true });
    expect(prisma.userAchievements.upsert).toHaveBeenCalledWith({
      where: { userId: "user-1" },
      create: {
        userId: "user-1",
        unlockedIds: ["first-chat", "streak-3"],
        unlockTimestamps: { "first-chat": "2025-01-01", "streak-3": "2025-01-03" },
      },
      update: {
        unlockedIds: ["first-chat", "streak-3"],
        unlockTimestamps: { "first-chat": "2025-01-01", "streak-3": "2025-01-03" },
      },
    });
  });

  it("handles missing fields with defaults", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue({ id: "user-1" } as never);
    vi.mocked(prisma.userAchievements.upsert).mockResolvedValue({} as never);

    const req = createRequest("PUT", {});
    await PUT(req);

    expect(prisma.userAchievements.upsert).toHaveBeenCalledWith({
      where: { userId: "user-1" },
      create: {
        userId: "user-1",
        unlockedIds: [],
        unlockTimestamps: {},
      },
      update: {
        unlockedIds: undefined,
        unlockTimestamps: undefined,
      },
    });
  });
});
