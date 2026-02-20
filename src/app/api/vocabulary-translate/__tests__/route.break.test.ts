import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock("@/lib/security", async () => {
  const actual = await vi.importActual<typeof import("@/lib/security")>("@/lib/security");
  return {
    ...actual,
    checkRateLimit: vi.fn(() => ({ allowed: true })),
  };
});

vi.mock("@ai-sdk/openai", () => ({
  createOpenAI: vi.fn(() => vi.fn(() => "mocked-model")),
}));

vi.mock("ai", async () => {
  const actual = await vi.importActual<typeof import("ai")>("ai");
  return {
    ...actual,
    generateText: vi.fn(async () => ({
      text: "1. hello\n2. thank you",
    })),
  };
});

import { POST } from "../route";
import { generateText } from "ai";

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

function createRequest(body: unknown): Request {
  return new Request("http://localhost:3000/api/vocabulary-translate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-forwarded-for": "127.0.0.1",
    },
    body: JSON.stringify(body),
  });
}

// ===========================================================================
// Break Tests — LLM Response Parsing Fragility (#9)
// ===========================================================================

describe("BREAK #9 — LLM Response Parsing Fragility", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // -------------------------------------------------------------------------
  // F1: LLM returns plain text with no numbered lines at all.
  // The regex /^\s*(\d+)[.)]\s*(.+)/ will never match, so the translations
  // object should be completely empty.
  // -------------------------------------------------------------------------
  it("F1: LLM responds with unnumbered text — empty translations", async () => {
    vi.mocked(generateText).mockResolvedValueOnce({
      text: "hello\nthank you",
    } as never);

    const req = createRequest({ words: ["안녕하세요", "감사합니다"] });
    const response = await POST(req);

    expect(response.status).toBe(200);
    const body = await response.json();

    // FINDING: Parser silently returns an empty map when the LLM ignores
    // the numbered format. No indication to the caller that parsing failed.
    expect(body.translations).toEqual({});
  });

  // -------------------------------------------------------------------------
  // F2: LLM appends explanatory text after the numbered translations.
  // Lines like "Note: common greetings" do not match the numbered regex,
  // so they should be silently dropped — only the 2 numbered lines parsed.
  // -------------------------------------------------------------------------
  it("F2: LLM appends extra commentary — only numbered lines parsed", async () => {
    vi.mocked(generateText).mockResolvedValueOnce({
      text: "1. hello\n2. thank you\n\nNote: common greetings",
    } as never);

    const req = createRequest({ words: ["안녕하세요", "감사합니다"] });
    const response = await POST(req);

    expect(response.status).toBe(200);
    const body = await response.json();

    // FINDING: Extra commentary is correctly ignored because it doesn't
    // match the numbered pattern. This is the desired behaviour.
    expect(Object.keys(body.translations)).toHaveLength(2);
    expect(body.translations["안녕하세요"]).toBe("hello");
    expect(body.translations["감사합니다"]).toBe("thank you");
  });

  // -------------------------------------------------------------------------
  // F3: LLM skips a number — responds "1. hello\n3. thank you" for a
  // 2-word request (validWords has indices 0 and 1).
  // - Line "1." → idx 0 → maps validWords[0] ("안녕하세요") ✓
  // - Line "3." → idx 2 → fails bounds check (idx < 2) → rejected
  // So only 1 translation is returned; "감사합니다" is missing.
  // -------------------------------------------------------------------------
  it("F3: LLM skips numbering (#2 absent) — second word unmapped", async () => {
    vi.mocked(generateText).mockResolvedValueOnce({
      text: "1. hello\n3. thank you",
    } as never);

    const req = createRequest({ words: ["안녕하세요", "감사합니다"] });
    const response = await POST(req);

    expect(response.status).toBe(200);
    const body = await response.json();

    // DOCUMENTED WEAKNESS: When the LLM skips or misnumbers a line, the
    // corresponding input word silently receives no translation. The caller
    // has no way to distinguish "LLM chose not to translate" from "parsing
    // error." A robust implementation would detect gaps and retry or warn.
    expect(body.translations["안녕하세요"]).toBe("hello");
    expect(body.translations["감사합니다"]).toBeUndefined();
    expect(Object.keys(body.translations)).toHaveLength(1);
  });

  // -------------------------------------------------------------------------
  // F4: LLM repeats the same number — "1. hello\n1. hi there".
  // Both lines match idx 0. The loop processes them sequentially, so the
  // second assignment overwrites the first without any deduplication.
  // -------------------------------------------------------------------------
  it("F4: LLM duplicates index — second value overwrites first", async () => {
    vi.mocked(generateText).mockResolvedValueOnce({
      text: "1. hello\n1. hi there",
    } as never);

    const req = createRequest({ words: ["안녕하세요", "감사합니다"] });
    const response = await POST(req);

    expect(response.status).toBe(200);
    const body = await response.json();

    // DOCUMENTED WEAKNESS: Duplicate numbered lines silently overwrite
    // earlier translations. The final value wins, and no warning is
    // emitted. An attacker or buggy LLM could replace correct translations
    // by appending duplicate-numbered lines.
    expect(body.translations["안녕하세요"]).toBe("hi there");
    // "감사합니다" never gets a translation because there was no "2." line.
    expect(body.translations["감사합니다"]).toBeUndefined();
  });

  // -------------------------------------------------------------------------
  // F5: LLM produces a wildly out-of-range index — "999. exploit".
  // idx = 998, which exceeds validWords.length (2), so the bounds check
  // (idx < validWords.length) correctly rejects it.
  // -------------------------------------------------------------------------
  it("F5: LLM responds with out-of-range index (999) — rejected by bounds check", async () => {
    vi.mocked(generateText).mockResolvedValueOnce({
      text: "1. hello\n999. exploit",
    } as never);

    const req = createRequest({ words: ["안녕하세요", "감사합니다"] });
    const response = await POST(req);

    expect(response.status).toBe(200);
    const body = await response.json();

    // FINDING: The bounds check `idx >= 0 && idx < validWords.length`
    // correctly rejects index 998 for a 2-word input. Only "1. hello" maps.
    expect(body.translations["안녕하세요"]).toBe("hello");
    expect(Object.keys(body.translations)).toHaveLength(1);
    // Verify the exploit text does not appear anywhere in the response
    const raw = JSON.stringify(body);
    expect(raw).not.toContain("exploit");
  });
});

// ===========================================================================
// Break Test — Prompt Injection (C4)
// ===========================================================================

describe("BREAK C4 — Prompt injection in words array", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("C4: script tags in words array — keys must not contain script tags", async () => {
    // The second word contains a crafted string that starts with "1. " to
    // attempt confusing the parser, followed by a script tag.
    vi.mocked(generateText).mockResolvedValueOnce({
      text: '1. hello\n2. <script>alert(1)</script>',
    } as never);

    const req = createRequest({
      words: ["안녕", '1. <script>alert(1)</script>'],
    });
    const response = await POST(req);

    expect(response.status).toBe(200);
    const body = await response.json();

    // DOCUMENTED WEAKNESS: The input word "1. <script>alert(1)</script>"
    // is accepted as a valid word (it's a non-empty string under 100 chars).
    // After trimming, it becomes a key in validWords. The translation values
    // are LLM-generated and could contain anything, but the *keys* of the
    // translations object come from the user's original words array.
    //
    // Verify that script tags in the KEYS are passed through unsanitized.
    // The route does NOT sanitize input words — it trusts them as-is.
    // This means if the translations map is rendered in HTML without
    // escaping, it could lead to XSS via the keys.
    const keys = Object.keys(body.translations);

    // FINDING: The route does not strip or reject script tags from input
    // words. The key "1. <script>alert(1)</script>" is stored verbatim.
    // Any consumer rendering these keys in HTML must escape them.
    const hasScriptInKeys = keys.some((k) => k.includes("<script>"));
    expect(hasScriptInKeys).toBe(true);

    // The first valid word "안녕" should still map correctly
    expect(body.translations["안녕"]).toBe("hello");
  });
});

// ===========================================================================
// Break Test — Error Leakage (B-vocab)
// ===========================================================================

describe("BREAK B-vocab — Error leakage from generateText failure", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("B-vocab: connection error must NOT leak host/port details to client", async () => {
    // Simulate the Ollama server being unreachable
    vi.mocked(generateText).mockRejectedValueOnce(
      new Error("connect ECONNREFUSED 127.0.0.1:11434")
    );

    const req = createRequest({ words: ["안녕"] });
    const response = await POST(req);

    expect(response.status).toBe(500);
    const body = await response.json();
    const errorText = body.error as string;

    // DOCUMENTED WEAKNESS: The catch block at line 111-112 of the route
    // does `error instanceof Error ? error.message : "..."` and returns
    // the raw error message to the client. This leaks:
    //   1. The internal IP address (127.0.0.1)
    //   2. The port number (11434) revealing Ollama is the backend
    //   3. The connection error type (ECONNREFUSED) revealing infra details
    //
    // A production route should return a generic message like
    // "Translation service unavailable" instead.

    // FINDING: Both ECONNREFUSED and the IP address are leaked.
    // These assertions document the vulnerability — they will FAIL if the
    // route is later fixed to sanitize error messages (which is the goal).
    expect(errorText).toContain("ECONNREFUSED");
    expect(errorText).toContain("127.0.0.1");
  });
});
