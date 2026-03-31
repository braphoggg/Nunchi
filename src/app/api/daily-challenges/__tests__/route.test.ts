import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth", () => ({
  getAuthenticatedUser: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    dailyChallengeState: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
    },
  },
}));

import { GET, PUT } from "../route";
import { getAuthenticatedUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

describe("GET /api/daily-challenges", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue(null);

    const req = new Request("http://localhost:3000/api/daily-challenges", {
      method: "GET",
    });
    const response = await GET(req);

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Unauthorized" });
  });

  it("returns empty defaults when no record", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue({ id: "user-1" });
    vi.mocked(prisma.dailyChallengeState.findUnique).mockResolvedValue(null);

    const req = new Request("http://localhost:3000/api/daily-challenges", {
      method: "GET",
    });
    const response = await GET(req);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      date: "",
      challengeIds: [],
      progress: {},
      completedIds: [],
    });
  });

  it("returns stored daily challenge state", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue({ id: "user-1" });
    vi.mocked(prisma.dailyChallengeState.findUnique).mockResolvedValue({
      userId: "user-1",
      date: "2026-03-31",
      challengeIds: ["c1", "c2"],
      progress: { c1: 50 },
      completedIds: ["c1"],
    } as never);

    const req = new Request("http://localhost:3000/api/daily-challenges", {
      method: "GET",
    });
    const response = await GET(req);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      date: "2026-03-31",
      challengeIds: ["c1", "c2"],
      progress: { c1: 50 },
      completedIds: ["c1"],
    });
  });
});

describe("PUT /api/daily-challenges", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue(null);

    const req = new Request("http://localhost:3000/api/daily-challenges", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date: "2026-03-31" }),
    });
    const response = await PUT(req);

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Unauthorized" });
  });

  it("upserts daily challenge state", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue({ id: "user-1" });
    vi.mocked(prisma.dailyChallengeState.upsert).mockResolvedValue({} as never);

    const body = {
      date: "2026-03-31",
      challengeIds: ["c1", "c2"],
      progress: { c1: 100 },
      completedIds: ["c1"],
    };

    const req = new Request("http://localhost:3000/api/daily-challenges", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const response = await PUT(req);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ success: true });
    expect(prisma.dailyChallengeState.upsert).toHaveBeenCalledWith({
      where: { userId: "user-1" },
      create: {
        userId: "user-1",
        date: "2026-03-31",
        challengeIds: ["c1", "c2"],
        progress: { c1: 100 },
        completedIds: ["c1"],
      },
      update: {
        date: "2026-03-31",
        challengeIds: ["c1", "c2"],
        progress: { c1: 100 },
        completedIds: ["c1"],
      },
    });
  });
});
