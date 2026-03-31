import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── mocks ────────────────────────────────────────────────────────

const fakeClient = { auth: {}, from: vi.fn() };

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => fakeClient),
}));

// ─── setup ────────────────────────────────────────────────────────

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
});

// ─── isSupabaseConfigured ─────────────────────────────────────────

describe("isSupabaseConfigured", () => {
  it("returns false when both env vars are missing", async () => {
    const { isSupabaseConfigured } = await import("../client");
    expect(isSupabaseConfigured()).toBe(false);
  });

  it("returns true when both env vars are set", async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key-123";

    const { isSupabaseConfigured } = await import("../client");
    expect(isSupabaseConfigured()).toBe(true);
  });

  it("returns false when only URL is set", async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";

    const { isSupabaseConfigured } = await import("../client");
    expect(isSupabaseConfigured()).toBe(false);
  });

  it("returns false when only KEY is set", async () => {
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key-123";

    const { isSupabaseConfigured } = await import("../client");
    expect(isSupabaseConfigured()).toBe(false);
  });
});

// ─── getSupabaseClient ────────────────────────────────────────────

describe("getSupabaseClient", () => {
  it("throws when env vars are missing", async () => {
    const { getSupabaseClient } = await import("../client");
    expect(() => getSupabaseClient()).toThrow(
      "Missing Supabase client environment variables",
    );
  });

  it("creates client when env vars are set", async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key-123";

    const { getSupabaseClient } = await import("../client");
    const { createClient } = await import("@supabase/supabase-js");

    const client = getSupabaseClient();

    expect(createClient).toHaveBeenCalledWith(
      "https://test.supabase.co",
      "anon-key-123",
    );
    expect(client).toBe(fakeClient);
  });

  it("returns same instance on second call (singleton)", async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key-123";

    const { getSupabaseClient } = await import("../client");
    const { createClient } = await import("@supabase/supabase-js");

    const first = getSupabaseClient();
    const second = getSupabaseClient();

    expect(first).toBe(second);
    expect(createClient).toHaveBeenCalledTimes(1);
  });
});
