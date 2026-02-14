import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@ai-sdk/openai", () => ({
  createOpenAI: vi.fn(() => vi.fn(() => "mocked-model")),
}));

vi.mock("ai", async () => {
  const actual = await vi.importActual<typeof import("ai")>("ai");
  return {
    ...actual,
    generateText: vi.fn(async () => ({
      text: "Hello, nice to meet you.",
    })),
  };
});

import { POST } from "../route";
import { generateText } from "ai";

function createRequest(body: unknown): Request {
  return new Request("http://localhost:3000/api/translate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/translate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 400 when text is missing", async () => {
    const req = createRequest({});
    const response = await POST(req);
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toContain("text is required");
  });

  it("returns 400 when text is empty", async () => {
    const req = createRequest({ text: "   " });
    const response = await POST(req);
    expect(response.status).toBe(400);
  });

  it("returns 400 when text is not a string", async () => {
    const req = createRequest({ text: 123 });
    const response = await POST(req);
    expect(response.status).toBe(400);
  });

  it("returns 400 when text exceeds 5000 characters", async () => {
    const req = createRequest({ text: "a".repeat(5001) });
    const response = await POST(req);
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toContain("too long");
  });

  it("calls generateText and returns translation for valid input", async () => {
    const req = createRequest({ text: "안녕하세요, 만나서 반갑습니다." });
    const response = await POST(req);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.translation).toBe("Hello, nice to meet you.");
    expect(generateText).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "mocked-model",
        prompt: "안녕하세요, 만나서 반갑습니다.",
        temperature: 0.3,
        maxOutputTokens: 1000,
      })
    );
  });

  it("handles malformed JSON gracefully", async () => {
    const req = new Request("http://localhost:3000/api/translate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not json",
    });
    const response = await POST(req);
    expect(response.status).toBe(500);
  });

  it("returns 500 when generateText throws", async () => {
    vi.mocked(generateText).mockRejectedValueOnce(new Error("Model error"));

    const req = createRequest({ text: "안녕하세요" });
    const response = await POST(req);
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).toContain("Model error");
  });
});
