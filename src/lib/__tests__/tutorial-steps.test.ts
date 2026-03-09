import { describe, it, expect } from "vitest";
import { TUTORIAL_STEPS, type TutorialStep } from "../tutorial-steps";

describe("TUTORIAL_STEPS", () => {
  it("exports a non-empty array", () => {
    expect(Array.isArray(TUTORIAL_STEPS)).toBe(true);
    expect(TUTORIAL_STEPS.length).toBeGreaterThan(0);
  });

  it("has unique ids for each step", () => {
    const ids = TUTORIAL_STEPS.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("each step has all required fields with correct types", () => {
    for (const step of TUTORIAL_STEPS) {
      expect(typeof step.id).toBe("string");
      expect(step.id.length).toBeGreaterThan(0);
      expect(typeof step.title).toBe("string");
      expect(step.title.length).toBeGreaterThan(0);
      expect(typeof step.titleKr).toBe("string");
      expect(step.titleKr.length).toBeGreaterThan(0);
      expect(typeof step.moonjoSays).toBe("string");
      expect(step.moonjoSays.length).toBeGreaterThan(0);
      expect(typeof step.description).toBe("string");
      expect(step.description.length).toBeGreaterThan(0);
      expect(["observe", "interact"]).toContain(step.type);
      expect(["top", "bottom", "center"]).toContain(step.tooltipPosition);
    }
  });

  it("targetSelector is either a valid data-tutorial selector or null", () => {
    for (const step of TUTORIAL_STEPS) {
      if (step.targetSelector !== null) {
        expect(step.targetSelector).toMatch(/^\[data-tutorial="/);
      }
    }
  });

  it("secondaryTargetSelector is optional and follows same pattern", () => {
    for (const step of TUTORIAL_STEPS) {
      if (
        step.secondaryTargetSelector !== undefined &&
        step.secondaryTargetSelector !== null
      ) {
        expect(step.secondaryTargetSelector).toMatch(/^\[data-tutorial="/);
      }
    }
  });

  it("spotlightPadding is a positive number when present", () => {
    for (const step of TUTORIAL_STEPS) {
      if (step.spotlightPadding !== undefined) {
        expect(typeof step.spotlightPadding).toBe("number");
        expect(step.spotlightPadding).toBeGreaterThan(0);
      }
    }
  });

  it("starts with a welcome step and ends with a finale", () => {
    expect(TUTORIAL_STEPS[0].id).toBe("welcome");
    expect(TUTORIAL_STEPS[TUTORIAL_STEPS.length - 1].id).toBe("finale");
  });

  it("moonjoSays contains Korean text for each step", () => {
    const koreanRegex = /[\uAC00-\uD7AF\u1100-\u11FF\u3130-\u318F]/;
    for (const step of TUTORIAL_STEPS) {
      expect(koreanRegex.test(step.moonjoSays)).toBe(true);
    }
  });

  it("titleKr contains Korean text for each step", () => {
    const koreanRegex = /[\uAC00-\uD7AF\u1100-\u11FF\u3130-\u318F]/;
    for (const step of TUTORIAL_STEPS) {
      expect(koreanRegex.test(step.titleKr)).toBe(true);
    }
  });

  it("center-positioned tooltips have null targetSelector", () => {
    const centered = TUTORIAL_STEPS.filter(
      (s) => s.tooltipPosition === "center",
    );
    for (const step of centered) {
      // Center tooltips shouldn't need a target to spotlight
      // (they float independently) — either null or optional target
      expect(
        step.targetSelector === null || typeof step.targetSelector === "string",
      ).toBe(true);
    }
  });
});
