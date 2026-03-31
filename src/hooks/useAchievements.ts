"use client";

import { useCallback, useState, useEffect, useRef } from "react";
import type { AchievementProgress, AchievementCheckContext } from "@/lib/achievements";
import { useDbSync } from "@/hooks/useDbSync";
import {
  createDefaultAchievementProgress,
  checkAchievements,
  unlockAchievements,
  isValidAchievementProgress,
  getAchievement,
} from "@/lib/achievements";

const STORAGE_KEY = "nunchi-achievements";

function loadFromStorage(): AchievementProgress {
  if (typeof window === "undefined") return createDefaultAchievementProgress();
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return createDefaultAchievementProgress();
    const parsed = JSON.parse(stored);
    if (!isValidAchievementProgress(parsed)) return createDefaultAchievementProgress();
    return parsed;
  } catch {
    return createDefaultAchievementProgress();
  }
}

function saveToStorage(data: AchievementProgress): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // localStorage full or unavailable
  }
}

export interface NewAchievement {
  id: string;
  title: string;
  titleKr: string;
  icon: string;
}

export function useAchievements() {
  const [progress, setProgress] = useState<AchievementProgress>(createDefaultAchievementProgress);
  const [recentAchievement, setRecentAchievement] = useState<NewAchievement | null>(null);
  const initialized = useRef(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toastQueue = useRef<NewAchievement[]>([]);

  // Load from localStorage on mount
  useEffect(() => {
    setProgress(loadFromStorage());
  }, []);

  // Persist whenever progress changes (skip initial mount)
  useEffect(() => {
    if (!initialized.current) {
      initialized.current = true;
      return;
    }
    saveToStorage(progress);
  }, [progress]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, []);

  const showNextToast = useCallback(() => {
    const next = toastQueue.current.shift();
    if (next) {
      setRecentAchievement(next);
      toastTimer.current = setTimeout(() => {
        setRecentAchievement(null);
        // Show next in queue after a short gap
        setTimeout(showNextToast, 300);
      }, 3000);
    }
  }, []);

  /**
   * Check achievements and unlock any newly earned ones.
   * Call this whenever relevant state changes (XP, vocab, streak, etc.)
   */
  const checkAndUnlock = useCallback(
    (ctx: AchievementCheckContext) => {
      setProgress((prev) => {
        const newIds = checkAchievements(ctx, prev);
        if (newIds.length === 0) return prev;

        // Queue toast notifications
        for (const id of newIds) {
          const ach = getAchievement(id);
          if (ach) {
            toastQueue.current.push({
              id: ach.id,
              title: ach.title,
              titleKr: ach.titleKr,
              icon: ach.icon,
            });
          }
        }

        // Start showing toasts if not already showing
        if (!toastTimer.current) {
          setTimeout(showNextToast, 100);
        }

        return unlockAchievements(prev, newIds);
      });
    },
    [showNextToast],
  );

  useDbSync<AchievementProgress>({
    endpoint: "/api/achievements",
    localData: progress,
    fromDb: (data: unknown) => {
      const d = data as { unlockedIds?: string[]; unlockTimestamps?: Record<string, string> };
      return {
        unlockedIds: d.unlockedIds ?? [],
        unlockTimestamps: d.unlockTimestamps ?? {},
      };
    },
    toDb: (localData) => ({
      unlockedIds: localData.unlockedIds,
      unlockTimestamps: localData.unlockTimestamps,
    }),
    onPull: (data) => {
      setProgress(data);
      saveToStorage(data);
    },
    initialized: initialized.current,
  });

  return {
    progress,
    recentAchievement,
    checkAndUnlock,
  };
}
