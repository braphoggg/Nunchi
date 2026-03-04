"use client";

import { useMemo } from "react";
import type { RankInfo, SessionStats, VocabularyItem } from "@/types";
import { isDueForReview } from "@/lib/srs";

interface StatsPanelProps {
  rank: RankInfo;
  rankProgress: number;
  nextRank: RankInfo | null;
  totalXP: number;
  currentStreak: number;
  longestStreak: number;
  stats: SessionStats;
  vocabCount: number;
  words?: VocabularyItem[];
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
  words = [],
  onClose,
}: StatsPanelProps) {
  // SRS analytics
  const srsInsights = useMemo(() => {
    const now = new Date();
    const studyable = words.filter((w) => w.english?.trim());
    let newWords = 0;
    let learning = 0;
    let mastered = 0;
    let dueNow = 0;

    for (const w of studyable) {
      if (!w.repetitions || w.repetitions === 0) {
        newWords++;
      } else if ((w.interval ?? 0) >= 21) {
        mastered++;
      } else {
        learning++;
      }
      if (isDueForReview(w, now)) {
        dueNow++;
      }
    }

    return { newWords, learning, mastered, dueNow, total: studyable.length };
  }, [words]);

  // Immersion rate (messages sent without translate / total messages)
  const immersionPct = stats.totalMessages > 0
    ? Math.round((stats.messagesWithoutTranslate / stats.totalMessages) * 100)
    : 0;
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

        {/* Vocabulary SRS Breakdown */}
        {srsInsights.total > 0 && (
          <div className="bg-goshiwon-surface rounded-lg p-3 border border-goshiwon-border">
            <p className="text-goshiwon-text-secondary text-xs mb-3">Vocabulary Breakdown</p>

            {/* SRS bar */}
            <div className="flex h-2 rounded-full overflow-hidden bg-goshiwon-border mb-3">
              {srsInsights.mastered > 0 && (
                <div
                  className="bg-emerald-500/70"
                  style={{ width: `${(srsInsights.mastered / srsInsights.total) * 100}%` }}
                  title={`Mastered: ${srsInsights.mastered}`}
                />
              )}
              {srsInsights.learning > 0 && (
                <div
                  className="bg-amber-400/70"
                  style={{ width: `${(srsInsights.learning / srsInsights.total) * 100}%` }}
                  title={`Learning: ${srsInsights.learning}`}
                />
              )}
              {srsInsights.newWords > 0 && (
                <div
                  className="bg-goshiwon-text-muted/30"
                  style={{ width: `${(srsInsights.newWords / srsInsights.total) * 100}%` }}
                  title={`New: ${srsInsights.newWords}`}
                />
              )}
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500/70" />
                  <span className="text-goshiwon-text-muted">Mastered</span>
                </span>
                <span className="text-goshiwon-text">{srsInsights.mastered}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-400/70" />
                  <span className="text-goshiwon-text-muted">Learning</span>
                </span>
                <span className="text-goshiwon-text">{srsInsights.learning}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-goshiwon-text-muted/30" />
                  <span className="text-goshiwon-text-muted">New</span>
                </span>
                <span className="text-goshiwon-text">{srsInsights.newWords}</span>
              </div>
              {srsInsights.dueNow > 0 && (
                <div className="pt-1.5 border-t border-goshiwon-border/50">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-goshiwon-accent-light">Due for review</span>
                    <span className="text-goshiwon-accent-light font-medium">{srsInsights.dueNow}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Korean Immersion */}
        {stats.totalMessages > 0 && (
          <div className="bg-goshiwon-surface rounded-lg p-3 border border-goshiwon-border">
            <p className="text-goshiwon-text-secondary text-xs mb-2">Korean Immersion</p>
            <div className="flex items-center gap-3">
              <div className="relative w-12 h-12">
                <svg className="w-12 h-12 -rotate-90" viewBox="0 0 36 36">
                  <circle cx="18" cy="18" r="15" fill="none" stroke="currentColor" strokeWidth="3" className="text-goshiwon-border" />
                  <circle
                    cx="18" cy="18" r="15" fill="none"
                    strokeWidth="3"
                    strokeDasharray={`${immersionPct * 0.94} 100`}
                    strokeLinecap="round"
                    className="text-goshiwon-yellow"
                  />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-goshiwon-text">
                  {immersionPct}%
                </span>
              </div>
              <div>
                <p className="text-xs text-goshiwon-text">
                  {stats.messagesWithoutTranslate}/{stats.totalMessages} messages
                </p>
                <p className="text-[10px] text-goshiwon-text-muted mt-0.5">
                  without translation button
                </p>
              </div>
            </div>
          </div>
        )}
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
