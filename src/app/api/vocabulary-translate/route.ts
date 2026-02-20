import { google } from "@ai-sdk/google";
import { generateText } from "ai";
import { checkRateLimit } from "@/lib/security";

/** Maximum words per request */
const MAX_WORDS = 20;
/** Maximum length per Korean word */
const MAX_WORD_LENGTH = 100;

export async function POST(req: Request) {
  try {
    const ip = req.headers.get("x-forwarded-for") ?? "unknown";
    const rateCheck = checkRateLimit(ip);
    if (!rateCheck.allowed) {
      return new Response(
        JSON.stringify({ error: "Too many requests. Please wait." }),
        {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            "Retry-After": String(
              Math.ceil((rateCheck.retryAfterMs ?? 60000) / 1000)
            ),
          },
        }
      );
    }

    const body = await req.json();
    const { words } = body;

    // Validate input: array of strings
    if (!Array.isArray(words) || words.length === 0) {
      return new Response(
        JSON.stringify({ error: "words must be a non-empty array" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    if (words.length > MAX_WORDS) {
      return new Response(
        JSON.stringify({ error: `Maximum ${MAX_WORDS} words per request` }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Validate each word is a string and within length
    const validWords: string[] = [];
    for (const w of words) {
      if (typeof w !== "string" || w.trim().length === 0) continue;
      if (w.length > MAX_WORD_LENGTH) continue;
      validWords.push(w.trim());
    }

    if (validWords.length === 0) {
      return new Response(
        JSON.stringify({ error: "No valid words provided" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Build the prompt: ask LLM to translate each Korean word/phrase
    const wordList = validWords
      .map((w, i) => `${i + 1}. ${w}`)
      .join("\n");

    const result = await generateText({
      model: google("gemini-2.5-flash"),
      system:
        "You are a Korean-English dictionary. For each Korean word or phrase given, " +
        "provide ONLY its English translation. " +
        "Respond with one translation per line, numbered to match the input. " +
        "Keep translations concise (1-5 words). " +
        "Format: NUMBER. english translation\n" +
        "Example input:\n1. 안녕하세요\n2. 감사합니다\n" +
        "Example output:\n1. hello\n2. thank you\n" +
        "Output ONLY the numbered translations, nothing else.",
      prompt: wordList,
      temperature: 0.2,
      maxOutputTokens: 500,
    });

    // Parse the LLM response into a map of korean → english
    const translations: Record<string, string> = {};
    const lines = result.text.trim().split("\n");

    for (const line of lines) {
      // Match "NUMBER. translation" or "NUMBER) translation"
      const lineMatch = line.match(/^\s*(\d+)[.)]\s*(.+)/);
      if (lineMatch) {
        const idx = parseInt(lineMatch[1], 10) - 1;
        const translation = lineMatch[2].trim().replace(/[.!?,;:]+$/, "");
        if (idx >= 0 && idx < validWords.length && translation) {
          translations[validWords[idx]] = translation;
        }
      }
    }

    return new Response(
      JSON.stringify({ translations }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[vocabulary-translate route error]", error);

    const message =
      error instanceof Error ? error.message : "An unexpected error occurred";

    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
