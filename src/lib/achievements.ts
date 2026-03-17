/**
 * Achievement / Badge system definitions.
 * Pure logic — no React dependencies.
 */

export interface Achievement {
  id: string;
  title: string;
  titleKr: string;
  description: string;
  /** Hint shown for locked achievements — guides the user or stays mysterious */
  hint: string;
  icon: string;
  /** Category for grouping in the badge gallery */
  category: "vocabulary" | "streak" | "study" | "immersion" | "rank" | "atmosphere";
}

export interface AchievementProgress {
  /** Achievements unlocked so far (by id) */
  unlockedIds: string[];
  /** Timestamp of each unlock */
  unlockTimestamps: Record<string, string>;
}

/** Checker context — snapshot of current user state */
export interface AchievementCheckContext {
  totalXP: number;
  vocabCount: number;
  currentStreak: number;
  longestStreak: number;
  totalMessages: number;
  totalFlashcardSessions: number;
  totalTranslations: number;
  messagesWithoutTranslate: number;
  rankId: string;
  /** Number of messages with ≥80% Korean in XP history */
  fullKoreanMessageCount: number;
  /** Night stage (0–3) */
  nightStage: number;
  /** Number of perfect quiz completions */
  perfectQuizCount: number;
  /** Number of perfect flashcard sessions */
  perfectFlashcardCount: number;
}

interface AchievementDef extends Achievement {
  check: (ctx: AchievementCheckContext) => boolean;
}

// ─── Achievement Definitions ────────────────────────────────────────

export const ACHIEVEMENTS: AchievementDef[] = [
  // Vocabulary
  {
    id: "first_word",
    title: "First Word",
    titleKr: "첫 단어",
    description: "Save your first vocabulary word",
    hint: "Save a word to your vocabulary",
    icon: "📝",
    category: "vocabulary",
    check: (ctx) => ctx.vocabCount >= 1,
  },
  {
    id: "word_collector",
    title: "Word Collector",
    titleKr: "단어 수집가",
    description: "Save 25 vocabulary words",
    hint: "Save 25 vocabulary words",
    icon: "📚",
    category: "vocabulary",
    check: (ctx) => ctx.vocabCount >= 25,
  },
  {
    id: "bookworm",
    title: "Bookworm",
    titleKr: "책벌레",
    description: "Save 50 vocabulary words",
    hint: "Save 50 vocabulary words",
    icon: "🐛",
    category: "vocabulary",
    check: (ctx) => ctx.vocabCount >= 50,
  },
  {
    id: "lexicon",
    title: "Lexicon",
    titleKr: "사전",
    description: "Save 200 vocabulary words",
    hint: "Save 200 vocabulary words",
    icon: "📖",
    category: "vocabulary",
    check: (ctx) => ctx.vocabCount >= 200,
  },

  // Streaks
  {
    id: "first_flame",
    title: "First Flame",
    titleKr: "첫 불꽃",
    description: "Maintain a 3-day streak",
    hint: "Come back 3 days in a row",
    icon: "🔥",
    category: "streak",
    check: (ctx) => ctx.longestStreak >= 3,
  },
  {
    id: "on_fire",
    title: "On Fire",
    titleKr: "불타오르다",
    description: "Maintain a 7-day streak",
    hint: "Maintain a 7-day streak",
    icon: "🔥",
    category: "streak",
    check: (ctx) => ctx.longestStreak >= 7,
  },
  {
    id: "unstoppable",
    title: "Unstoppable",
    titleKr: "멈출 수 없는",
    description: "Maintain a 30-day streak",
    hint: "Maintain a 30-day streak",
    icon: "💎",
    category: "streak",
    check: (ctx) => ctx.longestStreak >= 30,
  },

  // Study
  {
    id: "first_session",
    title: "First Session",
    titleKr: "첫 수업",
    description: "Complete your first flashcard session",
    hint: "Complete a flashcard session",
    icon: "🃏",
    category: "study",
    check: (ctx) => ctx.totalFlashcardSessions >= 1,
  },
  {
    id: "study_habit",
    title: "Study Habit",
    titleKr: "공부 습관",
    description: "Complete 10 flashcard sessions",
    hint: "Complete 10 flashcard sessions",
    icon: "🎯",
    category: "study",
    check: (ctx) => ctx.totalFlashcardSessions >= 10,
  },
  {
    id: "perfect_score",
    title: "Perfect Score",
    titleKr: "만점",
    description: "Get a perfect quiz score",
    hint: "Get a perfect score on a quiz",
    icon: "💯",
    category: "study",
    check: (ctx) => ctx.perfectQuizCount >= 1,
  },
  {
    id: "flawless_session",
    title: "Flawless Session",
    titleKr: "완벽한 수업",
    description: "Complete a flashcard session with no mistakes",
    hint: "Complete a flashcard session with zero mistakes",
    icon: "⭐",
    category: "study",
    check: (ctx) => ctx.perfectFlashcardCount >= 1,
  },

  // Immersion
  {
    id: "korean_spirit",
    title: "Korean Spirit",
    titleKr: "한국의 정신",
    description: "Send 10 messages with ≥80% Korean",
    hint: "Write from the heart... in Korean",
    icon: "🇰🇷",
    category: "immersion",
    check: (ctx) => ctx.fullKoreanMessageCount >= 10,
  },
  {
    id: "silent_treatment",
    title: "Silent Treatment",
    titleKr: "무시하기",
    description: "Send 5 consecutive messages without using translate",
    hint: "Resist the temptation to look...",
    icon: "🤐",
    category: "immersion",
    check: (ctx) => ctx.messagesWithoutTranslate >= 5,
  },
  {
    id: "immersion_master",
    title: "Immersion Master",
    titleKr: "몰입의 달인",
    description: "Send 50 messages without using translate",
    hint: "True immersion needs no crutch",
    icon: "🧘",
    category: "immersion",
    check: (ctx) => ctx.messagesWithoutTranslate >= 50,
  },
  {
    id: "chatterbox",
    title: "Chatterbox",
    titleKr: "수다쟁이",
    description: "Send 100 messages total",
    hint: "Send 100 messages",
    icon: "💬",
    category: "immersion",
    check: (ctx) => ctx.totalMessages >= 100,
  },

  // Rank
  {
    id: "quiet_tenant",
    title: "Quiet Tenant",
    titleKr: "조용한 세입자",
    description: "Reach the Quiet Tenant rank",
    hint: "Earn enough XP to rank up",
    icon: "🚪",
    category: "rank",
    check: (ctx) => ctx.rankId !== "new_resident",
  },
  {
    id: "regular",
    title: "Regular",
    titleKr: "단골",
    description: "Reach the Regular rank",
    hint: "Keep studying to reach Regular rank",
    icon: "🏠",
    category: "rank",
    check: (ctx) => ["regular", "trusted_neighbor", "floor_senior"].includes(ctx.rankId),
  },
  {
    id: "trusted_neighbor",
    title: "Trusted Neighbor",
    titleKr: "믿을 만한 이웃",
    description: "Reach the Trusted Neighbor rank",
    hint: "Keep going to reach Trusted Neighbor",
    icon: "🤝",
    category: "rank",
    check: (ctx) => ["trusted_neighbor", "floor_senior"].includes(ctx.rankId),
  },
  {
    id: "floor_senior",
    title: "Floor Senior",
    titleKr: "층 선배",
    description: "Reach the maximum rank",
    hint: "Reach the highest rank",
    icon: "👑",
    category: "rank",
    check: (ctx) => ctx.rankId === "floor_senior",
  },

  // Atmosphere
  {
    id: "night_owl",
    title: "Night Owl",
    titleKr: "올빼미",
    description: "Reach the deepest night stage in a single session",
    hint: "Some things only reveal themselves in darkness...",
    icon: "🦉",
    category: "atmosphere",
    check: (ctx) => ctx.nightStage >= 3,
  },
];

// ─── Functions ──────────────────────────────────────────────────────

export function createDefaultAchievementProgress(): AchievementProgress {
  return { unlockedIds: [], unlockTimestamps: {} };
}

/**
 * Check all achievements against the current context and return
 * any newly unlocked achievement IDs.
 */
export function checkAchievements(
  ctx: AchievementCheckContext,
  progress: AchievementProgress,
): string[] {
  const newlyUnlocked: string[] = [];
  for (const achievement of ACHIEVEMENTS) {
    if (progress.unlockedIds.includes(achievement.id)) continue;
    if (achievement.check(ctx)) {
      newlyUnlocked.push(achievement.id);
    }
  }
  return newlyUnlocked;
}

/**
 * Apply newly unlocked achievements to progress.
 */
export function unlockAchievements(
  progress: AchievementProgress,
  newIds: string[],
): AchievementProgress {
  if (newIds.length === 0) return progress;
  const now = new Date().toISOString();
  const newTimestamps = { ...progress.unlockTimestamps };
  for (const id of newIds) {
    newTimestamps[id] = now;
  }
  return {
    unlockedIds: [...progress.unlockedIds, ...newIds],
    unlockTimestamps: newTimestamps,
  };
}

/**
 * Get an achievement definition by ID.
 */
export function getAchievement(id: string): Achievement | undefined {
  return ACHIEVEMENTS.find((a) => a.id === id);
}

/**
 * Validate achievement progress data loaded from localStorage.
 */
export function isValidAchievementProgress(data: unknown): data is AchievementProgress {
  if (typeof data !== "object" || data === null || Array.isArray(data)) return false;
  const d = data as Record<string, unknown>;
  if (!Array.isArray(d.unlockedIds)) return false;
  if (!d.unlockedIds.every((id: unknown) => typeof id === "string")) return false;
  if (typeof d.unlockTimestamps !== "object" || d.unlockTimestamps === null) return false;
  return true;
}
