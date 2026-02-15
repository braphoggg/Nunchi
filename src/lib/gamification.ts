/**
 * Pure logic for the gamification system: XP, streaks, and rank.
 * No React dependencies — all functions are testable in isolation.
 */

import type {
  GamificationData,
  XPAction,
  XPEvent,
  StreakData,
  SessionStats,
  ResidentRank,
  RankInfo,
} from "@/types";

// ─── XP Values ───────────────────────────────────────────────────────

export const XP_VALUES: Record<XPAction, number> = {
  message_korean: 5,
  message_full_korean: 15,
  flashcard_session: 20,
  flashcard_perfect: 10,
  word_saved: 3,
  no_translate: 8,
};

// ─── Rank Ladder ─────────────────────────────────────────────────────

export const RANK_LADDER: RankInfo[] = [
  {
    id: "new_resident",
    korean: "새 입주자",
    english: "New Resident",
    description: "You just moved in. The walls are thin.",
    minXP: 0,
    minVocab: 0,
  },
  {
    id: "quiet_tenant",
    korean: "조용한 세입자",
    english: "Quiet Tenant",
    description: "Moon-jo has noticed.",
    minXP: 100,
    minVocab: 10,
  },
  {
    id: "regular",
    korean: "단골",
    english: "Regular",
    description: "You know which stairs creak.",
    minXP: 500,
    minVocab: 30,
  },
  {
    id: "trusted_neighbor",
    korean: "믿을 만한 이웃",
    english: "Trusted Neighbor",
    description: "Moon-jo shares secrets with you now.",
    minXP: 1500,
    minVocab: 75,
  },
  {
    id: "floor_senior",
    korean: "층 선배",
    english: "Floor Senior",
    description: "You belong here. Moon-jo smiles.",
    minXP: 5000,
    minVocab: 150,
  },
];

// ─── XP Computation ──────────────────────────────────────────────────

/**
 * Determine XP earned for a message based on its Korean character ratio.
 * Returns null if the message doesn't qualify (< 10% Korean).
 */
export function computeMessageXP(
  koreanRatio: number
): { action: XPAction; amount: number } | null {
  if (koreanRatio >= 0.8) {
    return { action: "message_full_korean", amount: XP_VALUES.message_full_korean };
  }
  if (koreanRatio >= 0.1) {
    return { action: "message_korean", amount: XP_VALUES.message_korean };
  }
  return null;
}

// ─── Streak ──────────────────────────────────────────────────────────

/**
 * Get a local date string in YYYY-MM-DD format.
 */
export function getLocalDateString(date?: Date): string {
  const d = date ?? new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Get yesterday's date string relative to a given YYYY-MM-DD date.
 */
function getYesterday(dateStr: string): string {
  const parts = dateStr.split("-").map(Number);
  const d = new Date(parts[0], parts[1] - 1, parts[2]);
  d.setDate(d.getDate() - 1);
  return getLocalDateString(d);
}

/**
 * Update streak based on practice today.
 * - Same day → no change
 * - Yesterday → increment
 * - Otherwise → reset to 1
 */
export function updateStreak(streak: StreakData, today?: string): StreakData {
  const todayStr = today ?? getLocalDateString();

  // Already practiced today
  if (streak.lastPracticeDate === todayStr) {
    return streak;
  }

  // First ever practice (empty date) or streak broken
  const yesterday = getYesterday(todayStr);

  if (streak.lastPracticeDate === yesterday) {
    const newCurrent = streak.currentStreak + 1;
    return {
      currentStreak: newCurrent,
      longestStreak: Math.max(streak.longestStreak, newCurrent),
      lastPracticeDate: todayStr,
    };
  }

  // Streak broken or first practice
  return {
    currentStreak: 1,
    longestStreak: Math.max(streak.longestStreak, 1),
    lastPracticeDate: todayStr,
  };
}

// ─── Rank ────────────────────────────────────────────────────────────

/**
 * Compute current rank based on total XP and vocab count.
 * Both thresholds must be met for a rank.
 */
export function computeRank(totalXP: number, vocabCount: number): RankInfo {
  // Walk ladder in reverse to find highest qualifying rank
  for (let i = RANK_LADDER.length - 1; i >= 0; i--) {
    const rank = RANK_LADDER[i];
    if (totalXP >= rank.minXP && vocabCount >= rank.minVocab) {
      return rank;
    }
  }
  return RANK_LADDER[0]; // fallback: new_resident
}

/**
 * Get the next rank after current. Returns null if already at max rank.
 */
export function getNextRank(totalXP: number, vocabCount: number): RankInfo | null {
  const current = computeRank(totalXP, vocabCount);
  const idx = RANK_LADDER.findIndex((r) => r.id === current.id);
  if (idx < RANK_LADDER.length - 1) {
    return RANK_LADDER[idx + 1];
  }
  return null;
}

/**
 * Compute progress (0–1) toward the next rank.
 * Takes the minimum of XP progress and vocab progress (bottleneck).
 * Returns 1.0 if already at max rank.
 */
export function computeRankProgress(totalXP: number, vocabCount: number): number {
  const current = computeRank(totalXP, vocabCount);
  const next = getNextRank(totalXP, vocabCount);

  if (!next) return 1.0; // max rank

  const xpRange = next.minXP - current.minXP;
  const vocabRange = next.minVocab - current.minVocab;

  const xpProgress = xpRange > 0 ? Math.min((totalXP - current.minXP) / xpRange, 1) : 1;
  const vocabProgress = vocabRange > 0 ? Math.min((vocabCount - current.minVocab) / vocabRange, 1) : 1;

  return Math.min(xpProgress, vocabProgress);
}

// ─── Default / Validation ────────────────────────────────────────────

/**
 * Create a fresh default GamificationData object.
 */
export function createDefaultGamificationData(): GamificationData {
  return {
    xp: { totalXP: 0, history: [] },
    streak: { currentStreak: 0, longestStreak: 0, lastPracticeDate: "" },
    stats: {
      totalMessages: 0,
      totalFlashcardSessions: 0,
      totalTranslations: 0,
      messagesWithoutTranslate: 0,
    },
  };
}

/**
 * Basic shape validation for GamificationData (used as a quick check
 * before the more thorough `validateGamificationData` in security.ts).
 */
export function isValidGamificationData(data: unknown): data is GamificationData {
  if (typeof data !== "object" || data === null || Array.isArray(data)) return false;

  const d = data as Record<string, unknown>;

  // xp
  if (typeof d.xp !== "object" || d.xp === null) return false;
  const xp = d.xp as Record<string, unknown>;
  if (typeof xp.totalXP !== "number" || xp.totalXP < 0) return false;
  if (!Array.isArray(xp.history)) return false;

  // streak
  if (typeof d.streak !== "object" || d.streak === null) return false;
  const streak = d.streak as Record<string, unknown>;
  if (typeof streak.currentStreak !== "number" || streak.currentStreak < 0) return false;
  if (typeof streak.longestStreak !== "number" || streak.longestStreak < 0) return false;
  if (typeof streak.lastPracticeDate !== "string") return false;

  // stats
  if (typeof d.stats !== "object" || d.stats === null) return false;
  const stats = d.stats as Record<string, unknown>;
  for (const field of [
    "totalMessages",
    "totalFlashcardSessions",
    "totalTranslations",
    "messagesWithoutTranslate",
  ]) {
    if (typeof stats[field] !== "number" || (stats[field] as number) < 0) return false;
  }

  return true;
}
