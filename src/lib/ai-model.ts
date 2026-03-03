import { google } from "@ai-sdk/google";

const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

export function getModel() {
  return google(GEMINI_MODEL);
}
