import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/supabase/server", () => ({
  createServerClient: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
  },
}));

import { POST } from "../route";
import { createServerClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

const mockGetUser = vi.fn();

function createRequest(
  body: unknown,
  headers?: Record<string, string>,
): Request {
  return new Request("http://localhost:3000/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}

describe("POST /api/auth/register", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(createServerClient).mockReturnValue({
      auth: { getUser: mockGetUser },
    } as never);
  });

  it("returns 401 when no Authorization header", async () => {
    const req = createRequest({ email: "a@b.com" });
    const response = await POST(req);

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Unauthorized" });
  });

  it("returns 401 when Authorization header doesn't start with Bearer", async () => {
    const req = createRequest({ email: "a@b.com" }, { Authorization: "Basic abc" });
    const response = await POST(req);

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Unauthorized" });
  });

  it("returns 401 when Supabase getUser returns error", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: new Error("invalid token"),
    });

    const req = createRequest({ email: "a@b.com" }, { Authorization: "Bearer tok123" });
    const response = await POST(req);

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Invalid token" });
  });

  it("returns 401 when Supabase getUser returns no user", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: null,
    });

    const req = createRequest({ email: "a@b.com" }, { Authorization: "Bearer tok123" });
    const response = await POST(req);

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Invalid token" });
  });

  it("returns existing user id when user already exists in DB", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "supa-1", email: "existing@b.com" } },
      error: null,
    });
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: "db-user-1",
      email: "existing@b.com",
      supabaseAuthId: "supa-1",
    } as never);

    const req = createRequest({ email: "existing@b.com" }, { Authorization: "Bearer tok123" });
    const response = await POST(req);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ id: "db-user-1" });
    expect(prisma.user.create).not.toHaveBeenCalled();
  });

  it("creates new user and returns 201 when user doesn't exist", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "supa-2", email: "supa@b.com" } },
      error: null,
    });
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.user.create).mockResolvedValue({
      id: "db-user-2",
      email: "new@b.com",
      supabaseAuthId: "supa-2",
    } as never);

    const req = createRequest({ email: "new@b.com" }, { Authorization: "Bearer tok123" });
    const response = await POST(req);

    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ id: "db-user-2" });
    expect(prisma.user.create).toHaveBeenCalledWith({
      data: { email: "new@b.com", supabaseAuthId: "supa-2" },
    });
  });

  it("uses user.email as fallback when email not in body", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "supa-3", email: "fallback@supa.com" } },
      error: null,
    });
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.user.create).mockResolvedValue({
      id: "db-user-3",
      email: "fallback@supa.com",
      supabaseAuthId: "supa-3",
    } as never);

    const req = createRequest({}, { Authorization: "Bearer tok123" });
    const response = await POST(req);

    expect(response.status).toBe(201);
    expect(prisma.user.create).toHaveBeenCalledWith({
      data: { email: "fallback@supa.com", supabaseAuthId: "supa-3" },
    });
  });

  it("uses empty string when no email available", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "supa-4", email: undefined } },
      error: null,
    });
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.user.create).mockResolvedValue({
      id: "db-user-4",
      email: "",
      supabaseAuthId: "supa-4",
    } as never);

    const req = createRequest({}, { Authorization: "Bearer tok123" });
    const response = await POST(req);

    expect(response.status).toBe(201);
    expect(prisma.user.create).toHaveBeenCalledWith({
      data: { email: "", supabaseAuthId: "supa-4" },
    });
  });

  it("returns 500 on unexpected errors", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "supa-5", email: "err@b.com" } },
      error: null,
    });
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.user.create).mockRejectedValue(new Error("DB down"));

    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const req = createRequest({ email: "err@b.com" }, { Authorization: "Bearer tok123" });
    const response = await POST(req);

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: "Internal server error" });

    consoleSpy.mockRestore();
  });
});
