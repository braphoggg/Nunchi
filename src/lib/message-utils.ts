import type { UIMessage } from "ai";

/**
 * Strip leaked AI reasoning/thinking blocks from message text.
 * Gemini 2.5 Flash occasionally outputs "THOUGHT: ..." planning text
 * before the actual Korean response. This strips it as a safety net.
 *
 * Pattern: One or more lines starting with "THOUGHT:" (case-insensitive)
 * followed by English meta-commentary, up until the first line that
 * contains Korean characters or markdown bold (**).
 */
const KOREAN_CHAR = /[\uAC00-\uD7AF\u1100-\u11FF\u3130-\u318F]/;

/** Check if a line is the start of actual Korean content (not a THOUGHT line with quoted Korean). */
function isKoreanContentLine(line: string): boolean {
  const trimmed = line.trim();
  if (trimmed === "") return false;
  // Lines starting with THOUGHT: are always meta-commentary, even if they contain quoted Korean
  if (/^THOUGHT\s*:/i.test(trimmed)) return false;
  // Lines starting with English meta patterns like "I will...", "The student...", "My approach..."
  if (/^(I |The student|My |This |Let me|Next,? |Also,? |Now )/i.test(trimmed)) return false;
  // Lines that start with Korean characters or bold markdown are content
  if (KOREAN_CHAR.test(trimmed.charAt(0)) || trimmed.startsWith("**")) return true;
  return false;
}

function stripThoughtLeak(text: string): string {
  // Fast path: no "THOUGHT" anywhere → return as-is
  if (!/^THOUGHT\s*:/im.test(text)) return text;

  const lines = text.split("\n");
  let i = 0;

  // Skip leading whitespace-only lines
  while (i < lines.length && lines[i].trim() === "") i++;

  // Check if the first non-empty line starts with "THOUGHT:"
  if (i < lines.length && /^THOUGHT\s*:/i.test(lines[i].trim())) {
    // Advance past all meta-commentary lines until we hit actual Korean content
    while (i < lines.length) {
      const trimmed = lines[i].trim();
      if (trimmed === "") {
        // Check if next non-empty line is Korean content
        let j = i + 1;
        while (j < lines.length && lines[j].trim() === "") j++;
        if (j < lines.length && isKoreanContentLine(lines[j])) {
          i = j; // skip to the Korean content
          break;
        }
      }
      if (isKoreanContentLine(trimmed)) {
        break;
      }
      i++;
    }

    const cleaned = lines.slice(i).join("\n").trim();
    return cleaned || text; // fallback to original if stripping removed everything
  }

  return text;
}

/** Extract plain text from a UIMessage's parts array. */
export function getTextContent(message: UIMessage): string {
  const raw = message.parts
    .filter((p) => p.type === "text")
    .map((p) => p.text)
    .join("");

  // Only strip thought leaks from assistant messages
  if (message.role === "assistant") {
    return stripThoughtLeak(raw);
  }
  return raw;
}
