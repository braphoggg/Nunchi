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
 * Handles multiple real LLM output formats:
 *   Format A: **한글** (romanization) English meaning
 *   Format B: **한글** (romanization) — English meaning
 *   Format C: **한글** (romanization, English meaning)
 *   Format D: **한글** (romanization): English meaning
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
    // Check if paren content has a comma separating romanization from meaning
    const commaIdx = parenContent.indexOf(",");
    if (commaIdx > 0) {
      const beforeComma = parenContent.slice(0, commaIdx).trim();
      const afterComma = parenContent.slice(commaIdx + 1).trim();

      // If the part after comma contains Hangul, it's not an English meaning
      if (afterComma && !containsHangul(afterComma) && !containsHangul(beforeComma)) {
        romanization = beforeComma;
        english = afterComma;
      } else if (!containsHangul(beforeComma)) {
        // Comma exists but after-comma is Korean — just use whole paren as romanization
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

    // If we don't have English yet, look for it after the parentheses
    if (!english) {
      const afterParen = afterDash || afterSpace;
      if (afterParen) {
        // Clean up the text after parentheses
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

    // Skip if missing required fields or exceeds length limits
    if (
      !korean ||
      !romanization ||
      !english ||
      korean.length > MAX_KOREAN_LENGTH ||
      romanization.length > MAX_ROMANIZATION_LENGTH ||
      english.length > MAX_ENGLISH_LENGTH
    ) {
      continue;
    }

    seenKorean.add(korean);
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
