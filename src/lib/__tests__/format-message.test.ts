import { describe, it, expect } from "vitest";
import { formatMessage } from "../format-message";
import React from "react";

describe("formatMessage", () => {
  it("returns plain text wrapped in span elements", () => {
    const result = formatMessage("Hello world");
    expect(result).toHaveLength(1);
    const element = result[0] as React.ReactElement;
    expect(element.type).toBe("span");
    expect(element.props.children).toBe("Hello world");
  });

  it("formats bold text with **markers** as <strong> elements", () => {
    const result = formatMessage("Learn **한국어** today");
    expect(result).toHaveLength(3);

    const [before, bold, after] = result as React.ReactElement[];
    expect(before.type).toBe("span");
    expect(before.props.children).toBe("Learn ");

    expect(bold.type).toBe("strong");
    expect(bold.props.children).toBe("한국어");
    expect(bold.props.className).toContain("text-goshiwon-yellow");

    expect(after.type).toBe("span");
    expect(after.props.children).toBe(" today");
  });

  it("handles multiple bold sections", () => {
    const result = formatMessage("**안녕** means **hello**");
    const boldElements = (result as React.ReactElement[]).filter(
      (el) => el.type === "strong"
    );
    expect(boldElements).toHaveLength(2);
    expect(boldElements[0].props.children).toBe("안녕");
    expect(boldElements[1].props.children).toBe("hello");
  });

  it("handles empty string", () => {
    const result = formatMessage("");
    // Empty string may produce 0 or 1 token depending on implementation
    expect(result.length).toBeLessThanOrEqual(1);
  });

  it("handles string with only bold markers", () => {
    const result = formatMessage("**only bold**");
    const bold = (result as React.ReactElement[]).find(
      (el) => el.type === "strong"
    );
    expect(bold).toBeDefined();
    expect(bold?.props.children).toBe("only bold");
  });

  it("assigns unique keys to all elements", () => {
    const result = formatMessage("a **b** c **d** e") as React.ReactElement[];
    const keys = result.map((el) => el.key);
    const uniqueKeys = new Set(keys);
    expect(uniqueKeys.size).toBe(keys.length);
  });

  it("does not format incomplete bold markers", () => {
    const result = formatMessage("**incomplete");
    expect(result).toHaveLength(1);
    const element = result[0] as React.ReactElement;
    expect(element.type).toBe("span");
  });

  it("handles Korean characters in bold", () => {
    const result = formatMessage(
      "**감사합니다** (gamsahamnida) means thank you"
    );
    const bold = (result as React.ReactElement[]).find(
      (el) => el.type === "strong"
    );
    expect(bold?.props.children).toBe("감사합니다");
  });

  // ── Strikethrough (error correction) ──

  it("formats ~~strikethrough~~ text with line-through styling", () => {
    const result = formatMessage("~~잘못~~ → **맞아요** (majayo)");
    const elements = result as React.ReactElement[];

    const strike = elements.find((el) =>
      el.props?.className?.includes("line-through")
    );
    expect(strike).toBeDefined();
    expect(strike?.props.children).toBe("잘못");

    const bold = elements.find((el) => el.type === "strong");
    expect(bold?.props.children).toBe("맞아요");
  });

  it("formats → as a styled arrow separator", () => {
    const result = formatMessage("before → after");
    const elements = result as React.ReactElement[];
    const arrow = elements.find((el) => el.props?.children === "→");
    expect(arrow).toBeDefined();
  });

  it("handles correction pattern: ~~mistake~~ → **correction**", () => {
    const result = formatMessage("~~감사해요~~ → **감사합니다** (gamsahamnida)");
    const elements = result as React.ReactElement[];

    // Should have strike, arrow, bold, and text parts
    expect(elements.length).toBeGreaterThanOrEqual(3);

    const strike = elements.find((el) =>
      el.props?.className?.includes("line-through")
    );
    expect(strike?.props.children).toBe("감사해요");

    const bold = elements.find((el) => el.type === "strong");
    expect(bold?.props.children).toBe("감사합니다");
  });
});
