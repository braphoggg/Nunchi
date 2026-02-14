import { describe, it, expect } from "vitest";
import { MOONJO_SYSTEM_PROMPT } from "../system-prompt";

describe("MOONJO_SYSTEM_PROMPT", () => {
  it("is a non-empty string", () => {
    expect(typeof MOONJO_SYSTEM_PROMPT).toBe("string");
    expect(MOONJO_SYSTEM_PROMPT.length).toBeGreaterThan(100);
  });

  it("defines the Moon-jo character identity", () => {
    expect(MOONJO_SYSTEM_PROMPT).toContain("Moon-jo");
    expect(MOONJO_SYSTEM_PROMPT).toContain("서문조");
    expect(MOONJO_SYSTEM_PROMPT).toContain("dentist");
    expect(MOONJO_SYSTEM_PROMPT).toContain("Room 203");
  });

  it("includes teaching methodology section", () => {
    expect(MOONJO_SYSTEM_PROMPT).toContain("TEACHING METHODOLOGY");
    expect(MOONJO_SYSTEM_PROMPT).toContain("VOCABULARY");
    expect(MOONJO_SYSTEM_PROMPT).toContain("GRAMMAR");
  });

  it("includes formatting rules", () => {
    expect(MOONJO_SYSTEM_PROMPT).toContain("FORMATTING RULES");
    expect(MOONJO_SYSTEM_PROMPT).toContain("Hangul");
    expect(MOONJO_SYSTEM_PROMPT).toContain("romanization");
  });

  it("includes the character behavioral guidelines", () => {
    expect(MOONJO_SYSTEM_PROMPT).toContain("CHARACTER IDENTITY");
    expect(MOONJO_SYSTEM_PROMPT).toContain("SPEECH STYLE");
    expect(MOONJO_SYSTEM_PROMPT).toContain("PERSONALITY");
  });

  it("specifies no emoji rule", () => {
    expect(MOONJO_SYSTEM_PROMPT).toContain("Do not use emojis");
  });

  it("includes initial greeting instructions", () => {
    expect(MOONJO_SYSTEM_PROMPT).toContain("INITIAL GREETING");
    expect(MOONJO_SYSTEM_PROMPT).toContain("Eden Goshiwon");
  });
});
