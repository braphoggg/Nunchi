import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth", () => ({
  getAuthenticatedUser: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    soundSettings: {
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
  return new Request("http://localhost:3000/api/sound-settings", init);
}

describe("GET /api/sound-settings", () => {
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

  it("returns defaults (muted: false, volume: 80) when no record", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue({ id: "user-1" } as never);
    vi.mocked(prisma.soundSettings.findUnique).mockResolvedValue(null);

    const req = createRequest("GET");
    const response = await GET(req);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ muted: false, volume: 80 });
  });

  it("returns stored sound settings", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue({ id: "user-1" } as never);
    vi.mocked(prisma.soundSettings.findUnique).mockResolvedValue({
      id: "ss1",
      userId: "user-1",
      muted: true,
      volume: 50,
    } as never);

    const req = createRequest("GET");
    const response = await GET(req);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ muted: true, volume: 50 });
  });
});

describe("PUT /api/sound-settings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue(null);

    const req = createRequest("PUT", { muted: true, volume: 50 });
    const response = await PUT(req);

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Unauthorized" });
  });

  it("clamps volume to 0-100 range", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue({ id: "user-1" } as never);
    vi.mocked(prisma.soundSettings.upsert).mockResolvedValue({} as never);

    const req = createRequest("PUT", { muted: false, volume: 60 });
    await PUT(req);

    expect(prisma.soundSettings.upsert).toHaveBeenCalledWith({
      where: { userId: "user-1" },
      create: { userId: "user-1", muted: false, volume: 60 },
      update: { muted: false, volume: 60 },
    });
  });

  it("handles volume > 100 (clamps to 100)", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue({ id: "user-1" } as never);
    vi.mocked(prisma.soundSettings.upsert).mockResolvedValue({} as never);

    const req = createRequest("PUT", { muted: false, volume: 200 });
    await PUT(req);

    expect(prisma.soundSettings.upsert).toHaveBeenCalledWith({
      where: { userId: "user-1" },
      create: { userId: "user-1", muted: false, volume: 100 },
      update: { muted: false, volume: 100 },
    });
  });

  it("handles volume < 0 (clamps to 0)", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue({ id: "user-1" } as never);
    vi.mocked(prisma.soundSettings.upsert).mockResolvedValue({} as never);

    const req = createRequest("PUT", { muted: false, volume: -50 });
    await PUT(req);

    expect(prisma.soundSettings.upsert).toHaveBeenCalledWith({
      where: { userId: "user-1" },
      create: { userId: "user-1", muted: false, volume: 0 },
      update: { muted: false, volume: 0 },
    });
  });

  it("uses defaults when fields missing", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue({ id: "user-1" } as never);
    vi.mocked(prisma.soundSettings.upsert).mockResolvedValue({} as never);

    const req = createRequest("PUT", {});
    const response = await PUT(req);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ success: true });
    expect(prisma.soundSettings.upsert).toHaveBeenCalledWith({
      where: { userId: "user-1" },
      create: { userId: "user-1", muted: false, volume: 80 },
      update: { muted: undefined, volume: 80 },
    });
  });
});
