import type { VocabularyItem } from "@/types";

/**
 * Export vocabulary as CSV with UTF-8 BOM for Excel compatibility.
 */
export function exportToCSV(words: VocabularyItem[]): string {
  const BOM = "\uFEFF";
  const header = "Korean,Romanization,English,SRS Stage,Saved Date";
  const rows = words.map((w) => {
    const stage = getSRSStage(w);
    const date = new Date(w.savedAt).toLocaleDateString();
    return [
      csvEscape(w.korean),
      csvEscape(w.romanization),
      csvEscape(w.english || ""),
      csvEscape(stage),
      csvEscape(date),
    ].join(",");
  });
  return BOM + [header, ...rows].join("\n");
}

/**
 * Export vocabulary as Anki-compatible TSV (tab-separated).
 * Front: Korean (romanization) | Back: English
 * Only exports words that have English translations.
 */
export function exportToAnkiTSV(words: VocabularyItem[]): string {
  const rows = words
    .filter((w) => w.english?.trim())
    .map((w) => {
      const front = ankiEscape(`${w.korean} (${w.romanization})`);
      const back = ankiEscape(w.english || "");
      return `${front}\t${back}`;
    });
  return rows.join("\n");
}

/** Escape HTML entities and replace tabs/newlines for Anki TSV fields */
function ankiEscape(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\t/g, " ")
    .replace(/\n/g, "<br>");
}

function getSRSStage(w: VocabularyItem): string {
  if (!w.repetitions || w.repetitions === 0) return "New";
  if ((w.interval ?? 0) >= 21) return "Mastered";
  return "Learning";
}

function csvEscape(value: string): string {
  // Neutralize formula injection characters (=, +, -, @, tab, CR)
  let safe = value;
  if (/^[=+\-@\t\r]/.test(safe)) {
    safe = `'${safe}`;
  }
  if (safe.includes(",") || safe.includes('"') || safe.includes("\n") || safe !== value) {
    return `"${safe.replace(/"/g, '""')}"`;
  }
  return safe;
}

/**
 * Download a string as a file in the browser.
 */
export function downloadFile(
  content: string,
  filename: string,
  mimeType: string,
): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
