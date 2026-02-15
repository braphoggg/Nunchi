import { describe, it, expect, vi, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useGoshiwonEvents } from "../useGoshiwonEvents";

describe("useGoshiwonEvents", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns null initially and does not trigger below threshold", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.1);
    const { result, rerender, unmount } = renderHook(
      ({ count }) => useGoshiwonEvents(count),
      { initialProps: { count: 0 } }
    );

    // Initially null
    expect(result.current.activeEvent).toBeNull();

    // Below threshold — still null
    rerender({ count: 1 });
    expect(result.current.activeEvent).toBeNull();

    // At threshold — triggers event
    rerender({ count: 3 });
    expect(result.current.activeEvent).not.toBeNull();
    expect(result.current.activeEvent).toHaveProperty("korean");
    expect(result.current.activeEvent).toHaveProperty("english");

    // Dismiss clears it
    act(() => {
      result.current.dismissEvent();
    });
    expect(result.current.activeEvent).toBeNull();

    unmount();
  });
});
