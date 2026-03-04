/**
 * Daily Planner — suggests a learning focus for the day.
 *
 * Logic:
 *   1. If there are words due for SRS review, suggest reviewing first
 *   2. Suggest the next unvisited topic, or cycle back to least-recently visited
 *   3. Encourage streak continuation
 */

import { LESSON_TOPICS, meetsRankRequirement } from "./lesson-topics";
import type { ResidentRank } from "@/types";

export interface DailyFocus {
  /** Suggested topic ID and title */
  suggestedTopic: { id: string; titleKr: string; title: string; starterMessage: string } | null;
  /** Reason for suggestion */
  reason: "unvisited" | "review" | "continue" | null;
  /** Should prompt user to review flashcards first? */
  reviewReminder: boolean;
  /** Number of words due for review */
  dueWordCount: number;
  /** Moon-jo daily greeting */
  dailyQuote: { korean: string; english: string };
}

const DAILY_QUOTES = [
  { korean: "오늘도 함께 공부해요.", english: "Let's study together today too." },
  { korean: "매일 조금씩... 그게 비밀이에요.", english: "A little each day... that's the secret." },
  { korean: "기다리고 있었어요. 시작할까요?", english: "I've been waiting. Shall we begin?" },
  { korean: "오늘은 뭘 배워볼까요?", english: "What shall we learn today?" },
  { korean: "꾸준함이 중요해요. 제가 지켜볼게요.", english: "Consistency matters. I'll be watching." },
  { korean: "어제보다 더 잘할 수 있어요.", english: "You can do better than yesterday." },
  { korean: "복도가 조용하네요... 공부하기 좋은 밤이에요.", english: "The hallway is quiet... a good night for studying." },
];

/**
 * Get a deterministic daily quote based on the date.
 */
function getDailyQuote(now: Date = new Date()): { korean: string; english: string } {
  const dayOfYear = Math.floor(
    (now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / 86400000,
  );
  return DAILY_QUOTES[dayOfYear % DAILY_QUOTES.length];
}

/**
 * Compute daily focus recommendations.
 */
export function getDailyFocus(
  visitedTopics: Set<string>,
  dueWordCount: number,
  currentRank: ResidentRank = "new_resident",
  now: Date = new Date(),
): DailyFocus {
  const dailyQuote = getDailyQuote(now);
  const reviewReminder = dueWordCount > 0;

  // Find unvisited topics the user has unlocked (excluding "free")
  const unvisited = LESSON_TOPICS.filter(
    (t) =>
      t.id !== "free" &&
      !visitedTopics.has(t.id) &&
      meetsRankRequirement(currentRank, t.requiredRank),
  );

  if (unvisited.length > 0) {
    const topic = unvisited[0];
    return {
      suggestedTopic: {
        id: topic.id,
        titleKr: topic.titleKr,
        title: topic.title,
        starterMessage: topic.starterMessage,
      },
      reason: "unvisited",
      reviewReminder,
      dueWordCount,
      dailyQuote,
    };
  }

  // All topics visited — suggest cycling through based on day of week
  const unlocked = LESSON_TOPICS.filter(
    (t) =>
      t.id !== "free" &&
      meetsRankRequirement(currentRank, t.requiredRank),
  );

  if (unlocked.length > 0) {
    const dayIndex = now.getDay(); // 0-6
    const topic = unlocked[dayIndex % unlocked.length];
    return {
      suggestedTopic: {
        id: topic.id,
        titleKr: topic.titleKr,
        title: topic.title,
        starterMessage: topic.starterMessage,
      },
      reason: "review",
      reviewReminder,
      dueWordCount,
      dailyQuote,
    };
  }

  return {
    suggestedTopic: null,
    reason: null,
    reviewReminder,
    dueWordCount,
    dailyQuote,
  };
}
