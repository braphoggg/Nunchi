import type { VocabularyItem } from "@/types";

/** Security limits */
const MAX_INPUT_LENGTH = 10_000;
const MAX_KOREAN_LENGTH = 100;
const MAX_ROMANIZATION_LENGTH = 200;
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
 * Primary format (Korean-only teaching):
 *   **한글** (romanization)
 *
 * Also handles legacy formats where English may follow:
 *   **한글** (romanization) English meaning
 *   **한글** (romanization) — English meaning
 *   **한글** (romanization, English meaning)
 *
 * English is now optional — items are valid with just korean + romanization.
 * English will be looked up separately via the translate API.
 *
 * Deduplicates by Korean text within a single parse.
 */
export function parseVocabulary(
  content: string
): Omit<VocabularyItem, "id" | "savedAt">[] {
  if (!content) return [];

  // Security: truncate oversized input to prevent ReDoS
  const safeContent = content.slice(0, MAX_INPUT_LENGTH);

  const results: Omit<VocabularyItem, "id" | "savedAt">[] = [];
  const seenKorean = new Set<string>();

  // Match: **Korean text** followed by (parenthesized content) and optionally text after
  const pattern = /\*\*([^*]+)\*\*\s*\(([^)]+)\)(?:\s*[—–:\-]\s*([^\n*]+)|\s*([^\n*]*))?/g;

  let match: RegExpExecArray | null;
  while ((match = pattern.exec(safeContent)) !== null) {
    // Security: cap total items
    if (results.length >= MAX_ITEMS) break;

    const korean = stripHtml(match[1].trim());

    // Skip if no Hangul in the bold text
    if (!containsHangul(korean)) continue;

    // Skip duplicates within same message
    if (seenKorean.has(korean)) continue;

    const parenContent = stripHtml(match[2].trim());
    const afterDash = match[3] ? stripHtml(match[3].trim()) : "";
    const afterSpace = match[4] ? stripHtml(match[4].trim()) : "";

    let romanization = "";
    let english = "";

    // Try to split parenthesized content — could be "romanization, english" or just "romanization"
    const commaIdx = parenContent.indexOf(",");
    if (commaIdx > 0) {
      const beforeComma = parenContent.slice(0, commaIdx).trim();
      const afterComma = parenContent.slice(commaIdx + 1).trim();

      if (afterComma && !containsHangul(afterComma) && !containsHangul(beforeComma)) {
        romanization = beforeComma;
        english = afterComma;
      } else if (!containsHangul(beforeComma)) {
        romanization = beforeComma;
      } else {
        romanization = parenContent;
      }
    } else {
      // No comma — entire paren content is romanization (if it's not Hangul)
      if (!containsHangul(parenContent)) {
        romanization = parenContent;
      }
    }

    // If we don't have English yet, look for it after the parentheses (legacy format)
    if (!english) {
      const afterParen = afterDash || afterSpace;
      if (afterParen) {
        const cleaned = afterParen
          .replace(/[.!?,;:]+$/, "")
          .trim();
        // Only use as English if it doesn't contain Hangul
        if (cleaned && !containsHangul(cleaned)) {
          english = cleaned;
        }
      }
    }

    // Clean trailing punctuation from english
    english = english.replace(/[.!?,;:]+$/, "").trim();

    // Skip if missing korean or romanization, or exceeds length limits
    if (
      !korean ||
      !romanization ||
      korean.length > MAX_KOREAN_LENGTH ||
      romanization.length > MAX_ROMANIZATION_LENGTH
    ) {
      continue;
    }

    seenKorean.add(korean);
    // English is optional — will be looked up via translate API if empty
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
