import { google } from "@ai-sdk/google";
import { generateText } from "ai";
import { checkRateLimit } from "@/lib/security";

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
    const { text } = body;

    if (typeof text !== "string" || text.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: "text is required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    if (text.length > 5000) {
      return new Response(
        JSON.stringify({ error: "Text too long" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const result = await generateText({
      model: google("gemini-2.5-flash"),
      system:
        "You are a Korean-to-English translator. Translate the user's message into English. " +
        "Rules: " +
        "1. Output ONLY the translated text — no preamble, no postamble, no explanations, no additional examples. " +
        "2. Replace every Korean word or phrase with its English equivalent. " +
        "3. Remove any romanization shown in parentheses. " +
        "4. Preserve **bold markers** exactly as they appear around the corresponding English words. " +
        "5. Preserve line breaks and paragraph spacing. " +
        "6. Do not add anything that was not in the original message.",
      prompt: text,
      temperature: 0.1,
      maxOutputTokens: 2000,
    });

    return new Response(
      JSON.stringify({ translation: result.text }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    // Log full error server-side only; never leak internals to the client
    console.error("[translate route error]", error);

    return new Response(
      JSON.stringify({ error: "An unexpected error occurred" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
