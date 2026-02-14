import { describe, it, expect, beforeEach } from "vitest";
import { getAtmosphericTimestamp, resetTimestampCounter } from "../timestamps";

describe("timestamps", () => {
  beforeEach(() => {
    resetTimestampCounter();
  });

  it("returns a string matching X:XX AM format", () => {
    const ts = getAtmosphericTimestamp();
    expect(ts).toMatch(/^[1-3]:\d{2} AM$/);
  });

  it("hour is between 1 and 3", () => {
    for (let i = 0; i < 20; i++) {
      const ts = getAtmosphericTimestamp();
      const hour = parseInt(ts.split(":")[0], 10);
      expect(hour).toBeGreaterThanOrEqual(1);
      expect(hour).toBeLessThanOrEqual(3);
    }
  });

  it("minutes are between 00 and 59", () => {
    for (let i = 0; i < 20; i++) {
      const ts = getAtmosphericTimestamp();
      const minuteStr = ts.split(":")[1].split(" ")[0];
      const minute = parseInt(minuteStr, 10);
      expect(minute).toBeGreaterThanOrEqual(0);
      expect(minute).toBeLessThanOrEqual(59);
    }
  });

  it("resetTimestampCounter resets the sequence", () => {
    getAtmosphericTimestamp();
    getAtmosphericTimestamp();
    resetTimestampCounter();
    const ts = getAtmosphericTimestamp();
    // After reset, first minute should be 0
    const minuteStr = ts.split(":")[1].split(" ")[0];
    expect(parseInt(minuteStr, 10)).toBe(0);
  });

  it("sequential calls produce timestamps (not identical)", () => {
    const timestamps = Array.from({ length: 5 }, () => getAtmosphericTimestamp());
    // At least some should be different (minutes increment)
    const unique = new Set(timestamps);
    expect(unique.size).toBeGreaterThan(1);
  });
});
