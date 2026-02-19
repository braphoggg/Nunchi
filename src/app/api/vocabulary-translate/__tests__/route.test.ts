import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock rate limiter
vi.mock("@/lib/security", () => ({
  checkRateLimit: vi.fn(() => ({ allowed: true })),
}));

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
import { checkRateLimit } from "@/lib/security";

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

describe("POST /api/vocabulary-translate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // --- Validation ---

  it("returns 400 when words is missing", async () => {
    const req = createRequest({});
    const response = await POST(req);
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toContain("non-empty array");
  });

  it("returns 400 when words is not an array", async () => {
    const req = createRequest({ words: "not an array" });
    const response = await POST(req);
    expect(response.status).toBe(400);
  });

  it("returns 400 when words is empty array", async () => {
    const req = createRequest({ words: [] });
    const response = await POST(req);
    expect(response.status).toBe(400);
  });

  it("returns 400 when words exceeds maximum (20)", async () => {
    const words = Array.from({ length: 21 }, (_, i) => `단어${i}`);
    const req = createRequest({ words });
    const response = await POST(req);
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toContain("Maximum 20");
  });

  it("returns 400 when all words are invalid (non-string/empty)", async () => {
    const req = createRequest({ words: [123, "", "   "] });
    const response = await POST(req);
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toContain("No valid words");
  });

  it("filters out invalid words but processes valid ones", async () => {
    const req = createRequest({ words: ["안녕하세요", 123, "감사합니다", ""] });
    const response = await POST(req);
    expect(response.status).toBe(200);
    expect(generateText).toHaveBeenCalledWith(
      expect.objectContaining({
        prompt: "1. 안녕하세요\n2. 감사합니다",
      })
    );
  });

  it("filters out words exceeding max length", async () => {
    const longWord = "가".repeat(101);
    const req = createRequest({ words: [longWord, "안녕"] });
    const response = await POST(req);
    expect(response.status).toBe(200);
    expect(generateText).toHaveBeenCalledWith(
      expect.objectContaining({
        prompt: "1. 안녕",
      })
    );
  });

  // --- Successful translation ---

  it("returns translations for valid input", async () => {
    const req = createRequest({ words: ["안녕하세요", "감사합니다"] });
    const response = await POST(req);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.translations).toEqual({
      "안녕하세요": "hello",
      "감사합니다": "thank you",
    });
  });

  it("calls generateText with correct parameters", async () => {
    const req = createRequest({ words: ["안녕"] });
    const response = await POST(req);
    expect(response.status).toBe(200);
    expect(generateText).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "mocked-model",
        temperature: 0.2,
        maxOutputTokens: 500,
      })
    );
  });

  it("trims words before processing", async () => {
    const req = createRequest({ words: ["  안녕하세요  "] });
    const response = await POST(req);
    expect(response.status).toBe(200);
    expect(generateText).toHaveBeenCalledWith(
      expect.objectContaining({
        prompt: "1. 안녕하세요",
      })
    );
  });

  // --- Rate limiting ---

  it("returns 429 when rate limited", async () => {
    vi.mocked(checkRateLimit).mockReturnValueOnce({
      allowed: false,
      retryAfterMs: 30000,
    });
    const req = createRequest({ words: ["안녕"] });
    const response = await POST(req);
    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBe("30");
  });

  // --- Error handling ---

  it("returns 500 when generateText throws", async () => {
    vi.mocked(generateText).mockRejectedValueOnce(new Error("Model error"));
    const req = createRequest({ words: ["안녕"] });
    const response = await POST(req);
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).toContain("Model error");
  });

  it("handles malformed JSON gracefully", async () => {
    const req = new Request("http://localhost:3000/api/vocabulary-translate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not json",
    });
    const response = await POST(req);
    expect(response.status).toBe(500);
  });

  // --- Response parsing ---

  it("handles LLM response with parentheses format", async () => {
    vi.mocked(generateText).mockResolvedValueOnce({
      text: "1) hello\n2) thank you",
    } as never);
    const req = createRequest({ words: ["안녕하세요", "감사합니다"] });
    const response = await POST(req);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.translations["안녕하세요"]).toBe("hello");
  });

  it("handles LLM response with trailing punctuation", async () => {
    vi.mocked(generateText).mockResolvedValueOnce({
      text: "1. hello.\n2. thank you!",
    } as never);
    const req = createRequest({ words: ["안녕하세요", "감사합니다"] });
    const response = await POST(req);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.translations["안녕하세요"]).toBe("hello");
    expect(body.translations["감사합니다"]).toBe("thank you");
  });
});
