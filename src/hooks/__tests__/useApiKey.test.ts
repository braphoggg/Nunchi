import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useApiKey } from "../useApiKey";

const STORAGE_KEY = "nunchi-api-key";

describe("useApiKey", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
  });

  // ─── initial state ────────────────────────────────────────────────

  it("returns null when no key is stored", () => {
    const { result } = renderHook(() => useApiKey());
    // Initial state before useEffect fires
    expect(result.current.apiKey).toBeNull();
  });

  it("loads existing key from localStorage on mount", () => {
    localStorage.setItem(STORAGE_KEY, "AIzaSyTest123");
    const { result } = renderHook(() => useApiKey());
    expect(result.current.apiKey).toBe("AIzaSyTest123");
  });

  // ─── setApiKey ────────────────────────────────────────────────────

  it("saves a valid key", () => {
    const { result } = renderHook(() => useApiKey());
    act(() => {
      result.current.setApiKey("AIzaSyNewKey456");
    });
    expect(result.current.apiKey).toBe("AIzaSyNewKey456");
    expect(localStorage.getItem(STORAGE_KEY)).toBe("AIzaSyNewKey456");
  });

  it("trims whitespace from keys", () => {
    const { result } = renderHook(() => useApiKey());
    act(() => {
      result.current.setApiKey("  AIzaSySpaced  ");
    });
    expect(result.current.apiKey).toBe("AIzaSySpaced");
    expect(localStorage.getItem(STORAGE_KEY)).toBe("AIzaSySpaced");
  });

  it("rejects empty string", () => {
    const { result } = renderHook(() => useApiKey());
    act(() => {
      result.current.setApiKey("AIzaSyFirst");
    });
    act(() => {
      result.current.setApiKey("");
    });
    // Should keep the previous key
    expect(result.current.apiKey).toBe("AIzaSyFirst");
  });

  it("rejects whitespace-only string", () => {
    const { result } = renderHook(() => useApiKey());
    act(() => {
      result.current.setApiKey("AIzaSyFirst");
    });
    act(() => {
      result.current.setApiKey("   ");
    });
    expect(result.current.apiKey).toBe("AIzaSyFirst");
  });

  // ─── clearApiKey ──────────────────────────────────────────────────

  it("clears the stored key", () => {
    localStorage.setItem(STORAGE_KEY, "AIzaSyExisting");
    const { result } = renderHook(() => useApiKey());
    expect(result.current.apiKey).toBe("AIzaSyExisting");

    act(() => {
      result.current.clearApiKey();
    });
    expect(result.current.apiKey).toBeNull();
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it("clearApiKey is idempotent when already null", () => {
    const { result } = renderHook(() => useApiKey());
    act(() => {
      result.current.clearApiKey();
    });
    expect(result.current.apiKey).toBeNull();
  });

  // ─── persistence ─────────────────────────────────────────────────

  it("persists key across hook remounts", () => {
    const { result, unmount } = renderHook(() => useApiKey());
    act(() => {
      result.current.setApiKey("AIzaSyPersist");
    });
    unmount();

    const { result: result2 } = renderHook(() => useApiKey());
    expect(result2.current.apiKey).toBe("AIzaSyPersist");
  });

  it("removes key from localStorage when cleared", () => {
    const { result } = renderHook(() => useApiKey());
    act(() => {
      result.current.setApiKey("AIzaSyTemp");
    });
    expect(localStorage.getItem(STORAGE_KEY)).toBe("AIzaSyTemp");

    act(() => {
      result.current.clearApiKey();
    });
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  // ─── localStorage errors ──────────────────────────────────────────

  it("returns null when localStorage.getItem throws", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("Access denied");
    });
    const { result } = renderHook(() => useApiKey());
    expect(result.current.apiKey).toBeNull();
  });

  it("does not throw when localStorage.setItem throws", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("Quota exceeded");
    });
    const { result } = renderHook(() => useApiKey());
    // Should not throw, just silently fail to persist
    expect(() => {
      act(() => {
        result.current.setApiKey("AIzaSyFail");
      });
    }).not.toThrow();
    // State still updates in memory
    expect(result.current.apiKey).toBe("AIzaSyFail");
  });

  it("does not throw when localStorage.removeItem throws on clear", () => {
    vi.spyOn(Storage.prototype, "removeItem").mockImplementation(() => {
      throw new Error("Access denied");
    });
    const { result } = renderHook(() => useApiKey());
    act(() => {
      result.current.setApiKey("AIzaSyTemp");
    });
    expect(() => {
      act(() => {
        result.current.clearApiKey();
      });
    }).not.toThrow();
  });

  // ─── does not persist on initial mount ────────────────────────────

  it("does not call saveKey during initial mount (skip flag)", () => {
    const setItemSpy = vi.spyOn(Storage.prototype, "setItem");
    renderHook(() => useApiKey());
    // setItem should NOT be called on mount — the initialized ref prevents it
    expect(setItemSpy).not.toHaveBeenCalled();
  });

  // ─── multiple rapid updates ───────────────────────────────────────

  it("handles multiple rapid setApiKey calls", () => {
    const { result } = renderHook(() => useApiKey());
    act(() => {
      result.current.setApiKey("key1");
      result.current.setApiKey("key2");
      result.current.setApiKey("key3");
    });
    // Last one wins
    expect(result.current.apiKey).toBe("key3");
    expect(localStorage.getItem(STORAGE_KEY)).toBe("key3");
  });
});
