"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { RankInfo, SessionStats, VocabularyItem } from "@/types";
import type { useGamification } from "@/hooks/useGamification";
import type { AchievementProgress } from "@/lib/achievements";

export type GamificationValues = ReturnType<typeof useGamification>;

export interface GamificationContextValue extends GamificationValues {
  vocabCount: number;
  words: VocabularyItem[];
  achievementProgress: AchievementProgress;
}

const GamificationContext = createContext<GamificationContextValue | null>(
  null,
);

export function GamificationProvider({
  value,
  children,
}: {
  value: GamificationContextValue;
  children: ReactNode;
}) {
  return (
    <GamificationContext.Provider value={value}>
      {children}
    </GamificationContext.Provider>
  );
}

export function useGamificationContext(): GamificationContextValue {
  const ctx = useContext(GamificationContext);
  if (!ctx)
    throw new Error(
      "useGamificationContext must be used within GamificationProvider",
    );
  return ctx;
}
