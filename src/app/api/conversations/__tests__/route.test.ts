import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth", () => ({
  getAuthenticatedUser: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    conversation: {
      findMany: vi.fn(),
      create: vi.fn(),
      deleteMany: vi.fn(),
    },
  },
}));

import { GET, POST } from "../route";
import { getAuthenticatedUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

describe("GET /api/conversations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue(null);

    const req = new Request("http://localhost:3000/api/conversations", {
      method: "GET",
    });
    const response = await GET(req);

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Unauthorized" });
  });

  it("returns conversations with dates as ISO strings", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue({ id: "user-1" });

    const savedAt = new Date("2026-03-20T10:00:00.000Z");

    vi.mocked(prisma.conversation.findMany).mockResolvedValue([
      {
        id: "conv-1",
        savedAt,
        preview: "Hello there",
        messageCount: 5,
        messages: [{ role: "user", content: "Hello" }],
      },
    ] as never);

    const req = new Request("http://localhost:3000/api/conversations", {
      method: "GET",
    });
    const response = await GET(req);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual([
      {
        id: "conv-1",
        savedAt: "2026-03-20T10:00:00.000Z",
        preview: "Hello there",
        messageCount: 5,
        messages: [{ role: "user", content: "Hello" }],
      },
    ]);
  });

  it("returns empty array when no conversations", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue({ id: "user-1" });
    vi.mocked(prisma.conversation.findMany).mockResolvedValue([]);

    const req = new Request("http://localhost:3000/api/conversations", {
      method: "GET",
    });
    const response = await GET(req);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual([]);
  });
});

describe("POST /api/conversations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue(null);

    const req = new Request("http://localhost:3000/api/conversations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: "conv-1" }),
    });
    const response = await POST(req);

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Unauthorized" });
  });

  it("creates conversation and returns id with status 201", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue({ id: "user-1" });
    vi.mocked(prisma.conversation.create).mockResolvedValue({
      id: "conv-1",
    } as never);
    vi.mocked(prisma.conversation.findMany).mockResolvedValue(
      Array.from({ length: 5 }, (_, i) => ({ id: `conv-${i}` })) as never,
    );

    const req = new Request("http://localhost:3000/api/conversations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: "conv-1",
        preview: "Test",
        messageCount: 2,
        messages: [],
      }),
    });
    const response = await POST(req);

    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ id: "conv-1" });
  });

  it("enforces max 20 conversations by deleting oldest", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue({ id: "user-1" });
    vi.mocked(prisma.conversation.create).mockResolvedValue({
      id: "conv-new",
    } as never);

    const convIds = Array.from({ length: 22 }, (_, i) => ({ id: `conv-${i}` }));
    vi.mocked(prisma.conversation.findMany).mockResolvedValue(convIds as never);
    vi.mocked(prisma.conversation.deleteMany).mockResolvedValue({ count: 2 } as never);

    const req = new Request("http://localhost:3000/api/conversations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: "conv-new",
        preview: "New",
        messageCount: 1,
        messages: [],
      }),
    });
    const response = await POST(req);

    expect(response.status).toBe(201);
    expect(prisma.conversation.deleteMany).toHaveBeenCalledWith({
      where: { id: { in: ["conv-20", "conv-21"] } },
    });
  });

  it("does not delete when <= 20 conversations", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue({ id: "user-1" });
    vi.mocked(prisma.conversation.create).mockResolvedValue({
      id: "conv-new",
    } as never);

    const convIds = Array.from({ length: 20 }, (_, i) => ({ id: `conv-${i}` }));
    vi.mocked(prisma.conversation.findMany).mockResolvedValue(convIds as never);

    const req = new Request("http://localhost:3000/api/conversations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: "conv-new",
        preview: "New",
        messageCount: 1,
        messages: [],
      }),
    });
    const response = await POST(req);

    expect(response.status).toBe(201);
    expect(prisma.conversation.deleteMany).not.toHaveBeenCalled();
  });
});
