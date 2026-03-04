import type { LessonTopic, ResidentRank } from "@/types";
import { RANK_LADDER } from "./gamification";

export const LESSON_TOPICS: LessonTopic[] = [
  {
    id: "greetings",
    title: "Basic Greetings",
    titleKr: "인사",
    starterMessage: "Teach me basic Korean greetings.",
    icon: "회",
    difficulty: "beginner",
  },
  {
    id: "survival",
    title: "Survival Phrases",
    titleKr: "생존 표현",
    starterMessage: "Teach me survival phrases I need to get by in Korea.",
    icon: "생",
    difficulty: "beginner",
  },
  {
    id: "numbers",
    title: "Numbers & Counting",
    titleKr: "숫자",
    starterMessage: "Teach me Korean numbers and how to count.",
    icon: "숫",
    difficulty: "beginner",
  },
  {
    id: "food",
    title: "Ordering Food",
    titleKr: "음식 주문",
    starterMessage: "Teach me how to order food in Korean.",
    icon: "식",
    difficulty: "intermediate",
    requiredRank: "quiet_tenant",
  },
  {
    id: "feelings",
    title: "Describing Feelings",
    titleKr: "감정 표현",
    starterMessage: "Teach me how to describe my feelings in Korean.",
    icon: "감",
    difficulty: "intermediate",
    requiredRank: "quiet_tenant",
  },
  {
    id: "politeness",
    title: "Polite vs Casual",
    titleKr: "존댓말 vs 반말",
    starterMessage:
      "Teach me the difference between polite and casual speech in Korean.",
    icon: "말",
    difficulty: "advanced",
    requiredRank: "regular",
  },
  {
    id: "free",
    title: "Free Conversation",
    titleKr: "자유 대화",
    starterMessage: "Let's just talk. I want to practice Korean freely.",
    icon: "자",
    difficulty: "beginner",
  },
];

/**
 * Get the numeric index of a rank in the ladder (0 = lowest).
 * Returns -1 if rank is not found.
 */
export function getRankIndex(rankId: ResidentRank): number {
  return RANK_LADDER.findIndex((r) => r.id === rankId);
}

/**
 * Check if a player's current rank meets the minimum required rank.
 */
export function meetsRankRequirement(
  currentRank: ResidentRank,
  requiredRank?: ResidentRank,
): boolean {
  if (!requiredRank) return true;
  return getRankIndex(currentRank) >= getRankIndex(requiredRank);
}
