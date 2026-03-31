import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth", () => ({
  getAuthenticatedUser: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    vocabularyItem: {
      updateMany: vi.fn(),
      deleteMany: vi.fn(),
    },
  },
}));

import { PUT, DELETE } from "../route";
import { getAuthenticatedUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

describe("PUT /api/vocabulary/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue(null);

    const req = new Request("http://localhost:3000/api/vocabulary/item-1", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ easeFactor: 2.5 }),
    });
    const response = await PUT(req, { params: Promise.resolve({ id: "item-1" }) });

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Unauthorized" });
  });

  it("returns 404 when item not found", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue({ id: "user-1" });
    vi.mocked(prisma.vocabularyItem.updateMany).mockResolvedValue({ count: 0 } as never);

    const req = new Request("http://localhost:3000/api/vocabulary/item-1", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ easeFactor: 3.0 }),
    });
    const response = await PUT(req, { params: Promise.resolve({ id: "item-1" }) });

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: "Not found" });
  });

  it("updates item and returns success", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue({ id: "user-1" });
    vi.mocked(prisma.vocabularyItem.updateMany).mockResolvedValue({ count: 1 } as never);

    const body = {
      easeFactor: 3.0,
      interval: 5,
      repetitions: 2,
      nextReview: "2026-04-05T12:00:00.000Z",
      lastGrade: 4,
      romanization: "annyeong",
      english: "hello",
    };

    const req = new Request("http://localhost:3000/api/vocabulary/item-1", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const response = await PUT(req, { params: Promise.resolve({ id: "item-1" }) });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ success: true });
    expect(prisma.vocabularyItem.updateMany).toHaveBeenCalledWith({
      where: { id: "item-1", userId: "user-1" },
      data: {
        easeFactor: 3.0,
        interval: 5,
        repetitions: 2,
        nextReview: new Date("2026-04-05T12:00:00.000Z"),
        lastGrade: 4,
        romanization: "annyeong",
        english: "hello",
      },
    });
  });
});

describe("DELETE /api/vocabulary/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue(null);

    const req = new Request("http://localhost:3000/api/vocabulary/item-1", {
      method: "DELETE",
    });
    const response = await DELETE(req, { params: Promise.resolve({ id: "item-1" }) });

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Unauthorized" });
  });

  it("returns 404 when item not found", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue({ id: "user-1" });
    vi.mocked(prisma.vocabularyItem.deleteMany).mockResolvedValue({ count: 0 } as never);

    const req = new Request("http://localhost:3000/api/vocabulary/item-1", {
      method: "DELETE",
    });
    const response = await DELETE(req, { params: Promise.resolve({ id: "item-1" }) });

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: "Not found" });
  });

  it("deletes item and returns success", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue({ id: "user-1" });
    vi.mocked(prisma.vocabularyItem.deleteMany).mockResolvedValue({ count: 1 } as never);

    const req = new Request("http://localhost:3000/api/vocabulary/item-1", {
      method: "DELETE",
    });
    const response = await DELETE(req, { params: Promise.resolve({ id: "item-1" }) });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ success: true });
    expect(prisma.vocabularyItem.deleteMany).toHaveBeenCalledWith({
      where: { id: "item-1", userId: "user-1" },
    });
  });
});
