import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── mocks ────────────────────────────────────────────────────────

const fakeServerClient = { auth: {}, from: vi.fn() };

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => fakeServerClient),
}));

// ─── setup ────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
});

// ─── createServerClient ───────────────────────────────────────────

describe("createServerClient", () => {
  it("throws when NEXT_PUBLIC_SUPABASE_URL is missing", async () => {
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-key-123";

    const { createServerClient } = await import("../server");
    expect(() => createServerClient()).toThrow(
      "Missing Supabase server environment variables",
    );
  });

  it("throws when SUPABASE_SERVICE_ROLE_KEY is missing", async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";

    const { createServerClient } = await import("../server");
    expect(() => createServerClient()).toThrow(
      "Missing Supabase server environment variables",
    );
  });

  it("throws when both env vars are missing", async () => {
    const { createServerClient } = await import("../server");
    expect(() => createServerClient()).toThrow(
      "Missing Supabase server environment variables",
    );
  });

  it("creates client with correct url and key when both set", async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-key-123";

    const { createServerClient } = await import("../server");
    const { createClient } = await import("@supabase/supabase-js");

    createServerClient();

    expect(createClient).toHaveBeenCalledWith(
      "https://test.supabase.co",
      "service-role-key-123",
    );
  });

  it("returns result of createClient", async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-key-123";

    const { createServerClient } = await import("../server");
    const result = createServerClient();

    expect(result).toBe(fakeServerClient);
  });
});
