import { createGoogleGenerativeAI } from "@ai-sdk/google";

const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

export function getModel(apiKey?: string) {
  const key = apiKey || process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!key) {
    throw new Error("No API key provided");
  }
  const provider = createGoogleGenerativeAI({ apiKey: key });
  return provider(GEMINI_MODEL);
}
