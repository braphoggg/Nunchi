import { describe, it, expect } from "vitest";
import { renderHook } from "@testing-library/react";
import { useNightProgression, getNightStage } from "../useNightProgression";

describe("getNightStage", () => {
  it("returns stage 0 for 0 messages", () => {
    expect(getNightStage(0)).toBe(0);
  });

  it("returns stage 0 for 4 messages", () => {
    expect(getNightStage(4)).toBe(0);
  });

  it("returns stage 1 for 5 messages", () => {
    expect(getNightStage(5)).toBe(1);
  });

  it("returns stage 1 for 14 messages", () => {
    expect(getNightStage(14)).toBe(1);
  });

  it("returns stage 2 for 15 messages", () => {
    expect(getNightStage(15)).toBe(2);
  });

  it("returns stage 2 for 29 messages", () => {
    expect(getNightStage(29)).toBe(2);
  });

  it("returns stage 3 for 30 messages", () => {
    expect(getNightStage(30)).toBe(3);
  });

  it("returns stage 3 for 100 messages", () => {
    expect(getNightStage(100)).toBe(3);
  });
});

describe("useNightProgression", () => {
  it("returns empty style overrides at stage 0", () => {
    const { result } = renderHook(() => useNightProgression(0));
    expect(result.current.stage).toBe(0);
    expect(Object.keys(result.current.styleOverrides)).toHaveLength(0);
  });

  it("returns darker bg at stage 1", () => {
    const { result } = renderHook(() => useNightProgression(5));
    expect(result.current.stage).toBe(1);
    const styles = result.current.styleOverrides as Record<string, string>;
    expect(styles["--color-goshiwon-bg"]).toBe("#0a0809");
  });

  it("includes text color override at stage 2", () => {
    const { result } = renderHook(() => useNightProgression(15));
    expect(result.current.stage).toBe(2);
    const styles = result.current.styleOverrides as Record<string, string>;
    expect(styles["--color-goshiwon-bg"]).toBe("#080607");
    expect(styles["--color-goshiwon-text"]).toBe("#d8d4dc");
  });

  it("includes accent override at stage 3", () => {
    const { result } = renderHook(() => useNightProgression(30));
    expect(result.current.stage).toBe(3);
    const styles = result.current.styleOverrides as Record<string, string>;
    expect(styles["--color-goshiwon-bg"]).toBe("#060405");
    expect(styles["--color-goshiwon-accent"]).toBe("#a01e1e");
  });

  it("updates when message count changes", () => {
    const { result, rerender } = renderHook(
      ({ count }) => useNightProgression(count),
      { initialProps: { count: 0 } }
    );
    expect(result.current.stage).toBe(0);

    rerender({ count: 15 });
    expect(result.current.stage).toBe(2);
  });
});
