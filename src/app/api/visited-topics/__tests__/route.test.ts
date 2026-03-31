import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth", () => ({
  getAuthenticatedUser: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    visitedTopic: {
      findMany: vi.fn(),
      upsert: vi.fn(),
    },
  },
}));

import { GET, POST } from "../route";
import { getAuthenticatedUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

describe("GET /api/visited-topics", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue(null);

    const req = new Request("http://localhost:3000/api/visited-topics", {
      method: "GET",
    });
    const response = await GET(req);

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Unauthorized" });
  });

  it("returns array of topic IDs", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue({ id: "user-1" });
    vi.mocked(prisma.visitedTopic.findMany).mockResolvedValue([
      { topicId: "topic-1" },
      { topicId: "topic-2" },
      { topicId: "topic-3" },
    ] as never);

    const req = new Request("http://localhost:3000/api/visited-topics", {
      method: "GET",
    });
    const response = await GET(req);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(["topic-1", "topic-2", "topic-3"]);
  });
});

describe("POST /api/visited-topics", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue(null);

    const req = new Request("http://localhost:3000/api/visited-topics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ topicId: "topic-1" }),
    });
    const response = await POST(req);

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Unauthorized" });
  });

  it("returns 400 when topicId is missing", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue({ id: "user-1" });

    const req = new Request("http://localhost:3000/api/visited-topics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    const response = await POST(req);

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "Invalid topicId" });
  });

  it("returns 400 when topicId is not a string", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue({ id: "user-1" });

    const req = new Request("http://localhost:3000/api/visited-topics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ topicId: 123 }),
    });
    const response = await POST(req);

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "Invalid topicId" });
  });

  it("upserts visited topic", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue({ id: "user-1" });
    vi.mocked(prisma.visitedTopic.upsert).mockResolvedValue({} as never);

    const req = new Request("http://localhost:3000/api/visited-topics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ topicId: "topic-1" }),
    });
    const response = await POST(req);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ success: true });
    expect(prisma.visitedTopic.upsert).toHaveBeenCalledWith({
      where: { userId_topicId: { userId: "user-1", topicId: "topic-1" } },
      create: { userId: "user-1", topicId: "topic-1" },
      update: {},
    });
  });
});
