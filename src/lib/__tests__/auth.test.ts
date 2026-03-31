import { describe, it, expect, vi, beforeEach } from "vitest";
import { createServerClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

// ─── mocks ────────────────────────────────────────────────────────

const mockGetUser = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createServerClient: vi.fn(() => ({
    auth: { getUser: mockGetUser },
  })),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: { user: { findUnique: vi.fn() } },
}));

// ─── helpers ──────────────────────────────────────────────────────

function makeRequest(headers: Record<string, string> = {}): Request {
  return new Request("http://localhost/api/test", { headers });
}

const fakeSupabaseUser = { id: "supabase-uid-123", email: "test@example.com" };
const fakeDbUser = {
  id: "db-user-1",
  supabaseAuthId: "supabase-uid-123",
  email: "test@example.com",
};

// ─── setup ────────────────────────────────────────────────────────

let getAuthenticatedUser: typeof import("../auth").getAuthenticatedUser;

beforeEach(async () => {
  vi.clearAllMocks();
  // Restore createServerClient mock to default factory (may have been overridden)
  vi.mocked(createServerClient).mockImplementation(() => ({
    auth: { getUser: mockGetUser },
  }) as never);
  const mod = await import("../auth");
  getAuthenticatedUser = mod.getAuthenticatedUser;
});

// ─── tests ────────────────────────────────────────────────────────

describe("getAuthenticatedUser", () => {
  it("returns null when no Authorization header", async () => {
    const result = await getAuthenticatedUser(makeRequest());
    expect(result).toBeNull();
  });

  it("returns null when Authorization header doesn't start with 'Bearer '", async () => {
    const result = await getAuthenticatedUser(
      makeRequest({ authorization: "Basic abc123" }),
    );
    expect(result).toBeNull();
  });

  it("returns null when Authorization is 'Bearer ' with empty token", async () => {
    // "Bearer ".slice(7) === "" — supabase getUser returns undefined → destructure fails → catch returns null
    const result = await getAuthenticatedUser(
      makeRequest({ authorization: "Bearer " }),
    );
    expect(result).toBeNull();
  });

  it("returns null when Supabase getUser returns error", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: { message: "Invalid token" },
    });

    const result = await getAuthenticatedUser(
      makeRequest({ authorization: "Bearer valid-token" }),
    );
    expect(result).toBeNull();
  });

  it("returns null when Supabase getUser returns null user", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: null,
    });

    const result = await getAuthenticatedUser(
      makeRequest({ authorization: "Bearer valid-token" }),
    );
    expect(result).toBeNull();
  });

  it("returns null when DB user not found", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: fakeSupabaseUser },
      error: null,
    });
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

    const result = await getAuthenticatedUser(
      makeRequest({ authorization: "Bearer valid-token" }),
    );
    expect(result).toBeNull();
  });

  it("returns DB user when everything succeeds", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: fakeSupabaseUser },
      error: null,
    });
    vi.mocked(prisma.user.findUnique).mockResolvedValue(fakeDbUser as never);

    const result = await getAuthenticatedUser(
      makeRequest({ authorization: "Bearer valid-token" }),
    );
    expect(result).toEqual(fakeDbUser);
  });

  it("returns null when createServerClient throws", async () => {
    vi.mocked(createServerClient).mockImplementation(() => {
      throw new Error("Supabase config error");
    });

    const result = await getAuthenticatedUser(
      makeRequest({ authorization: "Bearer valid-token" }),
    );
    expect(result).toBeNull();
  });

  it("returns null when prisma.user.findUnique throws", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: fakeSupabaseUser },
      error: null,
    });
    vi.mocked(prisma.user.findUnique).mockRejectedValue(
      new Error("DB connection failed"),
    );

    const result = await getAuthenticatedUser(
      makeRequest({ authorization: "Bearer valid-token" }),
    );
    expect(result).toBeNull();
  });

  it("passes correct token to supabase.auth.getUser", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: null,
    });

    await getAuthenticatedUser(
      makeRequest({ authorization: "Bearer my-secret-token-xyz" }),
    );
    expect(mockGetUser).toHaveBeenCalledWith("my-secret-token-xyz");
  });

  it("looks up user by supabaseAuthId matching Supabase user.id", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: fakeSupabaseUser },
      error: null,
    });
    vi.mocked(prisma.user.findUnique).mockResolvedValue(fakeDbUser as never);

    await getAuthenticatedUser(
      makeRequest({ authorization: "Bearer valid-token" }),
    );
    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { supabaseAuthId: "supabase-uid-123" },
    });
  });
});
