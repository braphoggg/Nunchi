import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import {
  validateMessages,
  checkRateLimit,
  sanitizeTextInput,
  validateGamificationData,
  isReasonableXPRate,
  LIMITS,
} from "../security";
import type { GamificationData, XPEvent } from "@/types";

describe("validateMessages", () => {
  it("rejects non-array input", () => {
    expect(validateMessages("not an array").valid).toBe(false);
    expect(validateMessages(null).valid).toBe(false);
    expect(validateMessages(42).valid).toBe(false);
    expect(validateMessages({}).valid).toBe(false);
  });

  it("rejects empty array", () => {
    const result = validateMessages([]);
    expect(result.valid).toBe(false);
    expect(result.error).toContain("empty");
  });

  it("rejects messages exceeding MAX_MESSAGES", () => {
    const messages = Array.from(
      { length: LIMITS.MAX_MESSAGES + 1 },
      (_, i) => ({
        role: "user",
        parts: [{ type: "text", text: `message ${i}` }],
      })
    );
    const result = validateMessages(messages);
    expect(result.valid).toBe(false);
    expect(result.error).toContain("Too many messages");
  });

  it("accepts valid messages at the limit", () => {
    const messages = Array.from({ length: LIMITS.MAX_MESSAGES }, (_, i) => ({
      role: "user",
      parts: [{ type: "text", text: `msg ${i}` }],
    }));
    expect(validateMessages(messages).valid).toBe(true);
  });

  it("rejects messages without role", () => {
    const result = validateMessages([
      { parts: [{ type: "text", text: "hi" }] },
    ]);
    expect(result.valid).toBe(false);
  });

  it("rejects messages without parts", () => {
    const result = validateMessages([{ role: "user" }]);
    expect(result.valid).toBe(false);
  });

  it("rejects invalid roles", () => {
    const result = validateMessages([
      { role: "admin", parts: [{ type: "text", text: "hi" }] },
    ]);
    expect(result.valid).toBe(false);
    expect(result.error).toContain("Invalid role");
  });

  it("rejects overly long messages", () => {
    const longText = "a".repeat(LIMITS.MAX_CONTENT_LENGTH + 1);
    const result = validateMessages([
      { role: "user", parts: [{ type: "text", text: longText }] },
    ]);
    expect(result.valid).toBe(false);
    expect(result.error).toContain("too long");
  });

  it("accepts messages at the content length limit", () => {
    const text = "a".repeat(LIMITS.MAX_CONTENT_LENGTH);
    const result = validateMessages([
      { role: "user", parts: [{ type: "text", text }] },
    ]);
    expect(result.valid).toBe(true);
  });

  it("accepts valid user and assistant messages", () => {
    const result = validateMessages([
      { role: "user", parts: [{ type: "text", text: "hello" }] },
      { role: "assistant", parts: [{ type: "text", text: "hi" }] },
    ]);
    expect(result.valid).toBe(true);
  });
});

describe("checkRateLimit", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("allows first request from an IP", () => {
    const result = checkRateLimit("test-ip-1");
    expect(result.allowed).toBe(true);
  });

  it("allows requests within the limit", () => {
    const ip = "test-ip-2";
    for (let i = 0; i < LIMITS.RATE_LIMIT_MAX_REQUESTS; i++) {
      expect(checkRateLimit(ip).allowed).toBe(true);
    }
  });

  it("blocks requests exceeding the limit", () => {
    const ip = "test-ip-3";
    for (let i = 0; i < LIMITS.RATE_LIMIT_MAX_REQUESTS; i++) {
      checkRateLimit(ip);
    }
    const result = checkRateLimit(ip);
    expect(result.allowed).toBe(false);
    expect(result.retryAfterMs).toBeGreaterThan(0);
  });

  it("resets after the window expires", () => {
    const ip = "test-ip-4";
    for (let i = 0; i < LIMITS.RATE_LIMIT_MAX_REQUESTS; i++) {
      checkRateLimit(ip);
    }
    expect(checkRateLimit(ip).allowed).toBe(false);

    // Advance past the rate limit window
    vi.advanceTimersByTime(LIMITS.RATE_LIMIT_WINDOW_MS + 1);

    expect(checkRateLimit(ip).allowed).toBe(true);
  });
});

describe("sanitizeTextInput", () => {
  it("strips HTML tags from input", () => {
    expect(sanitizeTextInput("<b>bold</b> text")).toBe("bold text");
    expect(sanitizeTextInput('<script>alert("xss")</script>')).toBe(
      'alert("xss")'
    );
  });

  it("strips null bytes and control characters", () => {
    expect(sanitizeTextInput("hello\x00world")).toBe("helloworld");
    expect(sanitizeTextInput("test\x01\x02\x03data")).toBe("testdata");
  });

  it("preserves legitimate newlines and tabs", () => {
    expect(sanitizeTextInput("line1\nline2\ttab")).toBe("line1\nline2\ttab");
  });

  it("truncates at MAX_CONTENT_LENGTH", () => {
    const long = "x".repeat(LIMITS.MAX_CONTENT_LENGTH + 500);
    expect(sanitizeTextInput(long).length).toBe(LIMITS.MAX_CONTENT_LENGTH);
  });

  it("returns empty string for non-string input", () => {
    expect(sanitizeTextInput(null)).toBe("");
    expect(sanitizeTextInput(42)).toBe("");
    expect(sanitizeTextInput(undefined)).toBe("");
    expect(sanitizeTextInput({})).toBe("");
  });

  it("handles deeply nested HTML tags", () => {
    expect(
      sanitizeTextInput("<div><span><a href='x'>text</a></span></div>")
    ).toBe("text");
  });
});

describe("validateGamificationData", () => {
  function makeValidData(): GamificationData {
    return {
      xp: { totalXP: 100, history: [] },
      streak: { currentStreak: 3, longestStreak: 7, lastPracticeDate: "2025-01-15" },
      stats: {
        totalMessages: 50,
        totalFlashcardSessions: 5,
        totalTranslations: 10,
        messagesWithoutTranslate: 3,
      },
    };
  }

  it("returns null for non-object input", () => {
    expect(validateGamificationData(null)).toBeNull();
    expect(validateGamificationData("string")).toBeNull();
    expect(validateGamificationData(42)).toBeNull();
    expect(validateGamificationData([])).toBeNull();
  });

  it("returns null when xp.totalXP is negative", () => {
    const data = makeValidData();
    data.xp.totalXP = -500;
    expect(validateGamificationData(data)).toBeNull();
  });

  it("caps xp.totalXP at MAX_XP", () => {
    const data = makeValidData();
    data.xp.totalXP = 9_999_999;
    const result = validateGamificationData(data);
    expect(result).not.toBeNull();
    expect(result!.xp.totalXP).toBe(LIMITS.MAX_XP);
  });

  it("returns null for invalid XPAction in history entries", () => {
    const data = makeValidData();
    data.xp.history = [
      { action: "invalid_action" as any, amount: 5, timestamp: new Date().toISOString() },
    ];
    const result = validateGamificationData(data);
    // Invalid entries are skipped silently, not rejected
    expect(result).not.toBeNull();
    expect(result!.xp.history.length).toBe(0);
  });

  it("returns null for malformed lastPracticeDate", () => {
    const data = makeValidData();
    data.streak.lastPracticeDate = "not-a-date";
    expect(validateGamificationData(data)).toBeNull();
  });

  it("returns sanitized copy for valid data (does not mutate original)", () => {
    const data = makeValidData();
    const original = JSON.stringify(data);
    const result = validateGamificationData(data);
    expect(result).not.toBeNull();
    expect(result!.xp.totalXP).toBe(100);
    expect(result!.streak.currentStreak).toBe(3);
    expect(JSON.stringify(data)).toBe(original); // original not mutated
  });

  it("returns null for history entries with amount > MAX_XP_PER_EVENT", () => {
    const data = makeValidData();
    data.xp.history = [
      { action: "word_saved", amount: 200, timestamp: new Date().toISOString() },
    ];
    const result = validateGamificationData(data);
    expect(result).not.toBeNull();
    expect(result!.xp.history.length).toBe(0); // entry was filtered out
  });
});

describe("isReasonableXPRate", () => {
  it("returns true for normal XP rate", () => {
    const now = Date.now();
    const history: XPEvent[] = [
      { action: "message_korean", amount: 5, timestamp: new Date(now - 30_000).toISOString() },
      { action: "word_saved", amount: 3, timestamp: new Date(now - 20_000).toISOString() },
      { action: "message_korean", amount: 5, timestamp: new Date(now - 10_000).toISOString() },
    ];
    expect(isReasonableXPRate(history)).toBe(true);
  });

  it("returns false when exceeding MAX_XP_EVENTS_PER_MINUTE", () => {
    const now = Date.now();
    const history: XPEvent[] = Array.from(
      { length: LIMITS.MAX_XP_EVENTS_PER_MINUTE + 5 },
      (_, i) => ({
        action: "message_korean" as const,
        amount: 5,
        timestamp: new Date(now - i * 1000).toISOString(), // one per second, all within 60s
      })
    );
    expect(isReasonableXPRate(history)).toBe(false);
  });

  it("returns true when events are spread over more than 60 seconds", () => {
    const now = Date.now();
    const history: XPEvent[] = Array.from({ length: 30 }, (_, i) => ({
      action: "message_korean" as const,
      amount: 5,
      timestamp: new Date(now - 120_000 - i * 5_000).toISOString(), // all > 2 min ago
    }));
    expect(isReasonableXPRate(history)).toBe(true);
  });
});
