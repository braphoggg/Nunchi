import { describe, it, expect, vi } from "vitest";
import { renderHook } from "@testing-library/react";

// We test useAuth WITHOUT a provider to exercise the NO_AUTH fallback.
// The AuthProvider requires Supabase env vars which aren't available in test.

// Mock the supabase client module to prevent import errors
vi.mock("@/lib/supabase/client", () => ({
  getSupabaseClient: vi.fn(() => ({
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } },
      })),
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn(),
    },
  })),
  isSupabaseConfigured: vi.fn(() => false),
}));

import { useAuth, isAuthAvailable } from "../AuthContext";

describe("useAuth — no provider (NO_AUTH fallback)", () => {
  it("returns null user", () => {
    const { result } = renderHook(() => useAuth());
    expect(result.current.user).toBeNull();
  });

  it("returns null session", () => {
    const { result } = renderHook(() => useAuth());
    expect(result.current.session).toBeNull();
  });

  it("returns isLoading false", () => {
    const { result } = renderHook(() => useAuth());
    expect(result.current.isLoading).toBe(false);
  });

  it("signIn returns 'Auth not configured' error", async () => {
    const { result } = renderHook(() => useAuth());
    const res = await result.current.signIn("test@example.com", "password");
    expect(res).toEqual({ error: "Auth not configured" });
  });

  it("signUp returns 'Auth not configured' error", async () => {
    const { result } = renderHook(() => useAuth());
    const res = await result.current.signUp("test@example.com", "password");
    expect(res).toEqual({ error: "Auth not configured" });
  });

  it("signOut resolves without error", async () => {
    const { result } = renderHook(() => useAuth());
    await expect(result.current.signOut()).resolves.toBeUndefined();
  });
});

describe("isAuthAvailable", () => {
  it("returns false when env vars are not set (default test env)", () => {
    // NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are not set in test
    expect(isAuthAvailable()).toBe(false);
  });
});
