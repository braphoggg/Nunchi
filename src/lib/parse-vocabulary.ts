import type { VocabularyItem } from "@/types";

/** Security limits */
const MAX_INPUT_LENGTH = 10_000;
const MAX_KOREAN_LENGTH = 50;
const MAX_ROMANIZATION_LENGTH = 200;
const MAX_ITEMS = 50;

/** Common Western/English names to filter out when they appear as "romanization" */
const COMMON_NAMES = new Set([
  "alex", "alexander", "michael", "sarah", "john", "james", "david", "daniel",
  "chris", "christopher", "jessica", "jennifer", "emma", "olivia", "sophia",
  "william", "robert", "joseph", "thomas", "charles", "matthew", "andrew",
  "mark", "paul", "steven", "kevin", "brian", "george", "edward", "peter",
  "sam", "samuel", "ryan", "jason", "nick", "nicholas", "tony", "frank",
  "anna", "maria", "lisa", "susan", "karen", "nancy", "betty", "helen",
  "kate", "katie", "emily", "amy", "rachel", "laura", "julie", "jane",
  "tom", "mike", "jake", "luke", "ben", "jack", "max", "leo", "adam", "eric",
]);

/**
 * Known-correct romanizations for common Korean words.
 * Used as a safety net when the LLM provides incorrect romanization pairings.
 * Only includes words where the model has been observed making mistakes.
 */
const ROMANIZATION_CORRECTIONS: Record<string, string> = {
  "한글": "hangeul",
  "안녕하세요": "annyeonghaseyo",
  "감사합니다": "gamsahamnida",
  "죄송합니다": "joesonghamnida",
  "네": "ne",
  "아니요": "aniyo",
  "이름": "ireum",
  "선생님": "seonsaengnim",
  "학생": "haksaeng",
  "사람": "saram",
  "물": "mul",
  "밥": "bap",
  "집": "jip",
  "방": "bang",
  "문": "mun",
  "의사": "uisa",
  "치과의사": "chigwauisa",
  "고시원": "gosiwon",
  "한국어": "hangugeo",
  "영어": "yeongeo",
  "좋아요": "joayo",
  "맞아요": "majayo",
  "이해해요": "ihaehaeyo",
  "몰라요": "mollayo",
  "도와주세요": "dowajuseyo",
  "여기": "yeogi",
  "저기": "jeogi",
  "어디": "eodi",
  "뭐": "mwo",
  "왜": "wae",
  "어떻게": "eotteoke",
};

/**
 * Maximum Korean characters for a vocabulary item.
 * Filters out full sentences that happen to be bolded.
 * Allows short phrases (e.g. "조용히 하세요" = 7 chars) but rejects
 * long sentences (e.g. "안녕하세요, 마이클 씨. 잘 지내고 계신가요?" = 20+ chars).
 */
const MAX_KOREAN_WORD_LENGTH = 15;

/**
 * Corrects romanization for known Korean words if the LLM provided the wrong one.
 * Returns the corrected romanization, or the original if no correction is needed.
 */
function correctRomanization(korean: string, romanization: string): string {
  const correct = ROMANIZATION_CORRECTIONS[korean];
  if (!correct) return romanization;
  // Only correct if the provided romanization is clearly wrong
  // (doesn't match the known-correct one, case-insensitive)
  if (romanization.toLowerCase().replace(/[\s\-]/g, "") !== correct.toLowerCase().replace(/[\s\-]/g, "")) {
    return correct;
  }
  return romanization;
}

/** Strip HTML tags from a string to prevent XSS. */
function stripHtml(text: string): string {
  return text.replace(/<[^>]*>/g, "");
}

/** Strip markdown bold markers (**) from a string. */
function stripBoldMarkers(text: string): string {
  return text.replace(/\*\*/g, "");
}

/** Returns true if the string contains at least one Hangul character. */
function containsHangul(text: string): boolean {
  return /[\uAC00-\uD7AF\u1100-\u11FF\u3130-\u318F]/.test(text);
}

/**
 * Returns true if the string looks like valid romanization.
 * Must be only Latin letters, hyphens, spaces, and apostrophes.
 * Must contain at least one Latin letter.
 */
function isValidRomanization(text: string): boolean {
  if (!text) return false;
  // Must have at least one letter
  if (!/[a-zA-Z]/.test(text)) return false;
  // Must only contain letters, hyphens, spaces, apostrophes, periods
  if (!/^[a-zA-Z\s\-''.]+$/.test(text)) return false;
  return true;
}

/**
 * Returns true if the string is a valid English meaning.
 * Must not contain Hangul, must not be just punctuation/dashes,
 * must contain at least one Latin letter.
 * Must look like actual English, not a romanization fragment.
 */
function isValidEnglish(text: string): boolean {
  if (!text) return false;
  if (containsHangul(text)) return false;
  // Must contain at least one Latin letter
  if (!/[a-zA-Z]/.test(text)) return false;
  // Reject strings that are just dashes, punctuation, or whitespace
  if (/^[\s\-—–:.,;!?'"()]+$/.test(text)) return false;
  return true;
}

/**
 * Returns true if text looks like a romanization fragment rather than English.
 * Romanization is typically a single word that matches Korean syllable patterns.
 * English meanings are common English words or multi-word phrases.
 */
function looksLikeRomanization(text: string): boolean {
  if (!text) return false;
  const trimmed = text.trim().toLowerCase();

  // Common single English words that are NOT romanization
  const commonEnglishWords = new Set([
    "hello", "hi", "hey", "bye", "goodbye", "yes", "no", "ok", "okay",
    "thank", "thanks", "please", "sorry", "excuse", "welcome",
    "door", "room", "wall", "floor", "house", "home", "food", "water",
    "rice", "meat", "fish", "soup", "tea", "beer", "wine", "milk",
    "name", "friend", "teacher", "student", "doctor", "dentist",
    "morning", "night", "today", "tomorrow", "yesterday",
    "good", "bad", "big", "small", "hot", "cold", "new", "old",
    "man", "woman", "person", "people", "child", "sir", "madam",
    "love", "hate", "like", "want", "need", "know", "think",
    "come", "go", "eat", "drink", "sleep", "work", "study", "read",
    "right", "left", "up", "down", "here", "there",
    "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten",
    "really", "very", "much", "more", "less", "again", "also", "too",
  ]);
  if (commonEnglishWords.has(trimmed)) return false;

  // Multi-word English phrases are not romanization
  const englishIndicators = /\b(the|a|an|is|are|was|were|to|for|of|in|on|at|it|this|that|with|from|by|not|but|or|and|I|you|he|she|we|they|my|your|his|her|its|our|their|have|has|had|do|does|did|can|will|would|should|could|said|before|after|used|just)\b/i;
  if (englishIndicators.test(text)) return false;

  // If it's a single word with typical Korean romanization patterns, it's romanization
  if (!text.includes(" ") && /^[a-z\-''.]+$/i.test(text)) return true;

  return true;
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

  // Pass 1: Match **Korean text** followed by (parenthesized content) and optionally text after
  const boldPattern = /\*\*([^*]+)\*\*\s*\(([^)]+)\)(?:\s*[—–:\-]\s*([^\n*]+)|\s*([^\n*]*))?/g;

  // Pass 2 (fallback): Match Korean text (romanization) WITHOUT bold markers
  // e.g. "이해해요 (ihaehamnida)" — catches words Moon-jo writes without bold formatting
  // Only matches isolated Hangul words/phrases followed by parenthesized Latin text
  // Note: trailing capture limited to avoid consuming the rest of the line
  const unboldPattern = /(?:^|[\s.!?,;:\-—–])([가-힣][가-힣\s]{0,14}?)\s*\(([a-zA-Z][a-zA-Z\s\-''.]*)\)(?:\s*[—–:\-]\s*([^\n(가-힣*]{1,40}))?/g;

  let match: RegExpExecArray | null;
  // First pass: bold patterns (higher confidence)
  while ((match = boldPattern.exec(safeContent)) !== null) {
    // Security: cap total items
    if (results.length >= MAX_ITEMS) break;

    const korean = stripHtml(match[1].trim());

    // Skip if no Hangul in the bold text
    if (!containsHangul(korean)) continue;

    // Skip long sentences — only save vocabulary words/short phrases
    if (korean.length > MAX_KOREAN_WORD_LENGTH) continue;

    // Skip items containing honorific 씨 (ssi) — these include user/person names
    // Matches patterns like "알렉스 씨", "마이클 씨.", "안녕하세요, 마이클 씨", etc.
    if (/씨[.!?,;:]?$/.test(korean) || korean === "씨" || /\s씨[\s,.!?;:]/.test(korean)) continue;

    // Skip items where the parenthesized content is a person's name, not romanization
    // e.g. **알렉스** (Alex) — this is a transliterated name, not vocabulary
    const rawParenCheck = stripBoldMarkers(stripHtml(match[2].trim())).trim().toLowerCase();
    if (COMMON_NAMES.has(rawParenCheck)) continue;

    // Skip duplicates within same message
    if (seenKorean.has(korean)) continue;

    // Clean parenthesized content: strip HTML, bold markers, trim
    const rawParen = stripBoldMarkers(stripHtml(match[2].trim()));
    const afterDash = match[3] ? stripHtml(match[3].trim()) : "";
    const afterSpace = match[4] ? stripHtml(match[4].trim()) : "";

    let romanization = "";
    let english = "";

    // Try to split parenthesized content — could be "romanization, english" or just "romanization"
    const commaIdx = rawParen.indexOf(",");
    if (commaIdx > 0) {
      const beforeComma = rawParen.slice(0, commaIdx).trim();
      const afterComma = rawParen.slice(commaIdx + 1).trim();

      // First check: if the whole thing is valid romanization, prefer that
      // This handles cases like "ne, majayo" where both parts are romanization
      if (isValidRomanization(rawParen) && looksLikeRomanization(afterComma)) {
        romanization = rawParen;
      } else if (isValidRomanization(beforeComma) && isValidEnglish(afterComma) && !looksLikeRomanization(afterComma)) {
        romanization = beforeComma;
        english = afterComma;
      } else if (isValidRomanization(beforeComma)) {
        // If afterComma looks like romanization, keep full string
        if (looksLikeRomanization(afterComma)) {
          romanization = rawParen;
        } else {
          romanization = beforeComma;
        }
      } else if (isValidRomanization(rawParen)) {
        romanization = rawParen;
      }
    } else {
      // No comma — entire paren content is romanization
      if (isValidRomanization(rawParen)) {
        // If it's a single unhyphenated word that's a common English word, skip it
        // e.g. **도이치** (doctor) — "doctor" is English, not romanization
        // But allow hyphenated romanization like "an-nyeong-ha-se-yo"
        if (!rawParen.includes(" ") && !rawParen.includes("-") && !looksLikeRomanization(rawParen)) {
          continue;
        }
        romanization = rawParen;
      }
    }

    // If we don't have English yet, look for it after the parentheses (legacy format)
    if (!english) {
      const afterParen = afterDash || afterSpace;
      if (afterParen) {
        const cleaned = afterParen
          .replace(/^[\s\-—–:]+/, "") // strip leading dashes/colons
          .replace(/[.!?,;:]+$/, "")  // strip trailing punctuation
          .trim();
        if (isValidEnglish(cleaned)) {
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
    results.push({ korean, romanization: correctRomanization(korean, romanization), english });
  }

  // Second pass: non-bold patterns (fallback for messages without ** formatting)
  while ((match = unboldPattern.exec(safeContent)) !== null) {
    if (results.length >= MAX_ITEMS) break;

    const korean = stripHtml(match[1].trim());
    if (!containsHangul(korean)) continue;
    if (korean.length > MAX_KOREAN_WORD_LENGTH) continue;
    // Skip items containing honorific 씨 (ssi) — these include user/person names
    if (/씨[.!?,;:]?$/.test(korean) || korean === "씨" || /\s씨[\s,.!?;:]/.test(korean)) continue;
    // Skip items with commas in Korean text — these are phrases like "안녕하세요, 마이클 씨"
    if (korean.includes(",")) continue;
    const rawParenCheckUnbold = stripBoldMarkers(stripHtml(match[2].trim())).trim().toLowerCase();
    if (COMMON_NAMES.has(rawParenCheckUnbold)) continue;
    // Skip if already found in bold pass
    if (seenKorean.has(korean)) continue;

    const rawParen = stripBoldMarkers(stripHtml(match[2].trim()));
    const afterDash = match[3] ? stripHtml(match[3].trim()) : "";

    let romanization = "";
    let english = "";

    const commaIdx = rawParen.indexOf(",");
    if (commaIdx > 0) {
      const beforeComma = rawParen.slice(0, commaIdx).trim();
      const afterComma = rawParen.slice(commaIdx + 1).trim();
      if (isValidRomanization(rawParen) && looksLikeRomanization(afterComma)) {
        romanization = rawParen;
      } else if (isValidRomanization(beforeComma) && isValidEnglish(afterComma) && !looksLikeRomanization(afterComma)) {
        romanization = beforeComma;
        english = afterComma;
      } else if (isValidRomanization(beforeComma)) {
        romanization = looksLikeRomanization(afterComma) ? rawParen : beforeComma;
      } else if (isValidRomanization(rawParen)) {
        romanization = rawParen;
      }
    } else {
      if (isValidRomanization(rawParen)) {
        if (!rawParen.includes(" ") && !rawParen.includes("-") && !looksLikeRomanization(rawParen)) {
          continue;
        }
        romanization = rawParen;
      }
    }

    if (!english && afterDash) {
      const cleaned = afterDash.replace(/^[\s\-—–:]+/, "").replace(/[.!?,;:]+$/, "").trim();
      if (isValidEnglish(cleaned)) english = cleaned;
    }

    english = english.replace(/[.!?,;:]+$/, "").trim();

    if (!korean || !romanization || korean.length > MAX_KOREAN_LENGTH || romanization.length > MAX_ROMANIZATION_LENGTH) {
      continue;
    }

    seenKorean.add(korean);
    results.push({ korean, romanization: correctRomanization(korean, romanization), english });
  }

  return results;
}

/**
 * Returns true if the message content contains any parseable vocabulary.
 * Lightweight check for enabling/disabling the save button.
 * Checks both bold (**word**) and non-bold (word) patterns with romanization.
 */
export function hasVocabulary(content: string): boolean {
  if (!content) return false;
  // Bold pattern: **한글** (romanization)
  if (/\*\*[^*]+\*\*\s*\([^)]+\)/.test(content)) return true;
  // Non-bold fallback: 한글 (romanization) — Hangul followed by Latin in parens
  if (/[가-힣]+\s*\([a-zA-Z][a-zA-Z\s\-''.]*\)/.test(content)) return true;
  return false;
}
