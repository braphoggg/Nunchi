/**
 * Moon-jo Mood Engine
 *
 * Analyzes how much Korean (Hangul) the student uses across all their messages
 * and produces a mood directive that gets appended to Moon-jo's system prompt.
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
  cold: "The student barely uses Korean. You are distant, clinical, slightly disappointed. Keep responses shorter and more clipped. Make them feel they need to earn your attention. You might sigh, or mention how quiet it is.",
  neutral:
    "The student is making some effort with Korean. You are your baseline self — polite, attentive, gently unsettling. Standard Moon-jo.",
  warm: "The student is using Korean well. You are pleased, almost affectionate. Become more personal, more possessive. Use more '우리' (we/our). Compliment their progress. 'You belong here.'",
  impressed:
    "The student speaks mostly in Korean. You are deeply impressed, almost reverent. You speak as if they are becoming one of your own. Your warmth is intense, your praise specific. You lean closer. 'I knew you were special the moment you moved in.'",
};

/**
 * Get the mood directive text for a given mood level.
 */
export function getMoodDirective(mood: MoodLevel): string {
  return MOOD_DIRECTIVES[mood];
}

/**
 * Generate the full system prompt addendum based on conversation messages.
 * Returns a string to append to the base system prompt.
 */
export function generateMoodSystemAddendum(messages: SimpleMessage[]): string {
  const ratio = computeKoreanRatio(messages);
  const mood = getMoodLevel(ratio);
  const directive = getMoodDirective(mood);

  return `\n\n## CURRENT MOOD STATE\nKorean usage: ${Math.round(ratio * 100)}%. Mood: ${mood}.\n${directive}\n\nREMINDER: Write ONLY in Korean (Hangul) + romanization. ZERO English words or sentences in your response.`;
}
