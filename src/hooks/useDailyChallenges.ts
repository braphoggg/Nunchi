"use client";

import { useCallback, useState, useEffect, useRef } from "react";
import type { DailyChallengeState, ChallengeTrackingKey } from "@/lib/daily-challenges";
import { useDbSync } from "@/hooks/useDbSync";
import {
  createDailyChallengeState,
  getTodayString,
  updateChallengeProgress,
  isValidChallengeState,
} from "@/lib/daily-challenges";

const STORAGE_KEY = "nunchi-daily-challenges";

function loadFromStorage(): DailyChallengeState {
  if (typeof window === "undefined") return createDailyChallengeState();
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return createDailyChallengeState();
    const parsed = JSON.parse(stored);
    if (!isValidChallengeState(parsed)) return createDailyChallengeState();
    // Check if it's a new day — reset challenges
    if (parsed.date !== getTodayString()) return createDailyChallengeState();
    return parsed;
  } catch {
    return createDailyChallengeState();
  }
}

function saveToStorage(data: DailyChallengeState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // localStorage full or unavailable
  }
}

export function useDailyChallenges() {
  const [state, setState] = useState<DailyChallengeState>(createDailyChallengeState);
  const initialized = useRef(false);

  // Load from localStorage on mount
  useEffect(() => {
    setState(loadFromStorage());
  }, []);

  // Persist whenever state changes (skip initial mount)
  useEffect(() => {
    if (!initialized.current) {
      initialized.current = true;
      return;
    }
    saveToStorage(state);
  }, [state]);

  /**
   * Record progress on a tracking key. Returns IDs of newly completed challenges.
   */
  const recordProgress = useCallback(
    (trackingKey: ChallengeTrackingKey, increment: number = 1): string[] => {
      let newlyCompleted: string[] = [];
      setState((prev) => {
        // Reset if day changed
        const today = getTodayString();
        const current = prev.date !== today ? createDailyChallengeState(today) : prev;
        const result = updateChallengeProgress(current, trackingKey, increment);
        newlyCompleted = result.newlyCompleted;
        return result.state;
      });
      return newlyCompleted;
    },
    [],
  );

  useDbSync<DailyChallengeState>({
    endpoint: "/api/daily-challenges",
    localData: state,
    fromDb: (data: unknown) => data as DailyChallengeState,
    toDb: (localData) => localData,
    onPull: (data) => {
      setState(data);
      saveToStorage(data);
    },
    initialized: initialized.current,
  });

  return {
    challengeState: state,
    recordProgress,
  };
}
