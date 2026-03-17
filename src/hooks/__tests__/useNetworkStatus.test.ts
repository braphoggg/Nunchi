import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useNetworkStatus } from "../useNetworkStatus";

let onlineListeners: Array<() => void> = [];
let offlineListeners: Array<() => void> = [];

beforeEach(() => {
  onlineListeners = [];
  offlineListeners = [];

  vi.stubGlobal("navigator", { onLine: true });

  vi.spyOn(window, "addEventListener").mockImplementation((event, handler) => {
    if (event === "online") onlineListeners.push(handler as () => void);
    if (event === "offline") offlineListeners.push(handler as () => void);
  });
  vi.spyOn(window, "removeEventListener").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("useNetworkStatus", () => {
  it("returns isOnline true when navigator.onLine is true", () => {
    const { result } = renderHook(() => useNetworkStatus());
    expect(result.current.isOnline).toBe(true);
    expect(result.current.wasOffline).toBe(false);
  });

  it("returns isOnline false when navigator.onLine is false", () => {
    vi.stubGlobal("navigator", { onLine: false });
    const { result } = renderHook(() => useNetworkStatus());
    expect(result.current.isOnline).toBe(false);
  });

  it("updates isOnline when going offline", () => {
    const { result } = renderHook(() => useNetworkStatus());
    expect(result.current.isOnline).toBe(true);

    act(() => {
      offlineListeners.forEach((fn) => fn());
    });

    expect(result.current.isOnline).toBe(false);
  });

  it("updates isOnline and wasOffline when coming back online", () => {
    const { result } = renderHook(() => useNetworkStatus());

    act(() => {
      offlineListeners.forEach((fn) => fn());
    });
    expect(result.current.isOnline).toBe(false);

    act(() => {
      onlineListeners.forEach((fn) => fn());
    });
    expect(result.current.isOnline).toBe(true);
    expect(result.current.wasOffline).toBe(true);
  });

  it("dismissReconnected clears wasOffline", () => {
    const { result } = renderHook(() => useNetworkStatus());

    act(() => {
      offlineListeners.forEach((fn) => fn());
    });
    act(() => {
      onlineListeners.forEach((fn) => fn());
    });
    expect(result.current.wasOffline).toBe(true);

    act(() => {
      result.current.dismissReconnected();
    });
    expect(result.current.wasOffline).toBe(false);
  });
});
