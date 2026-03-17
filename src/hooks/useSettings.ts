"use client";

import { useCallback, useState, useEffect, useRef } from "react";

export type ThemeSetting = "dark" | "light" | "system";
/** The resolved (actual) theme applied to the UI */
export type ResolvedTheme = "dark" | "light";

export interface AppSettings {
  theme: ThemeSetting;
  fontScale: number;
  reduceAnimations: boolean;
  showRomanization: boolean;
  ttsRate: number; // Speech speed: 0.5 to 1.5, default 0.85
}

const STORAGE_KEY = "nunchi-settings";

const VALID_THEMES = new Set(["dark", "light", "system"]);
const VALID_SCALES = new Set([1, 1.15, 1.3]);

function getDefaults(): AppSettings {
  const prefersReduced =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  return {
    theme: "system" as ThemeSetting,
    fontScale: 1,
    reduceAnimations: prefersReduced,
    showRomanization: true,
    ttsRate: 0.85,
  };
}

function isValidSettings(val: unknown): val is AppSettings {
  if (typeof val !== "object" || val === null || Array.isArray(val)) return false;
  const obj = val as Record<string, unknown>;
  const baseValid =
    VALID_THEMES.has(obj.theme as string) &&
    VALID_SCALES.has(obj.fontScale as number) &&
    typeof obj.reduceAnimations === "boolean" &&
    typeof obj.showRomanization === "boolean";
  if (!baseValid) return false;
  // ttsRate is optional for backward compat — validate if present
  if ("ttsRate" in obj && obj.ttsRate !== undefined) {
    if (typeof obj.ttsRate !== "number" || obj.ttsRate < 0.5 || obj.ttsRate > 1.5) return false;
  }
  return true;
}

function loadFromStorage(): AppSettings {
  if (typeof window === "undefined") return getDefaults();
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return getDefaults();
    const parsed = JSON.parse(stored);
    if (isValidSettings(parsed)) return { ...getDefaults(), ...parsed };
    return getDefaults();
  } catch {
    return getDefaults();
  }
}

function saveToStorage(settings: AppSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // localStorage full or unavailable
  }
}

/** Resolve "system" to the actual OS preference */
function getSystemTheme(): ResolvedTheme {
  if (typeof window === "undefined") return "dark";
  return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

export function useSettings() {
  const [settings, setSettings] = useState<AppSettings>(getDefaults);
  const [systemPreference, setSystemPreference] = useState<ResolvedTheme>(() => getSystemTheme());
  const initialized = useRef(false);

  // Load from storage on mount
  useEffect(() => {
    setSettings(loadFromStorage());
    // Mark initialized after load so the persist effect doesn't fire on hydration
    initialized.current = true;
  }, []);

  // Listen for OS theme changes
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: light)");
    const handler = (e: MediaQueryListEvent) => {
      setSystemPreference(e.matches ? "light" : "dark");
    };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  // Persist on change (skip initial hydration)
  useEffect(() => {
    if (!initialized.current) return;
    saveToStorage(settings);
  }, [settings]);

  /** The actual theme applied to the UI (resolves "system") */
  const resolvedTheme: ResolvedTheme =
    settings.theme === "system" ? systemPreference : settings.theme;

  const setTheme = useCallback((theme: ThemeSetting) => {
    setSettings((prev) => ({ ...prev, theme }));
  }, []);

  const setFontScale = useCallback((fontScale: number) => {
    if (!VALID_SCALES.has(fontScale)) return;
    setSettings((prev) => ({ ...prev, fontScale }));
  }, []);

  const setReduceAnimations = useCallback((reduceAnimations: boolean) => {
    setSettings((prev) => ({ ...prev, reduceAnimations }));
  }, []);

  const setShowRomanization = useCallback((showRomanization: boolean) => {
    setSettings((prev) => ({ ...prev, showRomanization }));
  }, []);

  const setTTSRate = useCallback((ttsRate: number) => {
    if (ttsRate < 0.5 || ttsRate > 1.5) return;
    setSettings((prev) => ({ ...prev, ttsRate: Math.round(ttsRate * 100) / 100 }));
  }, []);

  return {
    settings,
    resolvedTheme,
    setTheme,
    setFontScale,
    setReduceAnimations,
    setShowRomanization,
    setTTSRate,
  };
}
