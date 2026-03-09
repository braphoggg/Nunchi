import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useSettings, type AppSettings } from "../useSettings";

// ─── localStorage mock ─────────────────────────────────────────────

let storage: Record<string, string> = {};

beforeEach(() => {
  storage = {};
  vi.stubGlobal("localStorage", {
    getItem: vi.fn((key: string) => storage[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      storage[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete storage[key];
    }),
  });

  // Mock matchMedia for prefers-reduced-motion
  vi.stubGlobal("matchMedia", vi.fn().mockReturnValue({ matches: false }));
});

afterEach(() => {
  vi.restoreAllMocks();
});

const STORAGE_KEY = "nunchi-settings";

// ─── defaults ──────────────────────────────────────────────────────

describe("useSettings — defaults", () => {
  it("returns dark theme by default", () => {
    const { result } = renderHook(() => useSettings());
    expect(result.current.settings.theme).toBe("dark");
  });

  it("returns fontScale 1 by default", () => {
    const { result } = renderHook(() => useSettings());
    expect(result.current.settings.fontScale).toBe(1);
  });

  it("returns showRomanization true by default", () => {
    const { result } = renderHook(() => useSettings());
    expect(result.current.settings.showRomanization).toBe(true);
  });

  it("returns reduceAnimations false when no OS preference", () => {
    const { result } = renderHook(() => useSettings());
    expect(result.current.settings.reduceAnimations).toBe(false);
  });

  it("returns reduceAnimations true when OS prefers reduced motion", () => {
    vi.stubGlobal("matchMedia", vi.fn().mockReturnValue({ matches: true }));
    const { result } = renderHook(() => useSettings());
    expect(result.current.settings.reduceAnimations).toBe(true);
  });
});

// ─── setters ───────────────────────────────────────────────────────

describe("useSettings — setters", () => {
  it("setTheme updates theme", () => {
    const { result } = renderHook(() => useSettings());
    act(() => result.current.setTheme("light"));
    expect(result.current.settings.theme).toBe("light");
  });

  it("setFontScale updates fontScale for valid values", () => {
    const { result } = renderHook(() => useSettings());
    act(() => result.current.setFontScale(1.15));
    expect(result.current.settings.fontScale).toBe(1.15);
  });

  it("setFontScale ignores invalid scale values", () => {
    const { result } = renderHook(() => useSettings());
    act(() => result.current.setFontScale(2.0)); // not in VALID_SCALES
    expect(result.current.settings.fontScale).toBe(1); // unchanged
  });

  it("setFontScale accepts 1.3", () => {
    const { result } = renderHook(() => useSettings());
    act(() => result.current.setFontScale(1.3));
    expect(result.current.settings.fontScale).toBe(1.3);
  });

  it("setReduceAnimations toggles animation setting", () => {
    const { result } = renderHook(() => useSettings());
    act(() => result.current.setReduceAnimations(true));
    expect(result.current.settings.reduceAnimations).toBe(true);
    act(() => result.current.setReduceAnimations(false));
    expect(result.current.settings.reduceAnimations).toBe(false);
  });

  it("setShowRomanization toggles romanization", () => {
    const { result } = renderHook(() => useSettings());
    act(() => result.current.setShowRomanization(false));
    expect(result.current.settings.showRomanization).toBe(false);
  });
});

// ─── persistence ───────────────────────────────────────────────────

describe("useSettings — persistence", () => {
  it("persists settings to localStorage on change", () => {
    const { result } = renderHook(() => useSettings());
    act(() => result.current.setTheme("light"));
    const stored = JSON.parse(storage[STORAGE_KEY]);
    expect(stored.theme).toBe("light");
  });

  it("loads settings from localStorage on mount", () => {
    const saved: AppSettings = {
      theme: "light",
      fontScale: 1.15,
      reduceAnimations: true,
      showRomanization: false,
    };
    storage[STORAGE_KEY] = JSON.stringify(saved);

    const { result } = renderHook(() => useSettings());
    // useEffect runs after mount
    expect(result.current.settings.theme).toBe("light");
    expect(result.current.settings.fontScale).toBe(1.15);
    expect(result.current.settings.reduceAnimations).toBe(true);
    expect(result.current.settings.showRomanization).toBe(false);
  });

  it("falls back to defaults when localStorage has invalid data", () => {
    storage[STORAGE_KEY] = JSON.stringify({ theme: "neon", fontScale: 99 });
    const { result } = renderHook(() => useSettings());
    expect(result.current.settings.theme).toBe("dark");
    expect(result.current.settings.fontScale).toBe(1);
  });

  it("falls back to defaults when localStorage has corrupted JSON", () => {
    storage[STORAGE_KEY] = "not-json{{{";
    const { result } = renderHook(() => useSettings());
    expect(result.current.settings.theme).toBe("dark");
  });

  it("falls back to defaults when localStorage has null", () => {
    storage[STORAGE_KEY] = "null";
    const { result } = renderHook(() => useSettings());
    expect(result.current.settings.theme).toBe("dark");
  });

  it("falls back to defaults when localStorage has an array", () => {
    storage[STORAGE_KEY] = "[]";
    const { result } = renderHook(() => useSettings());
    expect(result.current.settings.theme).toBe("dark");
  });

  it("survives localStorage.setItem throwing (full storage)", () => {
    (localStorage.setItem as ReturnType<typeof vi.fn>).mockImplementation(
      () => {
        throw new Error("QuotaExceededError");
      },
    );
    const { result } = renderHook(() => useSettings());
    // Should not throw — silently fails
    act(() => result.current.setTheme("light"));
    expect(result.current.settings.theme).toBe("light");
  });
});
