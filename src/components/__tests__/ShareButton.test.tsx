import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useShareConversation } from "../ShareButton";
import type { UIMessage } from "ai";

// Mock html-to-image
vi.mock("html-to-image", () => ({
  toPng: vi.fn(async () => "data:image/png;base64,fakedata"),
}));

function makeMessage(role: "user" | "assistant", text: string): UIMessage {
  return {
    id: `msg-${Math.random()}`,
    role,
    parts: [{ type: "text" as const, text }],
  } as UIMessage;
}

// Mock DOM methods
const mockClick = vi.fn();
const mockCreateElement = document.createElement.bind(document);

beforeEach(() => {
  vi.clearAllMocks();
  mockClick.mockClear();

  // Mock anchor element for download
  vi.spyOn(document, "createElement").mockImplementation((tag: string) => {
    const el = mockCreateElement(tag);
    if (tag === "a") {
      Object.defineProperty(el, "click", { value: mockClick });
    }
    return el;
  });
});

describe("useShareConversation", () => {
  it("returns the expected interface", () => {
    const messages = [makeMessage("assistant", "Hello")];
    const { result } = renderHook(() => useShareConversation(messages));
    expect(typeof result.current.handleShare).toBe("function");
    expect(typeof result.current.exporting).toBe("boolean");
    expect(typeof result.current.done).toBe("boolean");
  });

  it("starts with exporting=false and done=false", () => {
    const messages = [makeMessage("assistant", "Hello")];
    const { result } = renderHook(() => useShareConversation(messages));
    expect(result.current.exporting).toBe(false);
    expect(result.current.done).toBe(false);
  });

  it("does nothing when messages are empty", async () => {
    const { result } = renderHook(() => useShareConversation([]));
    await act(async () => {
      await result.current.handleShare();
    });
    expect(result.current.exporting).toBe(false);
    expect(mockClick).not.toHaveBeenCalled();
  });

  it("exports PNG and triggers download for valid messages", async () => {
    vi.useFakeTimers();
    const messages = [
      makeMessage("assistant", "안녕하세요!"),
      makeMessage("user", "Hello!"),
    ];
    const { result } = renderHook(() => useShareConversation(messages));

    await act(async () => {
      await result.current.handleShare();
    });

    // After export completes, done should be true
    expect(result.current.done).toBe(true);
    expect(result.current.exporting).toBe(false);

    // Download should have been triggered
    expect(mockClick).toHaveBeenCalled();

    // After 2 seconds, done resets to false
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(result.current.done).toBe(false);

    vi.useRealTimers();
  });

  it("handles export failure gracefully", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    const { toPng } = await import("html-to-image");
    vi.mocked(toPng).mockRejectedValueOnce(new Error("Canvas error"));

    const messages = [makeMessage("assistant", "Hello")];
    const { result } = renderHook(() => useShareConversation(messages));

    await act(async () => {
      await result.current.handleShare();
    });

    expect(result.current.exporting).toBe(false);
    expect(result.current.done).toBe(false);
    expect(consoleError).toHaveBeenCalled();

    consoleError.mockRestore();
  });

  it("prevents double export while already exporting", async () => {
    const { toPng } = await import("html-to-image");
    let resolveExport: (value: string) => void;
    vi.mocked(toPng).mockImplementationOnce(
      () =>
        new Promise<string>((resolve) => {
          resolveExport = resolve;
        })
    );

    const messages = [makeMessage("assistant", "Hello")];
    const { result } = renderHook(() => useShareConversation(messages));

    // Start first export (won't resolve yet)
    let firstDone = false;
    act(() => {
      result.current.handleShare().then(() => {
        firstDone = true;
      });
    });

    // Try second export while first is in progress
    await act(async () => {
      await result.current.handleShare();
    });

    // Only one toPng call should have been made
    expect(toPng).toHaveBeenCalledTimes(1);

    // Clean up by resolving the pending export
    await act(async () => {
      resolveExport!("data:image/png;base64,fakedata");
      // Wait a tick for the promise chain to resolve
      await new Promise((r) => setTimeout(r, 0));
    });
  });
});
