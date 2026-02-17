"use client";

import type { RankInfo } from "@/types";

interface StatsBarProps {
  streak: number;
  totalXP: number;
  rank: RankInfo;
  rankProgress: number;
  onToggleStats: () => void;
}

function getStreakLabel(days: number): string {
  if (days === 0) return "You haven't started";
  if (days === 1) return "Day 1";
  if (days < 7) return `${days} days`;
  if (days < 30) return `${days} days \u2014 You can't leave`;
  return `${days} days \u2014 Home.`;
}

export default function StatsBar({
  streak,
  totalXP,
  rank,
  rankProgress,
  onToggleStats,
}: StatsBarProps) {
  return (
    <button
      onClick={onToggleStats}
      className="relative z-50 w-full flex items-center justify-between px-3 py-1 bg-goshiwon-surface/50 border-b border-goshiwon-border text-xs hover:bg-goshiwon-surface-hover transition-colors cursor-pointer"
      aria-label="Open stats panel"
    >
      {/* Streak */}
      <div className="flex items-center gap-1">
        <span className={streak > 0 ? "text-goshiwon-yellow" : "text-goshiwon-accent"}>
          <svg className="w-3 h-3 inline-block" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 23c-4.97 0-9-3.58-9-8 0-3.07 2.17-6.09 4-7.87V4l3.42 2.72C11.27 5.42 12 3.58 12 1c1.73 2.87 5 6.18 5 9 0 .52-.06 1.02-.17 1.5C18.15 12.72 19 14.27 19 16c0 3.87-3.13 7-7 7z" />
          </svg>
        </span>
        <span className={`${streak > 0 ? "text-goshiwon-yellow" : "text-goshiwon-text-muted"}`}>
          {getStreakLabel(streak)}
        </span>
      </div>

      {/* XP */}
      <div className="flex items-center gap-1">
        <span className="text-goshiwon-yellow">&#10022;</span>
        <span className="text-goshiwon-yellow font-medium">{totalXP} XP</span>
      </div>

      {/* Rank + progress */}
      <div className="flex items-center gap-2">
        <span className="text-goshiwon-yellow text-[11px]" title={`${rank.english} — ${rank.description}`}>{rank.korean}</span>
        <div className="w-12 h-[3px] bg-goshiwon-border rounded-full overflow-hidden">
          <div
            className="h-full bg-goshiwon-yellow rounded-full transition-all duration-500"
            style={{ width: `${Math.round(Math.min(rankProgress, 1) * 100)}%` }}
          />
        </div>
      </div>
    </button>
  );
}
