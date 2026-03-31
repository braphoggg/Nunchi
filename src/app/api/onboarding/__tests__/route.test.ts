import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth", () => ({
  getAuthenticatedUser: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    userOnboarding: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
    },
  },
}));

import { GET, PUT } from "../route";
import { getAuthenticatedUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

describe("GET /api/onboarding", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue(null);

    const req = new Request("http://localhost:3000/api/onboarding", {
      method: "GET",
    });
    const response = await GET(req);

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Unauthorized" });
  });

  it("returns defaults when no record", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue({ id: "user-1" });
    vi.mocked(prisma.userOnboarding.findUnique).mockResolvedValue(null);

    const req = new Request("http://localhost:3000/api/onboarding", {
      method: "GET",
    });
    const response = await GET(req);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      tutorialCompleted: false,
      onboarded: false,
    });
  });

  it("returns stored onboarding state", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue({ id: "user-1" });
    vi.mocked(prisma.userOnboarding.findUnique).mockResolvedValue({
      userId: "user-1",
      tutorialCompleted: true,
      onboarded: true,
    } as never);

    const req = new Request("http://localhost:3000/api/onboarding", {
      method: "GET",
    });
    const response = await GET(req);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      tutorialCompleted: true,
      onboarded: true,
    });
  });
});

describe("PUT /api/onboarding", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue(null);

    const req = new Request("http://localhost:3000/api/onboarding", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tutorialCompleted: true }),
    });
    const response = await PUT(req);

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Unauthorized" });
  });

  it("upserts onboarding state", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue({ id: "user-1" });
    vi.mocked(prisma.userOnboarding.upsert).mockResolvedValue({} as never);

    const body = {
      tutorialCompleted: true,
      onboarded: true,
    };

    const req = new Request("http://localhost:3000/api/onboarding", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const response = await PUT(req);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ success: true });
    expect(prisma.userOnboarding.upsert).toHaveBeenCalledWith({
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
});
