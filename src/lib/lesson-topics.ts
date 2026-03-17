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

  // ─── New intermediate topics (require Quiet Tenant) ───────────────
  {
    id: "directions",
    title: "Giving Directions",
    titleKr: "길 안내",
    starterMessage: "Teach me how to ask for and give directions in Korean.",
    icon: "길",
    difficulty: "intermediate",
    requiredRank: "quiet_tenant",
  },
  {
    id: "shopping",
    title: "Shopping",
    titleKr: "쇼핑",
    starterMessage: "Teach me useful Korean phrases for shopping.",
    icon: "쇼",
    difficulty: "intermediate",
    requiredRank: "quiet_tenant",
  },
  {
    id: "weather",
    title: "Weather & Small Talk",
    titleKr: "날씨",
    starterMessage: "Teach me how to talk about the weather and make small talk in Korean.",
    icon: "날",
    difficulty: "intermediate",
    requiredRank: "quiet_tenant",
  },
  {
    id: "phone",
    title: "Phone Calls",
    titleKr: "전화",
    starterMessage: "Teach me how to make and receive phone calls in Korean.",
    icon: "전",
    difficulty: "intermediate",
    requiredRank: "quiet_tenant",
  },
  {
    id: "doctor",
    title: "Doctor Visit",
    titleKr: "병원",
    starterMessage: "Teach me Korean phrases I need when visiting a doctor or hospital.",
    icon: "병",
    difficulty: "intermediate",
    requiredRank: "quiet_tenant",
  },

  // ─── New advanced topics (require Regular or higher) ──────────────
  {
    id: "proverbs",
    title: "Idioms & Proverbs",
    titleKr: "속담",
    starterMessage: "Teach me common Korean idioms and proverbs.",
    icon: "속",
    difficulty: "advanced",
    requiredRank: "regular",
  },
  {
    id: "opinions",
    title: "Debating Opinions",
    titleKr: "토론",
    starterMessage: "Let's practice expressing and debating opinions in Korean.",
    icon: "토",
    difficulty: "advanced",
    requiredRank: "regular",
  },
  {
    id: "people",
    title: "Describing People",
    titleKr: "사람 묘사",
    starterMessage: "Teach me how to describe people's appearance and personality in Korean.",
    icon: "사",
    difficulty: "advanced",
    requiredRank: "trusted_neighbor",
  },

  // ─── Free Conversation (always last, always unlocked) ─────────────
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
