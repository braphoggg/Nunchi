import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth", () => ({
  getAuthenticatedUser: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    gamification: {
      upsert: vi.fn(),
      update: vi.fn(),
    },
    xPEvent: {
      create: vi.fn(),
    },
  },
}));

import { POST } from "../route";
import { getAuthenticatedUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function createRequest(body: unknown): Request {
  return new Request("http://localhost:3000/api/gamification/xp-event", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/gamification/xp-event", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue(null);

    const req = createRequest({ action: "message_sent", amount: 10 });
    const response = await POST(req);

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Unauthorized" });
  });

  it("returns 400 when action is missing", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue({ id: "user-1" } as never);

    const req = createRequest({ amount: 10 });
    const response = await POST(req);

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "Invalid XP event" });
  });

  it("returns 400 when amount is not a number", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue({ id: "user-1" } as never);

    const req = createRequest({ action: "message_sent", amount: "ten" });
    const response = await POST(req);

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "Invalid XP event" });
  });

  it("creates XP event and increments totalXP", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue({ id: "user-1" } as never);
    vi.mocked(prisma.gamification.upsert).mockResolvedValue({
      id: "gam-1",
      userId: "user-1",
    } as never);
    vi.mocked(prisma.xPEvent.create).mockResolvedValue({} as never);
    vi.mocked(prisma.gamification.update).mockResolvedValue({} as never);

    const req = createRequest({ action: "message_sent", amount: 10 });
    const response = await POST(req);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ success: true });

    expect(prisma.gamification.upsert).toHaveBeenCalledWith({
      where: { userId: "user-1" },
      create: { userId: "user-1" },
      update: {},
    });

    expect(prisma.xPEvent.create).toHaveBeenCalledWith({
      data: {
        gamificationId: "gam-1",
        action: "message_sent",
        amount: 10,
      },
    });

    expect(prisma.gamification.update).toHaveBeenCalledWith({
      where: { userId: "user-1" },
      data: { totalXP: { increment: 10 } },
    });
  });

  it("creates gamification record if it doesn't exist (upsert)", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue({ id: "user-1" } as never);
    vi.mocked(prisma.gamification.upsert).mockResolvedValue({
      id: "gam-new",
      userId: "user-1",
    } as never);
    vi.mocked(prisma.xPEvent.create).mockResolvedValue({} as never);
    vi.mocked(prisma.gamification.update).mockResolvedValue({} as never);

    const req = createRequest({ action: "flashcard_review", amount: 5 });
    const response = await POST(req);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ success: true });

    // Verify upsert creates a new record with just userId when it doesn't exist
    expect(prisma.gamification.upsert).toHaveBeenCalledWith({
      where: { userId: "user-1" },
      create: { userId: "user-1" },
      update: {},
    });

    expect(prisma.xPEvent.create).toHaveBeenCalledWith({
      data: {
        gamificationId: "gam-new",
        action: "flashcard_review",
        amount: 5,
      },
    });

    expect(prisma.gamification.update).toHaveBeenCalledWith({
      where: { userId: "user-1" },
      data: { totalXP: { increment: 5 } },
    });
  });
});
