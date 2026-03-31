import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useViewportHeight } from "../useViewportHeight";

describe("useViewportHeight", () => {
  let addSpy: ReturnType<typeof vi.fn>;
  let removeSpy: ReturnType<typeof vi.fn>;
  let vvAddSpy: ReturnType<typeof vi.fn>;
  let vvRemoveSpy: ReturnType<typeof vi.fn>;
  let setPropertySpy: ReturnType<typeof vi.fn>;
  let removePropertySpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    addSpy = vi.fn();
    removeSpy = vi.fn();
    vvAddSpy = vi.fn();
    vvRemoveSpy = vi.fn();
    setPropertySpy = vi.fn();
    removePropertySpy = vi.fn();

    vi.spyOn(window, "addEventListener").mockImplementation(addSpy);
    vi.spyOn(window, "removeEventListener").mockImplementation(removeSpy);
    vi.spyOn(document.documentElement.style, "setProperty").mockImplementation(setPropertySpy);
    vi.spyOn(document.documentElement.style, "removeProperty").mockImplementation(removePropertySpy);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("sets --app-height CSS property on mount", () => {
    renderHook(() => useViewportHeight());

    expect(setPropertySpy).toHaveBeenCalledWith(
      "--app-height",
      expect.stringMatching(/^\d+px$/),
    );
  });

  it("uses window.innerHeight when visualViewport is not available", () => {
    const savedVV = window.visualViewport;
    Object.defineProperty(window, "visualViewport", {
      value: undefined,
      writable: true,
      configurable: true,
    });

    renderHook(() => useViewportHeight());

    expect(setPropertySpy).toHaveBeenCalledWith(
      "--app-height",
      `${window.innerHeight}px`,
    );

    Object.defineProperty(window, "visualViewport", {
      value: savedVV,
      writable: true,
      configurable: true,
    });
  });

  it("registers resize listener on window", () => {
    renderHook(() => useViewportHeight());

    expect(addSpy).toHaveBeenCalledWith("resize", expect.any(Function));
  });

  it("registers resize listener on visualViewport when available", () => {
    const mockVV = {
      height: 700,
      addEventListener: vvAddSpy,
      removeEventListener: vvRemoveSpy,
    };
    Object.defineProperty(window, "visualViewport", {
      value: mockVV,
      writable: true,
      configurable: true,
    });

    renderHook(() => useViewportHeight());

    expect(vvAddSpy).toHaveBeenCalledWith("resize", expect.any(Function));

    // Restore
    Object.defineProperty(window, "visualViewport", {
      value: undefined,
      writable: true,
      configurable: true,
    });
  });

  it("cleans up on unmount — removes --app-height property", () => {
    const { unmount } = renderHook(() => useViewportHeight());
    unmount();

    expect(removePropertySpy).toHaveBeenCalledWith("--app-height");
  });

  it("cleans up on unmount — removes window resize listener", () => {
    const { unmount } = renderHook(() => useViewportHeight());
    unmount();

    expect(removeSpy).toHaveBeenCalledWith("resize", expect.any(Function));
  });
});
