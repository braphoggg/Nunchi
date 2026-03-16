import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock @ai-sdk/google before importing getModel
const mockProvider = vi.fn((modelName: string) => `model:${modelName}`);
vi.mock("@ai-sdk/google", () => ({
  createGoogleGenerativeAI: vi.fn(() => mockProvider),
}));

import { getModel } from "../ai-model";
import { createGoogleGenerativeAI } from "@ai-sdk/google";

describe("getModel", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset env
    process.env = { ...originalEnv };
    delete process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    delete process.env.GEMINI_MODEL;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  // ─── BYOK: explicit apiKey parameter ─────────────────────────────

  it("creates provider with explicit apiKey when provided", () => {
    const result = getModel("AIzaSyUserKey123");
    expect(createGoogleGenerativeAI).toHaveBeenCalledWith({
      apiKey: "AIzaSyUserKey123",
    });
    expect(result).toBe("model:gemini-2.5-flash");
  });

  it("uses explicit apiKey over env var", () => {
    process.env.GOOGLE_GENERATIVE_AI_API_KEY = "env-key";
    getModel("user-key");
    expect(createGoogleGenerativeAI).toHaveBeenCalledWith({
      apiKey: "user-key",
    });
  });

  // ─── Fallback to env var ──────────────────────────────────────────

  it("falls back to GOOGLE_GENERATIVE_AI_API_KEY env var when no apiKey", () => {
    process.env.GOOGLE_GENERATIVE_AI_API_KEY = "env-fallback-key";
    getModel();
    expect(createGoogleGenerativeAI).toHaveBeenCalledWith({
      apiKey: "env-fallback-key",
    });
  });

  it("falls back to env var when apiKey is undefined", () => {
    process.env.GOOGLE_GENERATIVE_AI_API_KEY = "env-key";
    getModel(undefined);
    expect(createGoogleGenerativeAI).toHaveBeenCalledWith({
      apiKey: "env-key",
    });
  });

  it("falls back to env var when apiKey is empty string", () => {
    process.env.GOOGLE_GENERATIVE_AI_API_KEY = "env-key";
    getModel("");
    expect(createGoogleGenerativeAI).toHaveBeenCalledWith({
      apiKey: "env-key",
    });
  });

  // ─── No key at all ───────────────────────────────────────────────

  it("throws when no apiKey and no env var", () => {
    expect(() => getModel()).toThrow("No API key provided");
  });

  it("throws when apiKey is empty and no env var", () => {
    expect(() => getModel("")).toThrow("No API key provided");
  });

  it("throws with specific error message for missing key", () => {
    try {
      getModel();
    } catch (e) {
      expect(e).toBeInstanceOf(Error);
      expect((e as Error).message).toBe("No API key provided");
    }
  });

  // ─── Model selection ──────────────────────────────────────────────

  it("uses default gemini-2.5-flash model", () => {
    getModel("some-key");
    expect(mockProvider).toHaveBeenCalledWith("gemini-2.5-flash");
  });

  it("returns the model instance from provider", () => {
    const result = getModel("some-key");
    expect(result).toBe("model:gemini-2.5-flash");
  });

  // ─── Provider creation ───────────────────────────────────────────

  it("creates a new provider on each call (no caching)", () => {
    getModel("key1");
    getModel("key2");
    expect(createGoogleGenerativeAI).toHaveBeenCalledTimes(2);
    expect(createGoogleGenerativeAI).toHaveBeenNthCalledWith(1, { apiKey: "key1" });
    expect(createGoogleGenerativeAI).toHaveBeenNthCalledWith(2, { apiKey: "key2" });
  });
});
