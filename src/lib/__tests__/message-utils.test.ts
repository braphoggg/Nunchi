import { describe, it, expect } from "vitest";
import { getTextContent } from "../message-utils";
import type { UIMessage } from "ai";

function makeMessage(parts: Array<{ type: string; text?: string }>): UIMessage {
  return {
    id: "msg-1",
    role: "assistant",
    parts,
  } as UIMessage;
}

describe("getTextContent", () => {
  it("extracts text from a single text part", () => {
    const msg = makeMessage([{ type: "text", text: "Hello 안녕" }]);
    expect(getTextContent(msg)).toBe("Hello 안녕");
  });

  it("concatenates multiple text parts", () => {
    const msg = makeMessage([
      { type: "text", text: "Part 1. " },
      { type: "text", text: "Part 2." },
    ]);
    expect(getTextContent(msg)).toBe("Part 1. Part 2.");
  });

  it("ignores non-text parts", () => {
    const msg = makeMessage([
      { type: "text", text: "Hello" },
      { type: "tool-invocation" },
      { type: "text", text: " World" },
    ]);
    expect(getTextContent(msg)).toBe("Hello World");
  });

  it("returns empty string when no text parts exist", () => {
    const msg = makeMessage([{ type: "tool-invocation" }]);
    expect(getTextContent(msg)).toBe("");
  });

  it("returns empty string for empty parts array", () => {
    const msg = makeMessage([]);
    expect(getTextContent(msg)).toBe("");
  });
});
