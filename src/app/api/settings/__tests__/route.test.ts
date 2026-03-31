import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth", () => ({
  getAuthenticatedUser: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    userSettings: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
    },
  },
}));

import { GET, PUT } from "../route";
import { getAuthenticatedUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const DEFAULTS = {
  theme: "dark",
  fontScale: 1,
  reduceAnimations: false,
  showRomanization: true,
  ttsRate: 0.85,
};

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
  return new Request("http://localhost:3000/api/settings", init);
}

describe("GET /api/settings", () => {
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

  it("returns defaults when no settings found in DB", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue({ id: "user-1" } as never);
    vi.mocked(prisma.userSettings.findUnique).mockResolvedValue(null);

    const req = createRequest("GET");
    const response = await GET(req);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(DEFAULTS);
  });

  it("returns stored settings from DB", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue({ id: "user-1" } as never);
    vi.mocked(prisma.userSettings.findUnique).mockResolvedValue({
      id: "s1",
      userId: "user-1",
      theme: "light",
      fontScale: 1.5,
      reduceAnimations: true,
      showRomanization: false,
      ttsRate: 1.0,
    } as never);

    const req = createRequest("GET");
    const response = await GET(req);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      theme: "light",
      fontScale: 1.5,
      reduceAnimations: true,
      showRomanization: false,
      ttsRate: 1.0,
    });
  });
});

describe("PUT /api/settings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue(null);

    const req = createRequest("PUT", { theme: "light" });
    const response = await PUT(req);

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Unauthorized" });
  });

  it("upserts settings and returns the result", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue({ id: "user-1" } as never);
    const upserted = {
      id: "s1",
      userId: "user-1",
      theme: "light",
      fontScale: 1.2,
      reduceAnimations: true,
      showRomanization: false,
      ttsRate: 0.9,
    };
    vi.mocked(prisma.userSettings.upsert).mockResolvedValue(upserted as never);

    const req = createRequest("PUT", {
      theme: "light",
      fontScale: 1.2,
      reduceAnimations: true,
      showRomanization: false,
      ttsRate: 0.9,
    });
    const response = await PUT(req);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(upserted);
    expect(prisma.userSettings.upsert).toHaveBeenCalledWith({
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

  it("uses defaults for missing fields in body", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue({ id: "user-1" } as never);
    vi.mocked(prisma.userSettings.upsert).mockResolvedValue({} as never);

    const req = createRequest("PUT", {});
    await PUT(req);

    expect(prisma.userSettings.upsert).toHaveBeenCalledWith({
      where: { userId: "user-1" },
      create: {
        userId: "user-1",
        theme: "dark",
        fontScale: 1,
        reduceAnimations: false,
        showRomanization: true,
        ttsRate: 0.85,
      },
      update: {
        theme: undefined,
        fontScale: undefined,
        reduceAnimations: undefined,
        showRomanization: undefined,
        ttsRate: undefined,
      },
    });
  });
});
