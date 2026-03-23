"use client";

import { memo } from "react";
import type { RankInfo } from "@/types";

interface StatsBarProps {
  streak: number;
  totalXP: number;
  rank: RankInfo;
  rankProgress: number;
  nextRank: RankInfo | null;
  vocabCount: number;
  onToggleStats: () => void;
}

function getStreakLabel(days: number, short = false): string {
  if (days === 0) return short ? "New" : "Start your streak";
  if (days === 1) return "Day 1";
  if (days < 7) return `${days} days`;
  if (days < 30) return short ? `${days}d` : `${days} days \u2014 You can\u2019t leave`;
  return short ? `${days}d` : `${days} days \u2014 Home.`;
}

function StatsBar({
  streak,
  totalXP,
  rank,
  rankProgress,
  nextRank,
  vocabCount,
  onToggleStats,
}: StatsBarProps) {
  const progressTitle = nextRank
    ? `${totalXP} / ${nextRank.minXP} XP · ${vocabCount} / ${nextRank.minVocab} words → ${nextRank.english}`
    : "Max rank reached";

  return (
    <button
      data-tutorial="statsbar"
      onClick={onToggleStats}
      className="relative z-40 w-full flex items-center justify-between px-2 sm:px-3 py-1.5 bg-goshiwon-surface/50 border-b border-goshiwon-border text-xs sm:text-xs hover:bg-goshiwon-surface-hover transition-colors cursor-pointer group"
      aria-label="Open stats panel"
      title="View detailed stats"
    >
      {/* Streak */}
      <div className="flex items-center gap-1">
        <span className={streak > 0 ? "text-goshiwon-yellow" : "text-goshiwon-accent"}>
          <svg className="w-3 h-3 inline-block" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 23c-4.97 0-9-3.58-9-8 0-3.07 2.17-6.09 4-7.87V4l3.42 2.72C11.27 5.42 12 3.58 12 1c1.73 2.87 5 6.18 5 9 0 .52-.06 1.02-.17 1.5C18.15 12.72 19 14.27 19 16c0 3.87-3.13 7-7 7z" />
          </svg>
        </span>
        {(() => {
          const short = getStreakLabel(streak, true);
          const long = getStreakLabel(streak);
          const color = streak > 0 ? "text-goshiwon-yellow" : "text-goshiwon-text-muted";
          return short === long ? (
            <span className={color}>{long}</span>
          ) : (
            <span className={color}>
              <span className="sm:hidden">{short}</span>
              <span className="hidden sm:inline">{long}</span>
            </span>
          );
        })()}
      </div>

      {/* XP */}
      <div className="flex items-center gap-1">
        <span className="text-goshiwon-yellow">&#10022;</span>
        <span className="text-goshiwon-yellow font-medium">{totalXP.toLocaleString()} XP</span>
      </div>

      {/* Rank + progress + chevron */}
      <div className="flex items-center gap-1 sm:gap-2">
        <span className="text-goshiwon-yellow text-xs" title={rank.description}>
          {rank.korean}
          <span className="hidden sm:inline"> ({rank.english})</span>
        </span>
        <div
          className="w-8 sm:w-12 h-[3px] bg-goshiwon-border rounded-full overflow-hidden"
          title={progressTitle}
          aria-label={progressTitle}
        >
          <div
            className="h-full bg-goshiwon-yellow rounded-full transition-all duration-500"
            style={{ width: `${Math.round(Math.min(rankProgress, 1) * 100)}%` }}
          />
        </div>
        {/* Chevron affordance */}
        <svg
          className="w-3 h-3 text-goshiwon-text-muted/50 group-hover:text-goshiwon-text-muted transition-colors"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <polyline points="18 15 12 9 6 15" />
        </svg>
      </div>
    </button>
  );
}

export default memo(StatsBar);
