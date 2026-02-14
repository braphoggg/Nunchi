import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { validateMessages, checkRateLimit, LIMITS } from "../security";

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
