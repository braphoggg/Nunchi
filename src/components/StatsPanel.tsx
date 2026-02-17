"use client";

import type { RankInfo, SessionStats } from "@/types";

interface StatsPanelProps {
  rank: RankInfo;
  rankProgress: number;
  nextRank: RankInfo | null;
  totalXP: number;
  currentStreak: number;
  longestStreak: number;
  stats: SessionStats;
  vocabCount: number;
  onClose: () => void;
}

export default function StatsPanel({
  rank,
  rankProgress,
  nextRank,
  totalXP,
  currentStreak,
  longestStreak,
  stats,
  vocabCount,
  onClose,
}: StatsPanelProps) {
  return (
    <div className="absolute inset-0 z-50 bg-goshiwon-bg/95 backdrop-blur-sm overflow-y-auto animate-vocab-panel-in">
      {/* Header */}
      <div className="sticky top-0 flex items-center justify-between px-4 py-3 bg-goshiwon-surface border-b border-goshiwon-border">
        <h2 className="text-sm font-medium text-goshiwon-text">
          Resident Record
        </h2>
        <button
          onClick={onClose}
          aria-label="Close stats panel"
          className="text-goshiwon-text-muted hover:text-goshiwon-text transition-colors p-1"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="p-4 space-y-5">
        {/* Rank Card */}
        <div className="bg-goshiwon-surface rounded-lg p-4 border border-goshiwon-border">
          <div className="text-center space-y-1">
            <p className="text-goshiwon-yellow text-lg font-medium">{rank.korean}</p>
            <p className="text-goshiwon-text text-sm">{rank.english}</p>
            <p className="text-goshiwon-text-secondary text-xs italic mt-2">
              &ldquo;{rank.description}&rdquo;
            </p>
          </div>

          {/* Progress to next rank */}
          {nextRank && (
            <div className="mt-4">
              <div className="flex justify-between text-[10px] text-goshiwon-text-muted mb-1">
                <span>{rank.korean}</span>
                <span>{nextRank.korean}</span>
              </div>
              <div className="w-full h-1.5 bg-goshiwon-border rounded-full overflow-hidden">
                <div
                  className="h-full bg-goshiwon-yellow rounded-full transition-all duration-500"
                  style={{ width: `${Math.round(Math.min(rankProgress, 1) * 100)}%` }}
                />
              </div>
              <p className="text-[10px] text-goshiwon-text-muted mt-1 text-center">
                {totalXP}/{nextRank.minXP} XP &middot; {vocabCount}/{nextRank.minVocab} words
              </p>
            </div>
          )}
          {!nextRank && (
            <p className="text-[10px] text-goshiwon-yellow mt-3 text-center italic">
              Maximum rank achieved.
            </p>
          )}
        </div>

        {/* XP */}
        <div className="bg-goshiwon-surface rounded-lg p-3 border border-goshiwon-border">
          <div className="flex items-center justify-between">
            <span className="text-goshiwon-text-secondary text-xs">Total XP</span>
            <span className="text-goshiwon-yellow font-bold">{totalXP}</span>
          </div>
        </div>

        {/* Streak */}
        <div className="bg-goshiwon-surface rounded-lg p-3 border border-goshiwon-border space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-goshiwon-text-secondary text-xs">Current Streak</span>
            <span className="text-goshiwon-yellow font-medium">
              {currentStreak} {currentStreak === 1 ? "day" : "days"}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-goshiwon-text-secondary text-xs">Longest Streak</span>
            <span className="text-goshiwon-text-muted text-sm">
              {longestStreak} {longestStreak === 1 ? "day" : "days"}
            </span>
          </div>
        </div>

        {/* Stats */}
        <div className="bg-goshiwon-surface rounded-lg p-3 border border-goshiwon-border">
          <p className="text-goshiwon-text-secondary text-xs mb-2">Session Stats</p>
          <div className="space-y-1.5">
            <StatRow label="Messages sent" value={stats.totalMessages} />
            <StatRow label="Flashcard sessions" value={stats.totalFlashcardSessions} />
            <StatRow label="Translations used" value={stats.totalTranslations} />
          </div>
        </div>
      </div>
    </div>
  );
}

function StatRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-goshiwon-text-muted">{label}</span>
      <span className="text-goshiwon-text">{value}</span>
    </div>
  );
}
