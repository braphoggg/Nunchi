import { createOpenAI } from "@ai-sdk/openai";
import { streamText, convertToModelMessages, UIMessage } from "ai";
import { MOONJO_SYSTEM_PROMPT } from "@/lib/system-prompt";
import { validateMessages, checkRateLimit } from "@/lib/security";
import { generateMoodSystemAddendum } from "@/lib/mood-engine";

const ollama = createOpenAI({
  baseURL: "http://localhost:11434/v1",
  apiKey: "ollama",
});

export async function POST(req: Request) {
  try {
    // Rate limiting
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
    const { messages } = body;

    // Input validation
    const validation = validateMessages(messages);
    if (!validation.valid) {
      return new Response(
        JSON.stringify({ error: validation.error }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Strip non-standard parts (e.g. item_reference) and providerMetadata that
    // convertToModelMessages can't handle or that trigger item_reference generation
    // in the OpenAI provider. Ollama doesn't support the Responses API store feature.
    const KNOWN_PART_TYPES = new Set(["text", "reasoning", "file", "tool", "data", "step-start"]);
    const cleanedMessages = (messages as UIMessage[]).map((msg) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { providerMetadata, ...rest } = msg as UIMessage & { providerMetadata?: unknown };
      return {
        ...rest,
        parts: msg.parts
          .filter((p: { type: string }) => KNOWN_PART_TYPES.has(p.type))
          .map((p) => {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { providerMetadata: _pm, ...partRest } = p as typeof p & { providerMetadata?: unknown };
            return partRest as typeof p;
          }),
      };
    });

    // Compute mood based on Korean usage in user messages
    const simpleMessages = cleanedMessages.map((msg) => ({
      role: msg.role,
      content: msg.parts
        .filter((p: { type: string }) => p.type === "text")
        .map((p: { type: string; text?: string }) => p.text ?? "")
        .join(""),
    }));
    const moodAddendum = generateMoodSystemAddendum(simpleMessages);

    // Convert UIMessages to ModelMessages (critical for AI SDK v6 compatibility)
    const modelMessages = await convertToModelMessages(cleanedMessages);

    const result = streamText({
      model: ollama("exaone3.5:7.8b"),
      system: MOONJO_SYSTEM_PROMPT + moodAddendum,
      messages: modelMessages,
      temperature: 0.85,
      maxOutputTokens: 1000,
      providerOptions: {
        openai: { store: false },
      },
    });

    return result.toUIMessageStreamResponse();
  } catch (error) {
    console.error("[chat route error]", error);

    const message =
      error instanceof Error ? error.message : "An unexpected error occurred";

    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
