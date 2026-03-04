"use client";

import { useCallback, useState, useEffect, useRef } from "react";

export interface AppSettings {
  theme: "dark" | "light";
  fontScale: number;
  reduceAnimations: boolean;
  showRomanization: boolean;
}

const STORAGE_KEY = "nunchi-settings";

const VALID_THEMES = new Set(["dark", "light"]);
const VALID_SCALES = new Set([1, 1.15, 1.3]);

function getDefaults(): AppSettings {
  const prefersReduced =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  return {
    theme: "dark",
    fontScale: 1,
    reduceAnimations: prefersReduced,
    showRomanization: true,
  };
}

function isValidSettings(val: unknown): val is AppSettings {
  if (typeof val !== "object" || val === null || Array.isArray(val)) return false;
  const obj = val as Record<string, unknown>;
  return (
    VALID_THEMES.has(obj.theme as string) &&
    VALID_SCALES.has(obj.fontScale as number) &&
    typeof obj.reduceAnimations === "boolean" &&
    typeof obj.showRomanization === "boolean"
  );
}

function loadFromStorage(): AppSettings {
  if (typeof window === "undefined") return getDefaults();
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return getDefaults();
    const parsed = JSON.parse(stored);
    if (isValidSettings(parsed)) return parsed;
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

export function useSettings() {
  const [settings, setSettings] = useState<AppSettings>(getDefaults);
  const initialized = useRef(false);

  // Load from storage on mount
  useEffect(() => {
    setSettings(loadFromStorage());
  }, []);

  // Persist on change (skip initial mount)
  useEffect(() => {
    if (!initialized.current) {
      initialized.current = true;
      return;
    }
    saveToStorage(settings);
  }, [settings]);

  const setTheme = useCallback((theme: "dark" | "light") => {
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

  return {
    settings,
    setTheme,
    setFontScale,
    setReduceAnimations,
    setShowRomanization,
  };
}
