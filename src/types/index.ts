export interface LessonTopic {
  id: string;
  title: string;
  titleKr: string;
  starterMessage: string;
  icon: string;
}

export interface VocabularyItem {
  id: string;
  korean: string;
  romanization: string;
  english: string;
  savedAt: string;
}

// Gamification types

export type XPAction =
  | "message_korean"
  | "message_full_korean"
  | "flashcard_session"
  | "flashcard_perfect"
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
