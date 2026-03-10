"use client";

import { useMemo } from "react";
import { LESSON_TOPICS, meetsRankRequirement } from "@/lib/lesson-topics";
import { RANK_LADDER } from "@/lib/gamification";
import { getDailyFocus } from "@/lib/daily-planner";
import type { RankInfo, LessonDifficulty, ResidentRank } from "@/types";

/** Atmospheric welcome greetings per rank */
const WELCOME_GREETINGS: Record<string, { korean: string; english: string }> = {
  new_resident: {
    korean: "환영합니다, 새 입주자님.",
    english: "Welcome, new resident. What shall we study tonight?",
  },
  quiet_tenant: {
    korean: "돌아왔군요, 세입자님.",
    english: "You're back. Shall we continue where we left off?",
  },
  regular: {
    korean: "어서 오세요. 기다리고 있었어요.",
    english: "Welcome. I've been waiting for you.",
  },
  trusted_neighbor: {
    korean: "다시 만나서 반가워요, 이웃님.",
    english: "Good to see you again, neighbor. The usual?",
  },
  floor_senior: {
    korean: "선배님, 오셨군요. 이 층은 당신 것이에요.",
    english: "You're here. This floor belongs to you now.",
  },
};

/** Difficulty badge colors and labels */
const DIFFICULTY_CONFIG: Record<LessonDifficulty, { label: string; className: string }> = {
  beginner: {
    label: "Beginner",
    className: "text-emerald-400/70 bg-emerald-400/10 border-emerald-400/20",
  },
  intermediate: {
    label: "Intermediate",
    className: "text-amber-400/70 bg-amber-400/10 border-amber-400/20",
  },
  advanced: {
    label: "Advanced",
    className: "text-red-400/70 bg-red-400/10 border-red-400/20",
  },
};

/** Get the display name for a rank */
function getRankDisplayName(rankId: ResidentRank): string {
  const rank = RANK_LADDER.find((r) => r.id === rankId);
  return rank?.english ?? rankId;
}

interface WelcomeScreenProps {
  onSelectTopic: (message: string, topicId: string) => void;
  rank?: RankInfo;
  visitedTopics?: Set<string>;
  dueCount?: number;
  onStartStudy?: () => void;
}

export default function WelcomeScreen({ onSelectTopic, rank, visitedTopics, dueCount = 0, onStartStudy }: WelcomeScreenProps) {
  const greeting = WELCOME_GREETINGS[rank?.id ?? "new_resident"] ?? WELCOME_GREETINGS.new_resident;
  const currentRankId = rank?.id ?? "new_resident";

  const dailyFocus = useMemo(
    () => getDailyFocus(visitedTopics ?? new Set(), dueCount, currentRankId),
    [visitedTopics, dueCount, currentRankId],
  );

  return (
    <div className="w-full flex flex-col items-center px-4 py-2 sm:py-8">
      <div className="text-center mb-3 sm:mb-8">
        <h2 className="text-xl sm:text-2xl font-light text-goshiwon-text mb-1 sm:mb-2 font-serif-display">
          {greeting.korean}
        </h2>
        <p className="text-xs sm:text-sm text-goshiwon-text-secondary">
          {greeting.english}
        </p>
      </div>

      {/* Today's Focus — review words / suggested topic */}
      {(dailyFocus.suggestedTopic || dailyFocus.reviewReminder) && (
        <div className="w-full max-w-lg mb-2 sm:mb-4">
          <div className="bg-goshiwon-surface/80 border border-goshiwon-yellow/20 rounded-lg p-2.5 sm:p-3 space-y-1.5 sm:space-y-2">
            <p className="text-[10px] text-goshiwon-text-muted uppercase tracking-wider">
              Today&apos;s Focus
            </p>
            <p className="text-sm text-[#d4a843] font-korean leading-snug">
              &ldquo;{dailyFocus.dailyQuote.korean}&rdquo;
            </p>
            <p className="text-[11px] text-goshiwon-text-muted italic font-serif-display">
              {dailyFocus.dailyQuote.english}
            </p>
            <div className="flex items-center gap-2 flex-wrap">
              {dailyFocus.reviewReminder && onStartStudy && (
                <button
                  onClick={onStartStudy}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium rounded-full bg-goshiwon-accent/20 text-goshiwon-accent-light hover:bg-goshiwon-accent/30 transition-colors border border-goshiwon-accent/20"
                >
                  <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                    <line x1="8" y1="21" x2="16" y2="21" />
                    <line x1="12" y1="17" x2="12" y2="21" />
                  </svg>
                  Review {dailyFocus.dueWordCount} words
                </button>
              )}
              {dailyFocus.suggestedTopic && (
                <button
                  onClick={() =>
                    onSelectTopic(
                      dailyFocus.suggestedTopic!.starterMessage,
                      dailyFocus.suggestedTopic!.id,
                    )
                  }
                  className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium rounded-full bg-goshiwon-yellow/10 text-goshiwon-yellow/80 hover:bg-goshiwon-yellow/20 transition-colors border border-goshiwon-yellow/20"
                >
                  {dailyFocus.reason === "unvisited" ? "Start" : "Review"}: {dailyFocus.suggestedTopic.title}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <div data-tutorial="welcome-topics" className="grid grid-cols-2 gap-1.5 sm:gap-3 w-full max-w-lg">
        {LESSON_TOPICS.map((topic, index) => {
          const isLast = index === LESSON_TOPICS.length - 1;
          const isOddCount = LESSON_TOPICS.length % 2 !== 0;
          const visited = visitedTopics?.has(topic.id) ?? false;
          const isUnlocked = meetsRankRequirement(currentRankId, topic.requiredRank);
          const diffConfig = DIFFICULTY_CONFIG[topic.difficulty];

          return (
            <button
              key={topic.id}
              onClick={() => isUnlocked && onSelectTopic(topic.starterMessage, topic.id)}
              disabled={!isUnlocked}
              aria-label={`Start lesson: ${topic.title}${!isUnlocked ? ` (locked — unlocks at ${getRankDisplayName(topic.requiredRank!)})` : ""}`}
              className={`group relative text-left p-2.5 sm:p-4 bg-goshiwon-surface border border-goshiwon-border rounded-lg transition-all duration-300 border-t-2 ${
                isLast && isOddCount ? "col-span-2" : ""
              } ${
                isUnlocked
                  ? "hover:border-goshiwon-yellow/50 hover:bg-goshiwon-surface-hover border-t-goshiwon-accent"
                  : "border-t-goshiwon-border opacity-60 cursor-not-allowed"
              }`}
            >
              {/* Top-right badges */}
              <div className="absolute top-1.5 right-2 flex items-center gap-1">
                {visited && (
                  <span className="text-[9px] text-goshiwon-yellow/60 italic">
                    studied
                  </span>
                )}
                <span className={`text-[8px] font-medium px-1.5 py-px rounded-full border ${diffConfig.className}`}>
                  {diffConfig.label}
                </span>
              </div>

              <div className="flex items-center gap-3">
                <span className={`w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-full border text-lg shrink-0 transition-all duration-300 ${
                  isUnlocked
                    ? "bg-goshiwon-accent/10 border-goshiwon-accent/20 text-goshiwon-yellow/70 group-hover:text-goshiwon-yellow group-hover:bg-goshiwon-accent/20"
                    : "bg-goshiwon-border/30 border-goshiwon-border text-goshiwon-text-muted/40"
                }`}>
                  {isUnlocked ? topic.icon : (
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                      <path d="M7 11V7a5 5 0 0110 0v4" />
                    </svg>
                  )}
                </span>
                <div>
                  <div className="text-sm font-medium text-goshiwon-text">
                    {topic.titleKr}
                  </div>
                  <div className="text-xs text-goshiwon-text-muted">
                    {topic.title}
                  </div>
                  {!isUnlocked && topic.requiredRank && (
                    <div className="text-[9px] text-goshiwon-accent-light/60 mt-0.5">
                      🔒 {getRankDisplayName(topic.requiredRank)}
                    </div>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <p className="mt-3 sm:mt-8 text-xs text-goshiwon-text-secondary text-center max-w-sm">
        Or simply type a message below. Moon-jo is always... watching.
      </p>
      {(!rank || rank.id === "new_resident") && (
        <p className="mt-1 text-[10px] text-goshiwon-text-muted italic text-center">
          Tip: Write in Korean to earn XP and rise through the ranks.
        </p>
      )}
    </div>
  );
}
