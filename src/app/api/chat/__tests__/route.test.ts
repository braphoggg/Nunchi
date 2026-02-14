import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the AI SDK modules before importing the route
vi.mock("@ai-sdk/openai", () => ({
  createOpenAI: vi.fn(() => vi.fn(() => "mocked-model")),
}));

vi.mock("ai", async () => {
  const actual = await vi.importActual<typeof import("ai")>("ai");
  return {
    ...actual,
    streamText: vi.fn(() => ({
      toUIMessageStreamResponse: vi.fn(
        () => new Response("streamed response", { status: 200 })
      ),
    })),
    convertToModelMessages: vi.fn(
      async (messages: Array<{ role: string; parts?: Array<{ type: string; text?: string }> }>) =>
        messages.map((m) => ({
          role: m.role,
          content:
            m.parts
              ?.filter((p) => p.type === "text")
              .map((p) => p.text)
              .join("") ?? "",
        }))
    ),
  };
});

// Import after mocks are set up
import { POST } from "../route";
import { streamText, convertToModelMessages } from "ai";

function createRequest(body: unknown): Request {
  return new Request("http://localhost:3000/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/chat", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 400 when messages is not an array", async () => {
    const req = createRequest({ messages: "not an array" });
    const response = await POST(req);
    expect(response.status).toBe(400);
  });

  it("returns 400 when messages exceeds limit", async () => {
    const messages = Array.from({ length: 51 }, (_, i) => ({
      role: "user",
      parts: [{ type: "text", text: `msg ${i}` }],
    }));
    const req = createRequest({ messages });
    const response = await POST(req);
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toContain("Too many");
  });

  it("returns 400 for overly long messages", async () => {
    const req = createRequest({
      messages: [
        {
          role: "user",
          parts: [{ type: "text", text: "a".repeat(2001) }],
        },
      ],
    });
    const response = await POST(req);
    expect(response.status).toBe(400);
  });

  it("calls convertToModelMessages and streamText for valid input", async () => {
    const messages = [
      { role: "user", parts: [{ type: "text", text: "Teach me Korean" }] },
    ];
    const req = createRequest({ messages });
    const response = await POST(req);

    expect(response.status).toBe(200);
    expect(convertToModelMessages).toHaveBeenCalledWith(messages);
    expect(streamText).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "mocked-model",
        messages: expect.any(Array),
        temperature: 0.85,
        maxOutputTokens: 1000,
      })
    );
  });

  it("returns stream response from streamText", async () => {
    const req = createRequest({
      messages: [
        { role: "user", parts: [{ type: "text", text: "Hello" }] },
      ],
    });
    const response = await POST(req);
    expect(response.status).toBe(200);
    const text = await response.text();
    expect(text).toBe("streamed response");
  });

  it("handles malformed JSON gracefully", async () => {
    const req = new Request("http://localhost:3000/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not json at all",
    });
    const response = await POST(req);
    expect(response.status).toBe(500);
  });

  it("returns 400 for invalid message roles", async () => {
    const req = createRequest({
      messages: [
        { role: "admin", parts: [{ type: "text", text: "hi" }] },
      ],
    });
    const response = await POST(req);
    expect(response.status).toBe(400);
  });
});
