/**
 * Moon-jo Mood Engine
 *
 * Analyzes how much Korean (Hangul) the student uses across all their messages
 * and produces a mood directive that gets injected into the system prompt as
 * a structured XML section.
 *
 * Mood levels:
 *   cold      — student barely uses Korean (<20%)
 *   neutral   — some effort (20–49%)
 *   warm      — good Korean usage (50–79%)
 *   impressed — mostly Korean (≥80%)
 */

export type MoodLevel = "cold" | "neutral" | "warm" | "impressed";

export interface SimpleMessage {
  role: string;
  content: string;
}

const HANGUL_RE = /[\uAC00-\uD7AF]/g;

/**
 * Compute the ratio of Hangul characters to total non-whitespace characters
 * across all user messages.
 */
export function computeKoreanRatio(messages: SimpleMessage[]): number {
  const userTexts = messages
    .filter((m) => m.role === "user")
    .map((m) => m.content)
    .join("");

  const nonWhitespace = userTexts.replace(/\s/g, "");
  if (nonWhitespace.length === 0) return 0;

  const hangulMatches = nonWhitespace.match(HANGUL_RE);
  const hangulCount = hangulMatches ? hangulMatches.length : 0;

  return hangulCount / nonWhitespace.length;
}

/**
 * Map a Korean ratio to a mood level.
 */
export function getMoodLevel(ratio: number): MoodLevel {
  if (ratio >= 0.8) return "impressed";
  if (ratio >= 0.5) return "warm";
  if (ratio >= 0.2) return "neutral";
  return "cold";
}

const MOOD_DIRECTIVES: Record<MoodLevel, string> = {
  cold: "The student barely uses Korean. You are distant, clinical, slightly disappointed. Keep responses shorter and more clipped. They need to earn your attention. You might sigh, or mention how quiet it is. Express disappointment through your Moon-jo persona in Korean — shorter sentences, less warmth, more silence.",

  neutral:
    "The student is making some effort with Korean. You are your baseline self — polite, attentive, gently unsettling. Standard Moon-jo.",

  warm: "The student is using Korean well. You are pleased, almost affectionate. Become more personal, more possessive. Use more '우리' (we/our). Compliment their progress. You belong here.",

  impressed:
    "The student speaks mostly in Korean. You are deeply impressed, almost reverent. They are becoming one of your own. Your warmth is intense, your praise specific. You lean closer. You knew they were special the moment they moved in.",
};

/**
 * Get the mood directive text for a given mood level.
 */
export function getMoodDirective(mood: MoodLevel): string {
  return MOOD_DIRECTIVES[mood];
}

/**
 * Generate the structured mood addendum for the system prompt.
 * Returns an XML-style section for Gemini 2.5 Flash parsing.
 */
export function generateMoodSystemAddendum(messages: SimpleMessage[]): string {
  const ratio = computeKoreanRatio(messages);
  const mood = getMoodLevel(ratio);
  const directive = getMoodDirective(mood);

  return `<mood_state>
Korean usage: ${Math.round(ratio * 100)}%. Mood: ${mood}.
${directive}
</mood_state>`;
}
