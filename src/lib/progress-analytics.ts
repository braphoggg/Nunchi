import type { XPEvent, VocabularyItem } from "@/types";

export interface DailyXP {
  date: string; // YYYY-MM-DD
  label: string; // "Mon", "Tue", etc.
  xp: number;
}

export interface DailyVocab {
  date: string;
  cumulative: number;
  added: number;
}

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/**
 * Aggregate XP earned per day for the last N days.
 */
export function getXPPerDay(
  history: XPEvent[],
  days: number = 14,
): DailyXP[] {
  const result: DailyXP[] = [];
  const now = new Date();

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const dateStr = toLocalDate(d);
    result.push({
      date: dateStr,
      label: DAY_LABELS[d.getDay()],
      xp: 0,
    });
  }

  for (const event of history) {
    const eventDate = toLocalDate(new Date(event.timestamp));
    const entry = result.find((r) => r.date === eventDate);
    if (entry) {
      entry.xp += event.amount;
    }
  }

  return result;
}

/**
 * Vocabulary growth over the last N days (cumulative + daily additions).
 */
export function getVocabGrowth(
  words: VocabularyItem[],
  days: number = 14,
): DailyVocab[] {
  const result: DailyVocab[] = [];
  const now = new Date();

  // Words saved before the chart window
  const windowStart = new Date(now);
  windowStart.setDate(windowStart.getDate() - days);
  const beforeWindow = words.filter(
    (w) => new Date(w.savedAt) < windowStart,
  ).length;

  let cumulative = beforeWindow;

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const dateStr = toLocalDate(d);
    const added = words.filter(
      (w) => toLocalDate(new Date(w.savedAt)) === dateStr,
    ).length;
    cumulative += added;
    result.push({ date: dateStr, cumulative, added });
  }

  return result;
}

/**
 * Get set of dates with any activity (XP events) in the last N days.
 */
export function getActivityDays(
  history: XPEvent[],
  days: number = 30,
): Set<string> {
  const now = new Date();
  const cutoff = new Date(now);
  cutoff.setDate(cutoff.getDate() - days);

  const active = new Set<string>();
  for (const event of history) {
    const eventDate = new Date(event.timestamp);
    if (eventDate >= cutoff) {
      active.add(toLocalDate(eventDate));
    }
  }
  return active;
}

/**
 * Generate the last N days as YYYY-MM-DD strings (oldest first).
 */
export function getLastNDays(days: number): string[] {
  const result: string[] = [];
  const now = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    result.push(toLocalDate(d));
  }
  return result;
}

function toLocalDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
