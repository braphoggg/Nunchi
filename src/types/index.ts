// Lesson history
export interface SavedMessage {
  role: "user" | "assistant";
  text: string;
}

export interface SavedConversation {
  id: string;
  savedAt: string;
  preview: string;
  messageCount: number;
  messages: SavedMessage[];
}

export type LessonDifficulty = "beginner" | "intermediate" | "advanced";

export interface LessonTopic {
  id: string;
  title: string;
  titleKr: string;
  starterMessage: string;
  icon: string;
  difficulty: LessonDifficulty;
  /** Minimum rank required to unlock (soft lock — always tappable). */
  requiredRank?: ResidentRank;
}

export interface VocabularyItem {
  id: string;
  korean: string;
  romanization: string;
  english: string;
  savedAt: string;
  // SRS (Spaced Repetition) fields — optional for backward compat,
  // filled with defaults during migration on load
  easeFactor?: number;    // SM-2 ease factor, default 2.5
  interval?: number;      // days until next review, default 0
  repetitions?: number;   // consecutive correct reps, default 0
  nextReview?: string;    // ISO date string for next review
  lastGrade?: "again" | "good" | "easy" | null;
}

// Gamification types

export type XPAction =
  | "message_korean"
  | "message_full_korean"
  | "flashcard_session"
  | "flashcard_perfect"
  | "quiz_perfect"
  | "word_saved"
  | "no_translate";

export interface XPEvent {
  action: XPAction;
  amount: number;
  timestamp: string;
}

export interface StreakData {
  currentStreak: number;
  longestStreak: number;
  lastPracticeDate: string;
}

export interface SessionStats {
  totalMessages: number;
  totalFlashcardSessions: number;
  totalTranslations: number;
  messagesWithoutTranslate: number;
}

export interface GamificationData {
  xp: { totalXP: number; history: XPEvent[] };
  streak: StreakData;
  stats: SessionStats;
}

export type ResidentRank =
  | "new_resident"
  | "quiet_tenant"
  | "regular"
  | "trusted_neighbor"
  | "floor_senior";

export interface RankInfo {
  id: ResidentRank;
  korean: string;
  english: string;
  description: string;
  minXP: number;
  minVocab: number;
}
