import { createOpenAI } from "@ai-sdk/openai";
import { generateText } from "ai";
import { checkRateLimit } from "@/lib/security";

const ollama = createOpenAI({
  baseURL: "http://localhost:11434/v1",
  apiKey: "ollama",
});

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
      model: ollama("exaone3.5:7.8b"),
      system:
        "You are a translator. Translate the following Korean teaching message into English. " +
        "Keep any romanization as-is. Translate Korean words and sentences to English. " +
        "Preserve the structure and formatting (including ** markers for bold). " +
        "Only output the translation, nothing else.",
      prompt: text,
      temperature: 0.3,
      maxOutputTokens: 1000,
    });

    return new Response(
      JSON.stringify({ translation: result.text }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[translate route error]", error);

    const message =
      error instanceof Error ? error.message : "An unexpected error occurred";

    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
