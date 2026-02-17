"use client";

import { useCallback, useState, useEffect, useRef, useMemo } from "react";
import type { GamificationData, XPAction, XPEvent, RankInfo } from "@/types";
import {
  computeMessageXP,
  updateStreak,
  computeRank,
  computeRankProgress,
  getNextRank,
  createDefaultGamificationData,
  getLocalDateString,
  XP_VALUES,
} from "@/lib/gamification";
import {
  validateGamificationData,
  isReasonableXPRate,
  LIMITS,
} from "@/lib/security";
import { computeKoreanRatio } from "@/lib/mood-engine";
import type { FlashcardSummary } from "@/hooks/useFlashcards";

const STORAGE_KEY = "nunchi-gamification";
const MAX_STORAGE_BYTES = 500_000; // 500 KB

function loadFromStorage(): GamificationData {
  if (typeof window === "undefined") return createDefaultGamificationData();
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return createDefaultGamificationData();
    const parsed = JSON.parse(stored);
    // Use security.ts validator for thorough validation + sanitization
    const validated = validateGamificationData(parsed);
    return validated ?? createDefaultGamificationData();
  } catch {
    return createDefaultGamificationData();
  }
}

function saveToStorage(data: GamificationData): void {
  try {
    const serialized = JSON.stringify(data);
    if (serialized.length > MAX_STORAGE_BYTES) return;
    localStorage.setItem(STORAGE_KEY, serialized);
  } catch {
    // localStorage full or unavailable
  }
}

export interface RecentXPGain {
  amount: number;
  action: XPAction;
}

export function useGamification(vocabCount: number) {
  const [data, setData] = useState<GamificationData>(createDefaultGamificationData);
  const [recentXPGain, setRecentXPGain] = useState<RecentXPGain | null>(null);
  const [koreanHint, setKoreanHint] = useState(false);
  const initialized = useRef(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hintTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load from localStorage on mount
  useEffect(() => {
    setData(loadFromStorage());
  }, []);

  // Persist whenever data changes (skip initial mount)
  useEffect(() => {
    if (!initialized.current) {
      initialized.current = true;
      return;
    }
    saveToStorage(data);
  }, [data]);

  // Cleanup timers
  useEffect(() => {
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
      if (hintTimer.current) clearTimeout(hintTimer.current);
    };
  }, []);

  // ─── Helpers ─────────────────────────────────────────────────────

  const showXPToast = useCallback((amount: number, action: XPAction) => {
    setRecentXPGain({ amount, action });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setRecentXPGain(null), 2000);
  }, []);

  const addXPEvent = useCallback(
    (action: XPAction, amount: number, currentData: GamificationData): GamificationData => {
      const event: XPEvent = {
        action,
        amount,
        timestamp: new Date().toISOString(),
      };

      const newHistory = [...currentData.xp.history, event].slice(-LIMITS.MAX_XP_HISTORY);

      // Anti-abuse: check XP rate
      if (!isReasonableXPRate(newHistory)) {
        return currentData; // freeze XP gain
      }

      const newTotalXP = Math.min(currentData.xp.totalXP + amount, LIMITS.MAX_XP);
      const today = getLocalDateString();
      const newStreak = updateStreak(currentData.streak, today);

      return {
        ...currentData,
        xp: { totalXP: newTotalXP, history: newHistory },
        streak: newStreak,
      };
    },
    []
  );

  // ─── Action callbacks ───────────────────────────────────────────

  const recordMessage = useCallback(
    (content: string) => {
      setData((prev) => {
        const newStats = {
          ...prev.stats,
          totalMessages: prev.stats.totalMessages + 1,
          messagesWithoutTranslate: prev.stats.messagesWithoutTranslate + 1,
        };
        let updated = { ...prev, stats: newStats };

        // XP for Korean usage
        const ratio = computeKoreanRatio([{ role: "user", content }]);
        const messageXP = computeMessageXP(ratio);
        if (messageXP) {
          updated = addXPEvent(messageXP.action, messageXP.amount, updated);
          showXPToast(messageXP.amount, messageXP.action);
          setKoreanHint(false);
        } else {
          // Show hint that Korean earns XP (only for non-empty messages)
          if (content.trim().length > 0) {
            setKoreanHint(true);
            if (hintTimer.current) clearTimeout(hintTimer.current);
            hintTimer.current = setTimeout(() => setKoreanHint(false), 3000);
          }
        }

        // XP for no-translate milestone (every 5 messages without translating)
        if (updated.stats.messagesWithoutTranslate > 0 && updated.stats.messagesWithoutTranslate % 5 === 0) {
          const noTranslateAmount = XP_VALUES.no_translate;
          updated = addXPEvent("no_translate", noTranslateAmount, updated);
          // If we already showed a message XP toast, replace with no_translate
          // (latest one wins)
          showXPToast(noTranslateAmount, "no_translate");
        }

        return updated;
      });
    },
    [addXPEvent, showXPToast]
  );

  const recordTranslation = useCallback(() => {
    setData((prev) => ({
      ...prev,
      stats: {
        ...prev.stats,
        totalTranslations: prev.stats.totalTranslations + 1,
        messagesWithoutTranslate: 0, // reset counter
      },
    }));
  }, []);

  const recordFlashcardComplete = useCallback(
    (summary: FlashcardSummary) => {
      setData((prev) => {
        const newStats = {
          ...prev.stats,
          totalFlashcardSessions: prev.stats.totalFlashcardSessions + 1,
        };
        let updated = { ...prev, stats: newStats };

        // Base XP for completing a session
        updated = addXPEvent("flashcard_session", XP_VALUES.flashcard_session, updated);
        let toastAmount = XP_VALUES.flashcard_session;
        let toastAction: XPAction = "flashcard_session";

        // Bonus for perfect session (0 "again" grades)
        if (summary.again === 0 && summary.total > 0) {
          updated = addXPEvent("flashcard_perfect", XP_VALUES.flashcard_perfect, updated);
          toastAmount += XP_VALUES.flashcard_perfect;
        }

        showXPToast(toastAmount, toastAction);
        return updated;
      });
    },
    [addXPEvent, showXPToast]
  );

  const recordWordSaved = useCallback(
    (count: number) => {
      if (count <= 0) return;
      setData((prev) => {
        const amount = XP_VALUES.word_saved * count;
        const updated = addXPEvent("word_saved", amount, prev);
        showXPToast(amount, "word_saved");
        return updated;
      });
    },
    [addXPEvent, showXPToast]
  );

  // ─── Derived values ─────────────────────────────────────────────

  const rank: RankInfo = useMemo(
    () => computeRank(data.xp.totalXP, vocabCount),
    [data.xp.totalXP, vocabCount]
  );

  const rankProgress: number = useMemo(
    () => computeRankProgress(data.xp.totalXP, vocabCount),
    [data.xp.totalXP, vocabCount]
  );

  const nextRank: RankInfo | null = useMemo(
    () => getNextRank(data.xp.totalXP, vocabCount),
    [data.xp.totalXP, vocabCount]
  );

  return {
    // XP
    totalXP: data.xp.totalXP,
    recentXPGain,
    koreanHint,

    // Streak
    currentStreak: data.streak.currentStreak,
    longestStreak: data.streak.longestStreak,

    // Rank
    rank,
    rankProgress,
    nextRank,

    // Stats
    stats: data.stats,

    // Actions
    recordMessage,
    recordTranslation,
    recordFlashcardComplete,
    recordWordSaved,
  };
}
