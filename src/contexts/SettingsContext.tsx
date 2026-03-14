"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { AppSettings } from "@/hooks/useSettings";

export interface SettingsContextValue {
  settings: AppSettings;
  setTheme: (theme: "dark" | "light") => void;
  setFontScale: (scale: number) => void;
  setReduceAnimations: (reduce: boolean) => void;
  setShowRomanization: (show: boolean) => void;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({
  value,
  children,
}: {
  value: SettingsContextValue;
  children: ReactNode;
}) {
  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettingsContext(): SettingsContextValue {
  const ctx = useContext(SettingsContext);
  if (!ctx)
    throw new Error("useSettingsContext must be used within SettingsProvider");
  return ctx;
}
