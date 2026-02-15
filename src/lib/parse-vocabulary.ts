import type { VocabularyItem } from "@/types";

/** Security limits */
const MAX_INPUT_LENGTH = 10_000;
const MAX_KOREAN_LENGTH = 100;
const MAX_ROMANIZATION_LENGTH = 200;
const MAX_ENGLISH_LENGTH = 500;
const MAX_ITEMS = 50;

/** Strip HTML tags from a string to prevent XSS. */
function stripHtml(text: string): string {
  return text.replace(/<[^>]*>/g, "");
}

/** Returns true if the string contains at least one Hangul character. */
function containsHangul(text: string): boolean {
  return /[\uAC00-\uD7AF\u1100-\u11FF\u3130-\u318F]/.test(text);
}

/**
 * Extracts vocabulary items from Moon-jo's message text.
 *
 * Expected format in messages:
 *   **한글** (romanization) English meaning
 *
 * The parser looks for bold markers, then extracts
 * the romanization (in parentheses) and English meaning that follow.
 */
export function parseVocabulary(
  content: string
): Omit<VocabularyItem, "id" | "savedAt">[] {
  if (!content) return [];

  // Security: truncate oversized input to prevent ReDoS
  const safeContent = content.slice(0, MAX_INPUT_LENGTH);

  const results: Omit<VocabularyItem, "id" | "savedAt">[] = [];

  // Match: **Korean** (romanization) English meaning
  const pattern = /\*\*([^*]+)\*\*\s*\(([^)]+)\)\s*([^\n*]+)/g;

  let match: RegExpExecArray | null;
  while ((match = pattern.exec(safeContent)) !== null) {
    // Security: cap total items
    if (results.length >= MAX_ITEMS) break;

    const korean = stripHtml(match[1].trim());
    const romanization = stripHtml(match[2].trim());
    const english = stripHtml(
      match[3]
        .trim()
        .replace(/[.!?,;:]+$/, "")
        .trim()
    );

    // Skip if any field is empty, exceeds length limits, or korean has no Hangul
    if (
      !korean ||
      !romanization ||
      !english ||
      korean.length > MAX_KOREAN_LENGTH ||
      romanization.length > MAX_ROMANIZATION_LENGTH ||
      english.length > MAX_ENGLISH_LENGTH ||
      !containsHangul(korean)
    ) {
      continue;
    }

    results.push({ korean, romanization, english });
  }

  return results;
}

/**
 * Returns true if the message content contains any parseable vocabulary.
 * Lightweight check for enabling/disabling the save button.
 */
export function hasVocabulary(content: string): boolean {
  if (!content) return false;
  return /\*\*[^*]+\*\*\s*\([^)]+\)/.test(content);
}
