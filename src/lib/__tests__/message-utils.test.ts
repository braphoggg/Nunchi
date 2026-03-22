import { describe, it, expect } from "vitest";
import { getTextContent } from "../message-utils";
import type { UIMessage } from "ai";

function makeMessage(
  parts: Array<{ type: string; text?: string }>,
  role: "assistant" | "user" = "assistant",
): UIMessage {
  return {
    id: "msg-1",
    role,
    parts,
  } as UIMessage;
}

describe("getTextContent", () => {
  it("extracts text from a single text part", () => {
    const msg = makeMessage([{ type: "text", text: "안녕하세요" }]);
    expect(getTextContent(msg)).toBe("안녕하세요");
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

describe("THOUGHT leak stripping", () => {
  it("strips THOUGHT: block followed by Korean content", () => {
    const msg = makeMessage([{
      type: "text",
      text: 'THOUGHT: The student has successfully pronounced "잘 왔어요". I will acknowledge their success.\n네, 맞아요. (ne, majayo.) 반갑습니다.',
    }]);
    expect(getTextContent(msg)).toBe("네, 맞아요. (ne, majayo.) 반갑습니다.");
  });

  it("strips multi-line THOUGHT block", () => {
    const msg = makeMessage([{
      type: "text",
      text: "THOUGHT: The student wrote something good.\nI will introduce a new greeting.\nI will also gently remind them about asking for their name.\n\n네, 맞아요. (ne, majayo.)",
    }]);
    expect(getTextContent(msg)).toBe("네, 맞아요. (ne, majayo.)");
  });

  it("strips THOUGHT block followed by bold markdown content", () => {
    const msg = makeMessage([{
      type: "text",
      text: "THOUGHT: I should teach vocabulary.\n\n**안녕하세요** (annyeonghaseyo)",
    }]);
    expect(getTextContent(msg)).toBe("**안녕하세요** (annyeonghaseyo)");
  });

  it("does not strip from user messages", () => {
    const msg = makeMessage(
      [{ type: "text", text: "THOUGHT: this is user text" }],
      "user",
    );
    expect(getTextContent(msg)).toBe("THOUGHT: this is user text");
  });

  it("does not strip when no THOUGHT prefix", () => {
    const msg = makeMessage([{
      type: "text",
      text: "안녕하세요. (annyeonghaseyo.) 반갑습니다.",
    }]);
    expect(getTextContent(msg)).toBe("안녕하세요. (annyeonghaseyo.) 반갑습니다.");
  });

  it("handles THOUGHT: case-insensitively", () => {
    const msg = makeMessage([{
      type: "text",
      text: "Thought: planning response.\n\n안녕하세요.",
    }]);
    expect(getTextContent(msg)).toBe("안녕하세요.");
  });

  it("falls back to original if stripping would remove everything", () => {
    const msg = makeMessage([{
      type: "text",
      text: "THOUGHT: just reasoning, no Korean at all.",
    }]);
    expect(getTextContent(msg)).toBe("THOUGHT: just reasoning, no Korean at all.");
  });

  it("preserves content when THOUGHT appears mid-message (not at start)", () => {
    const msg = makeMessage([{
      type: "text",
      text: "안녕하세요. THOUGHT: this is not at the start.",
    }]);
    expect(getTextContent(msg)).toBe("안녕하세요. THOUGHT: this is not at the start.");
  });
});
