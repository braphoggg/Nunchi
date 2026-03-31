import { describe, it, expect, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useOverlayState } from "../useOverlayState";

function createMockSound() {
  return {
    playPanelTransition: vi.fn(),
    // Add other methods the type expects but we don't test
  } as unknown as ReturnType<typeof import("../useSoundEngine").useSoundEngine>;
}

describe("useOverlayState", () => {
  it("all panels start closed", () => {
    const sound = createMockSound();
    const closePanel = vi.fn();
    const { result } = renderHook(() => useOverlayState(sound, closePanel));

    expect(result.current.statsOpen).toBe(false);
    expect(result.current.helpOpen).toBe(false);
    expect(result.current.settingsOpen).toBe(false);
  });

  // ─── Stats ──────────────────────────────────────────────────

  it("toggleStats opens stats panel", () => {
    const sound = createMockSound();
    const closePanel = vi.fn();
    const { result } = renderHook(() => useOverlayState(sound, closePanel));

    act(() => result.current.toggleStats());

    expect(result.current.statsOpen).toBe(true);
    expect(sound.playPanelTransition).toHaveBeenCalledWith("open");
    expect(closePanel).toHaveBeenCalled();
  });

  it("toggleStats closes stats panel when already open", () => {
    const sound = createMockSound();
    const closePanel = vi.fn();
    const { result } = renderHook(() => useOverlayState(sound, closePanel));

    act(() => result.current.toggleStats());
    act(() => result.current.toggleStats());

    expect(result.current.statsOpen).toBe(false);
    expect(sound.playPanelTransition).toHaveBeenLastCalledWith("close");
  });

  it("closeStats closes stats panel without sound", () => {
    const sound = createMockSound();
    const closePanel = vi.fn();
    const { result } = renderHook(() => useOverlayState(sound, closePanel));

    act(() => result.current.toggleStats());
    expect(result.current.statsOpen).toBe(true);

    act(() => result.current.closeStats());
    expect(result.current.statsOpen).toBe(false);
  });

  // ─── Help ───────────────────────────────────────────────────

  it("toggleHelp opens help and closes vocabulary + stats", () => {
    const sound = createMockSound();
    const closePanel = vi.fn();
    const { result } = renderHook(() => useOverlayState(sound, closePanel));

    // Open stats first
    act(() => result.current.toggleStats());
    expect(result.current.statsOpen).toBe(true);

    // Opening help should close stats and vocabulary panel
    act(() => result.current.toggleHelp());
    expect(result.current.helpOpen).toBe(true);
    expect(result.current.statsOpen).toBe(false);
    expect(closePanel).toHaveBeenCalledTimes(2); // once for stats open, once for help open
  });

  it("toggleHelp closes help when already open", () => {
    const sound = createMockSound();
    const closePanel = vi.fn();
    const { result } = renderHook(() => useOverlayState(sound, closePanel));

    act(() => result.current.toggleHelp());
    act(() => result.current.toggleHelp());

    expect(result.current.helpOpen).toBe(false);
    expect(sound.playPanelTransition).toHaveBeenLastCalledWith("close");
  });

  it("closeHelp closes help silently", () => {
    const sound = createMockSound();
    const closePanel = vi.fn();
    const { result } = renderHook(() => useOverlayState(sound, closePanel));

    act(() => result.current.toggleHelp());
    act(() => result.current.closeHelp());

    expect(result.current.helpOpen).toBe(false);
  });

  // ─── Settings ───────────────────────────────────────────────

  it("toggleSettings opens settings and closes all others", () => {
    const sound = createMockSound();
    const closePanel = vi.fn();
    const { result } = renderHook(() => useOverlayState(sound, closePanel));

    // Open stats and help first
    act(() => result.current.toggleStats());
    act(() => result.current.toggleHelp());

    // Settings should close stats, help, and vocabulary
    act(() => result.current.toggleSettings());
    expect(result.current.settingsOpen).toBe(true);
    expect(result.current.statsOpen).toBe(false);
    expect(result.current.helpOpen).toBe(false);
  });

  it("toggleSettings closes settings when already open", () => {
    const sound = createMockSound();
    const closePanel = vi.fn();
    const { result } = renderHook(() => useOverlayState(sound, closePanel));

    act(() => result.current.toggleSettings());
    act(() => result.current.toggleSettings());

    expect(result.current.settingsOpen).toBe(false);
  });

  it("closeSettings closes settings silently", () => {
    const sound = createMockSound();
    const closePanel = vi.fn();
    const { result } = renderHook(() => useOverlayState(sound, closePanel));

    act(() => result.current.toggleSettings());
    act(() => result.current.closeSettings());

    expect(result.current.settingsOpen).toBe(false);
  });

  // ─── Cross-panel coordination ─────────────────────────────

  it("only one panel can be open at a time via toggles", () => {
    const sound = createMockSound();
    const closePanel = vi.fn();
    const { result } = renderHook(() => useOverlayState(sound, closePanel));

    act(() => result.current.toggleStats());
    expect(result.current.statsOpen).toBe(true);
    expect(result.current.helpOpen).toBe(false);
    expect(result.current.settingsOpen).toBe(false);

    act(() => result.current.toggleHelp());
    expect(result.current.statsOpen).toBe(false);
    expect(result.current.helpOpen).toBe(true);
    expect(result.current.settingsOpen).toBe(false);

    act(() => result.current.toggleSettings());
    expect(result.current.statsOpen).toBe(false);
    expect(result.current.helpOpen).toBe(false);
    expect(result.current.settingsOpen).toBe(true);
  });

  it("plays open sound when opening any panel", () => {
    const sound = createMockSound();
    const closePanel = vi.fn();
    const { result } = renderHook(() => useOverlayState(sound, closePanel));

    act(() => result.current.toggleStats());
    expect(sound.playPanelTransition).toHaveBeenCalledWith("open");

    act(() => result.current.toggleHelp());
    expect(sound.playPanelTransition).toHaveBeenCalledWith("open");

    act(() => result.current.toggleSettings());
    expect(sound.playPanelTransition).toHaveBeenCalledWith("open");
  });
});
