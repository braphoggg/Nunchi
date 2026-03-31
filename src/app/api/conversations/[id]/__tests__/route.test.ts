import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth", () => ({
  getAuthenticatedUser: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    conversation: {
      deleteMany: vi.fn(),
    },
  },
}));

import { DELETE } from "../route";
import { getAuthenticatedUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

describe("DELETE /api/conversations/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue(null);

    const req = new Request("http://localhost:3000/api/conversations/conv-1", {
      method: "DELETE",
    });
    const response = await DELETE(req, { params: Promise.resolve({ id: "conv-1" }) });

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Unauthorized" });
  });

  it("returns 404 when conversation not found", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue({ id: "user-1" });
    vi.mocked(prisma.conversation.deleteMany).mockResolvedValue({ count: 0 } as never);

    const req = new Request("http://localhost:3000/api/conversations/conv-1", {
      method: "DELETE",
    });
    const response = await DELETE(req, { params: Promise.resolve({ id: "conv-1" }) });

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: "Not found" });
  });

  it("deletes conversation and returns success", async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue({ id: "user-1" });
    vi.mocked(prisma.conversation.deleteMany).mockResolvedValue({ count: 1 } as never);

    const req = new Request("http://localhost:3000/api/conversations/conv-1", {
      method: "DELETE",
    });
    const response = await DELETE(req, { params: Promise.resolve({ id: "conv-1" }) });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ success: true });
    expect(prisma.conversation.deleteMany).toHaveBeenCalledWith({
      where: { id: "conv-1", userId: "user-1" },
    });
  });
});
