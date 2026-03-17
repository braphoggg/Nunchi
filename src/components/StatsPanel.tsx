"use client";

import { useMemo, useState } from "react";
import Modal from "./Modal";
import { isDueForReview } from "@/lib/srs";
import { useGamificationContext } from "@/contexts/GamificationContext";
import { ACHIEVEMENTS, type Achievement } from "@/lib/achievements";
import type { XPEvent, VocabularyItem } from "@/types";
import {
  getXPPerDay,
  getVocabGrowth,
  getActivityDays,
  getLastNDays,
} from "@/lib/progress-analytics";

interface StatsPanelProps {
  onClose: () => void;
}

export default function StatsPanel({ onClose }: StatsPanelProps) {
  const {
    rank, rankProgress, nextRank, totalXP, xpHistory,
    currentStreak, longestStreak, stats,
    vocabCount, words, achievementProgress,
  } = useGamificationContext();
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
    <Modal onClose={onClose} title="Resident Record" stickyHeader closeAriaLabel="Close stats panel">
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
              <div className="flex justify-between text-xs text-goshiwon-text-muted mb-1">
                <span>{rank.korean}</span>
                <span>{nextRank.korean}</span>
              </div>
              <div className="w-full h-1.5 bg-goshiwon-border rounded-full overflow-hidden">
                <div
                  className="h-full bg-goshiwon-yellow rounded-full transition-all duration-500"
                  style={{ width: `${Math.round(Math.min(rankProgress, 1) * 100)}%` }}
                />
              </div>
              <p className="text-xs text-goshiwon-text-muted mt-1 text-center">
                {totalXP}/{nextRank.minXP} XP &middot; {vocabCount}/{nextRank.minVocab} words
              </p>
            </div>
          )}
          {!nextRank && (
            <p className="text-xs text-goshiwon-yellow mt-3 text-center italic">
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
                <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-goshiwon-text">
                  {immersionPct}%
                </span>
              </div>
              <div>
                <p className="text-xs text-goshiwon-text">
                  {stats.messagesWithoutTranslate}/{stats.totalMessages} messages
                </p>
                <p className="text-xs text-goshiwon-text-muted mt-0.5">
                  without translation button
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ─── Progress Analytics ─────────────────────────────────────── */}
        {/* XP Per Day (14 days) */}
        <XPBarChart xpHistory={xpHistory} />

        {/* Vocabulary Growth (14 days) */}
        <VocabGrowthChart words={words} />

        {/* 30-Day Activity Calendar */}
        <ActivityCalendar xpHistory={xpHistory} />

        {/* Achievement Badge Gallery — English labels, tappable */}
        <AchievementGallery achievementProgress={achievementProgress} />
      </div>
    </Modal>
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

// ─── Progress Chart Components ──────────────────────────────────────

/** XP earned per day — 14-day bar chart */
function XPBarChart({ xpHistory }: { xpHistory: XPEvent[] }) {
  const data = useMemo(() => getXPPerDay(xpHistory, 14), [xpHistory]);
  const maxXP = Math.max(...data.map((d) => d.xp), 1);
  const totalWeek = data.slice(-7).reduce((sum, d) => sum + d.xp, 0);

  if (xpHistory.length === 0) return null;

  const chartW = 280;
  const chartH = 80;
  const barGap = 3;
  const barW = (chartW - barGap * (data.length - 1)) / data.length;

  return (
    <div className="bg-goshiwon-surface rounded-lg p-3 border border-goshiwon-border">
      <div className="flex items-center justify-between mb-3">
        <p className="text-goshiwon-text-secondary text-xs">14-Day XP</p>
        <span className="text-goshiwon-text-muted text-xs">
          {totalWeek} XP this week
        </span>
      </div>

      <svg
        viewBox={`0 0 ${chartW} ${chartH}`}
        className="w-full"
        role="img"
        aria-label="XP earned per day over the last 14 days"
      >
        {data.map((d, i) => {
          const barH = Math.max((d.xp / maxXP) * 55, d.xp > 0 ? 3 : 1);
          const x = i * (barW + barGap);
          const y = 58 - barH;
          const isToday = i === data.length - 1;

          return (
            <g key={d.date}>
              <rect
                x={x}
                y={y}
                width={barW}
                height={barH}
                rx={2}
                style={{
                  fill: isToday
                    ? "var(--color-goshiwon-yellow)"
                    : d.xp > 0
                      ? "var(--color-goshiwon-yellow)"
                      : "var(--color-goshiwon-border)",
                  opacity: isToday ? 1 : d.xp > 0 ? 0.4 : 0.3,
                }}
              />
              {/* Day label — show every other day + today */}
              {(i % 2 === 0 || isToday) && (
                <text
                  x={x + barW / 2}
                  y={73}
                  textAnchor="middle"
                  style={{ fill: "var(--color-goshiwon-text-muted)", fontSize: "7px" }}
                >
                  {isToday ? "Today" : d.label}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

/** Vocabulary growth — 14-day cumulative line chart */
function VocabGrowthChart({ words }: { words: VocabularyItem[] }) {
  const data = useMemo(() => getVocabGrowth(words, 14), [words]);
  const addedThisWeek = data.slice(-7).reduce((sum, d) => sum + d.added, 0);

  if (words.length === 0) return null;

  const chartW = 280;
  const chartH = 60;
  const maxCum = Math.max(...data.map((d) => d.cumulative), 1);
  const minCum = Math.min(...data.map((d) => d.cumulative));
  const range = maxCum - minCum || 1;

  // Build SVG polyline points
  const points = data
    .map((d, i) => {
      const x = (i / (data.length - 1)) * chartW;
      const y = chartH - 5 - ((d.cumulative - minCum) / range) * (chartH - 10);
      return `${x},${y}`;
    })
    .join(" ");

  // Area fill points (close the path at bottom)
  const areaPoints = `0,${chartH} ${points} ${chartW},${chartH}`;

  return (
    <div className="bg-goshiwon-surface rounded-lg p-3 border border-goshiwon-border">
      <div className="flex items-center justify-between mb-3">
        <p className="text-goshiwon-text-secondary text-xs">Vocabulary Growth</p>
        <span className="text-goshiwon-text-muted text-xs">
          +{addedThisWeek} this week
        </span>
      </div>

      <svg
        viewBox={`0 0 ${chartW} ${chartH}`}
        className="w-full"
        role="img"
        aria-label="Vocabulary growth over the last 14 days"
      >
        {/* Area fill */}
        <polygon
          points={areaPoints}
          style={{ fill: "var(--color-goshiwon-yellow)", opacity: 0.1 }}
        />
        {/* Line */}
        <polyline
          points={points}
          fill="none"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ stroke: "var(--color-goshiwon-yellow)", opacity: 0.7 }}
        />
        {/* End dot (today) */}
        {data.length > 0 && (() => {
          const last = data[data.length - 1];
          const x = chartW;
          const y = chartH - 5 - ((last.cumulative - minCum) / range) * (chartH - 10);
          return (
            <circle cx={x} cy={y} r={3} style={{ fill: "var(--color-goshiwon-yellow)" }} />
          );
        })()}
      </svg>

      <div className="flex justify-between text-[10px] mt-1" style={{ color: "var(--color-goshiwon-text-muted)" }}>
        <span>{minCum} words</span>
        <span>{maxCum} words</span>
      </div>
    </div>
  );
}

/** 30-Day Activity Calendar — dot grid */
function ActivityCalendar({ xpHistory }: { xpHistory: XPEvent[] }) {
  const activeDays = useMemo(() => getActivityDays(xpHistory, 30), [xpHistory]);
  const days = useMemo(() => getLastNDays(30), []);

  if (xpHistory.length === 0) return null;

  return (
    <div className="bg-goshiwon-surface rounded-lg p-3 border border-goshiwon-border">
      <div className="flex items-center justify-between mb-3">
        <p className="text-goshiwon-text-secondary text-xs">30-Day Activity</p>
        <span className="text-goshiwon-text-muted text-xs">
          {activeDays.size} active {activeDays.size === 1 ? "day" : "days"}
        </span>
      </div>

      <div className="flex flex-wrap gap-1 justify-center">
        {days.map((date) => {
          const active = activeDays.has(date);
          const isToday = date === days[days.length - 1];
          return (
            <div
              key={date}
              title={`${date}${active ? " — active" : ""}`}
              className={`w-3.5 h-3.5 rounded-sm transition-colors ${
                active
                  ? isToday
                    ? "bg-goshiwon-yellow"
                    : "bg-goshiwon-yellow/50"
                  : "bg-goshiwon-border/40"
              }`}
            />
          );
        })}
      </div>

      <div className="flex items-center justify-center gap-3 mt-2">
        <div className="flex items-center gap-1">
          <div className="w-2.5 h-2.5 rounded-sm bg-goshiwon-border/40" />
          <span className="text-[10px] text-goshiwon-text-muted">Inactive</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2.5 h-2.5 rounded-sm bg-goshiwon-yellow/50" />
          <span className="text-[10px] text-goshiwon-text-muted">Active</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2.5 h-2.5 rounded-sm bg-goshiwon-yellow" />
          <span className="text-[10px] text-goshiwon-text-muted">Today</span>
        </div>
      </div>
    </div>
  );
}

/** Interactive achievement gallery with tappable badges and detail card */
function AchievementGallery({ achievementProgress }: { achievementProgress: { unlockedIds: string[]; unlockTimestamps: Record<string, string> } }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selectedAch = selectedId ? ACHIEVEMENTS.find((a) => a.id === selectedId) : null;
  const selectedUnlocked = selectedId ? achievementProgress.unlockedIds.includes(selectedId) : false;

  return (
    <div className="bg-goshiwon-surface rounded-lg p-3 border border-goshiwon-border">
      <div className="flex items-center justify-between mb-3">
        <p className="text-goshiwon-text-secondary text-xs">Achievements</p>
        <span className="text-goshiwon-text-muted text-xs">
          {achievementProgress.unlockedIds.length}/{ACHIEVEMENTS.length}
        </span>
      </div>

      {/* Badge Grid */}
      <div className="badge-grid gap-2">
        {ACHIEVEMENTS.map((ach) => {
          const unlocked = achievementProgress.unlockedIds.includes(ach.id);
          const isSelected = selectedId === ach.id;
          return (
            <button
              key={ach.id}
              onClick={() => setSelectedId(isSelected ? null : ach.id)}
              className={`flex flex-col items-center gap-0.5 p-1.5 rounded-lg transition-all ${
                isSelected
                  ? "bg-goshiwon-yellow/20 border border-goshiwon-yellow/50 ring-1 ring-goshiwon-yellow/30"
                  : unlocked
                  ? "bg-goshiwon-yellow/10 border border-goshiwon-yellow/30"
                  : "opacity-40 grayscale border border-transparent"
              }`}
              aria-label={unlocked ? ach.title : "Locked achievement"}
              aria-pressed={isSelected}
            >
              <span className="text-lg" role="img" aria-hidden="true">
                {unlocked ? ach.icon : "🔒"}
              </span>
              <span className="text-[9px] text-goshiwon-text-muted text-center leading-tight truncate w-full">
                {unlocked ? ach.title : "???"}
              </span>
            </button>
          );
        })}
      </div>

      {/* Detail Card — shown when a badge is tapped */}
      {selectedAch && (
        <div className={`mt-3 p-3 rounded-lg border transition-all ${
          selectedUnlocked
            ? "bg-goshiwon-yellow/5 border-goshiwon-yellow/20"
            : "bg-goshiwon-bg/50 border-goshiwon-border"
        }`}>
          <div className="flex items-start gap-3">
            <span className="text-2xl shrink-0" role="img" aria-hidden="true">
              {selectedUnlocked ? selectedAch.icon : "🔒"}
            </span>
            <div className="min-w-0 flex-1">
              {selectedUnlocked ? (
                <>
                  <p className="text-sm font-medium text-goshiwon-yellow">
                    {selectedAch.title}
                  </p>
                  <p className="text-xs text-goshiwon-text-muted font-korean">
                    {selectedAch.titleKr}
                  </p>
                  <p className="text-xs text-goshiwon-text mt-1.5">
                    {selectedAch.description}
                  </p>
                </>
              ) : (
                <>
                  <p className="text-sm font-medium text-goshiwon-text-muted">
                    Locked
                  </p>
                  <p className="text-xs text-goshiwon-text-muted mt-1 italic">
                    {selectedAch.hint}
                  </p>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tap hint — only show when no badge is selected */}
      {!selectedId && (
        <p className="text-center text-[10px] text-goshiwon-text-muted/50 mt-2">
          Tap a badge to see details
        </p>
      )}
    </div>
  );
}
