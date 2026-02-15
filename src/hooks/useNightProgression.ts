"use client";

import { useMemo } from "react";

/**
 * Night Mode Progression
 *
 * The UI progressively darkens as the conversation grows,
 * simulating the passage of deeper nighttime in the goshiwon.
 *
 * Stages based on total message count:
 *   0 (0–4 messages):   default theme — no overrides
 *   1 (5–14 messages):  subtle darkening
 *   2 (15–29 messages): noticeable darkening + slight red shift
 *   3 (30+ messages):   deep night — very dark, stronger red accent
 */

export interface NightStage {
  stage: number;
  styleOverrides: React.CSSProperties;
}

const STAGE_OVERRIDES: Record<number, Record<string, string>> = {
  0: {},
  1: {
    "--color-goshiwon-bg": "#0a0809",
    "--color-goshiwon-surface": "#161320",
    "--color-goshiwon-border": "#241f2d",
  },
  2: {
    "--color-goshiwon-bg": "#080607",
    "--color-goshiwon-surface": "#12101a",
    "--color-goshiwon-border": "#1f1a28",
    "--color-goshiwon-text": "#d8d4dc",
  },
  3: {
    "--color-goshiwon-bg": "#060405",
    "--color-goshiwon-surface": "#0e0c15",
    "--color-goshiwon-border": "#1a1522",
    "--color-goshiwon-text": "#c8c4cc",
    "--color-goshiwon-accent": "#a01e1e",
  },
};

/**
 * Compute the night stage from message count.
 */
export function getNightStage(messageCount: number): number {
  if (messageCount >= 30) return 3;
  if (messageCount >= 15) return 2;
  if (messageCount >= 5) return 1;
  return 0;
}

/**
 * Hook that computes the current night stage and CSS variable overrides.
 */
export function useNightProgression(messageCount: number): NightStage {
  return useMemo(() => {
    const stage = getNightStage(messageCount);
    const overrides = STAGE_OVERRIDES[stage];
    return {
      stage,
      styleOverrides: overrides as React.CSSProperties,
    };
  }, [messageCount]);
}
