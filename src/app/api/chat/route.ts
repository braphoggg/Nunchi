import { streamText, convertToModelMessages, UIMessage } from "ai";
import { getModel } from "@/lib/ai-model";
import { buildSystemPrompt } from "@/lib/system-prompt";
import { validateMessages, checkRateLimit } from "@/lib/security";
import { generateMoodSystemAddendum } from "@/lib/mood-engine";

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
    const { messages, context } = body;

    // Input validation
    const validation = validateMessages(messages);
    if (!validation.valid) {
      return new Response(
        JSON.stringify({ error: validation.error }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Strip non-standard parts (e.g. item_reference) and providerMetadata that
    // convertToModelMessages can't handle.
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

    // Build full system prompt with dynamic context
    // Context is optional — the prompt works without it (backward compatible)
    const safeContext = context && typeof context === "object" ? context : {};
    const systemPrompt = buildSystemPrompt({
      moodAddendum,
      rankKorean: typeof safeContext.rankKorean === "string" ? safeContext.rankKorean : undefined,
      rankEnglish: typeof safeContext.rankEnglish === "string" ? safeContext.rankEnglish : undefined,
      totalXP: typeof safeContext.totalXP === "number" ? safeContext.totalXP : undefined,
      vocabCount: typeof safeContext.vocabCount === "number" ? safeContext.vocabCount : undefined,
      streakDays: typeof safeContext.streakDays === "number" ? safeContext.streakDays : undefined,
      activeTopic: typeof safeContext.activeTopic === "string" ? safeContext.activeTopic : undefined,
      activeTopicKr: typeof safeContext.activeTopicKr === "string" ? safeContext.activeTopicKr : undefined,
      savedWords: Array.isArray(safeContext.savedWords)
        ? safeContext.savedWords.filter((w: unknown) => typeof w === "string").slice(0, 50)
        : undefined,
    });

    // Convert UIMessages to ModelMessages (critical for AI SDK v6 compatibility)
    const modelMessages = await convertToModelMessages(cleanedMessages);

    const result = streamText({
      model: getModel(),
      system: systemPrompt,
      messages: modelMessages,
      temperature: 0.7,
      maxOutputTokens: 1000,
    });

    return result.toUIMessageStreamResponse();
  } catch (error) {
    // Log full error server-side only; never leak internals to the client
    console.error("[chat route error]", error);

    return new Response(
      JSON.stringify({ error: "An unexpected error occurred" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
