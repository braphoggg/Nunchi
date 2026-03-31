import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth", () => ({
  getAuthenticatedUser: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    vocabularyItem: {
      count: vi.fn(),
    },
    gamification: {
      findUnique: vi.fn(),
    },
  },
}));

import { GET } from "../route";
import { getAuthenticatedUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

describe("GET /api/user/sync-status", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue(null);

    const req = new Request("http://localhost:3000/api/user/sync-status", {
      method: "GET",
    });
    const response = await GET(req);

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Unauthorized" });
  });

  it("returns hasData: false when no vocab and no XP", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue({ id: "user-1" });
    vi.mocked(prisma.vocabularyItem.count).mockResolvedValue(0);
    vi.mocked(prisma.gamification.findUnique).mockResolvedValue(null);

    const req = new Request("http://localhost:3000/api/user/sync-status", {
      method: "GET",
    });
    const response = await GET(req);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ hasData: false });
  });

  it("returns hasData: true when vocab count > 0", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue({ id: "user-1" });
    vi.mocked(prisma.vocabularyItem.count).mockResolvedValue(5);
    vi.mocked(prisma.gamification.findUnique).mockResolvedValue(null);

    const req = new Request("http://localhost:3000/api/user/sync-status", {
      method: "GET",
    });
    const response = await GET(req);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ hasData: true });
  });

  it("returns hasData: true when gamification totalXP > 0", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue({ id: "user-1" });
    vi.mocked(prisma.vocabularyItem.count).mockResolvedValue(0);
    vi.mocked(prisma.gamification.findUnique).mockResolvedValue({
      userId: "user-1",
      totalXP: 100,
    } as never);

    const req = new Request("http://localhost:3000/api/user/sync-status", {
      method: "GET",
    });
    const response = await GET(req);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ hasData: true });
  });

  it("returns hasData: false when gamification exists but totalXP is 0", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue({ id: "user-1" });
    vi.mocked(prisma.vocabularyItem.count).mockResolvedValue(0);
    vi.mocked(prisma.gamification.findUnique).mockResolvedValue({
      userId: "user-1",
      totalXP: 0,
    } as never);

    const req = new Request("http://localhost:3000/api/user/sync-status", {
      method: "GET",
    });
    const response = await GET(req);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ hasData: false });
  });
});
