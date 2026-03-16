/**
 * Daily Challenges — rotating mini-objectives that drive daily engagement.
 * Pure logic — no React dependencies.
 */

export interface ChallengeDefinition {
  id: string;
  title: string;
  titleKr: string;
  description: string;
  icon: string;
  /** Target value to reach */
  target: number;
  /** Which stat to track */
  trackingKey: ChallengeTrackingKey;
}

export type ChallengeTrackingKey =
  | "words_saved"
  | "flashcard_sessions"
  | "messages_without_translate"
  | "quiz_perfect"
  | "full_korean_messages";

export interface DailyChallengeState {
  /** Date string YYYY-MM-DD for the current challenge set */
  date: string;
  /** The 3 challenge IDs for today */
  challengeIds: string[];
  /** Progress per challenge: challengeId → current value */
  progress: Record<string, number>;
  /** Which challenges are completed */
  completedIds: string[];
}

// ─── Challenge Pool ─────────────────────────────────────────────────

const CHALLENGE_POOL: ChallengeDefinition[] = [
  {
    id: "save_5_words",
    title: "Word Hunter",
    titleKr: "단어 사냥꾼",
    description: "Save 5 new vocabulary words",
    icon: "📝",
    target: 5,
    trackingKey: "words_saved",
  },
  {
    id: "save_3_words",
    title: "Word Picker",
    titleKr: "단어 선택",
    description: "Save 3 new vocabulary words",
    icon: "✏️",
    target: 3,
    trackingKey: "words_saved",
  },
  {
    id: "flashcard_session",
    title: "Card Shark",
    titleKr: "카드의 달인",
    description: "Complete a flashcard session",
    icon: "🃏",
    target: 1,
    trackingKey: "flashcard_sessions",
  },
  {
    id: "flashcard_2_sessions",
    title: "Double Study",
    titleKr: "이중 학습",
    description: "Complete 2 flashcard sessions",
    icon: "📚",
    target: 2,
    trackingKey: "flashcard_sessions",
  },
  {
    id: "no_translate_5",
    title: "No Peeking",
    titleKr: "몰래 보지 않기",
    description: "Send 5 messages without using translate",
    icon: "🙈",
    target: 5,
    trackingKey: "messages_without_translate",
  },
  {
    id: "no_translate_3",
    title: "Brave Speaker",
    titleKr: "용감한 화자",
    description: "Send 3 messages without using translate",
    icon: "🦁",
    target: 3,
    trackingKey: "messages_without_translate",
  },
  {
    id: "perfect_quiz",
    title: "Perfect Score",
    titleKr: "만점",
    description: "Get a perfect quiz score",
    icon: "💯",
    target: 1,
    trackingKey: "quiz_perfect",
  },
  {
    id: "full_korean_3",
    title: "Korean Only",
    titleKr: "한국어만",
    description: "Send 3 messages with ≥80% Korean",
    icon: "🇰🇷",
    target: 3,
    trackingKey: "full_korean_messages",
  },
  {
    id: "full_korean_5",
    title: "Korean Spirit",
    titleKr: "한국의 정신",
    description: "Send 5 messages with ≥80% Korean",
    icon: "🔥",
    target: 5,
    trackingKey: "full_korean_messages",
  },
];

/** XP bonus per completed challenge */
export const CHALLENGE_XP_BONUS = 15;

// ─── Functions ──────────────────────────────────────────────────────

/**
 * Get today's date as YYYY-MM-DD string (local time).
 */
export function getTodayString(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * Select 3 challenges for a given date using deterministic seeding.
 */
export function selectDailyChallenges(dateStr: string): string[] {
  // Simple hash from date string for deterministic selection
  let hash = 0;
  for (let i = 0; i < dateStr.length; i++) {
    hash = ((hash << 5) - hash + dateStr.charCodeAt(i)) | 0;
  }
  hash = Math.abs(hash);

  const pool = [...CHALLENGE_POOL];
  const selected: string[] = [];

  for (let i = 0; i < 3 && pool.length > 0; i++) {
    const idx = (hash + i * 7) % pool.length;
    selected.push(pool[idx].id);
    pool.splice(idx, 1);
  }

  return selected;
}

/**
 * Create or refresh daily challenge state.
 */
export function createDailyChallengeState(dateStr?: string): DailyChallengeState {
  const today = dateStr ?? getTodayString();
  return {
    date: today,
    challengeIds: selectDailyChallenges(today),
    progress: {},
    completedIds: [],
  };
}

/**
 * Get challenge definition by ID.
 */
export function getChallenge(id: string): ChallengeDefinition | undefined {
  return CHALLENGE_POOL.find((c) => c.id === id);
}

/**
 * Update challenge progress. Returns the state with any newly completed challenge IDs.
 */
export function updateChallengeProgress(
  state: DailyChallengeState,
  trackingKey: ChallengeTrackingKey,
  increment: number,
): { state: DailyChallengeState; newlyCompleted: string[] } {
  const newProgress = { ...state.progress };
  const newlyCompleted: string[] = [];

  for (const challengeId of state.challengeIds) {
    if (state.completedIds.includes(challengeId)) continue;
    const def = getChallenge(challengeId);
    if (!def || def.trackingKey !== trackingKey) continue;

    const current = (newProgress[challengeId] ?? 0) + increment;
    newProgress[challengeId] = current;

    if (current >= def.target) {
      newlyCompleted.push(challengeId);
    }
  }

  return {
    state: {
      ...state,
      progress: newProgress,
      completedIds: [...state.completedIds, ...newlyCompleted],
    },
    newlyCompleted,
  };
}

/**
 * Validate challenge state from localStorage.
 */
export function isValidChallengeState(data: unknown): data is DailyChallengeState {
  if (typeof data !== "object" || data === null || Array.isArray(data)) return false;
  const d = data as Record<string, unknown>;
  if (typeof d.date !== "string") return false;
  if (!Array.isArray(d.challengeIds)) return false;
  if (typeof d.progress !== "object" || d.progress === null) return false;
  if (!Array.isArray(d.completedIds)) return false;
  return true;
}
