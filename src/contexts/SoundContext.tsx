"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { useSoundEngine } from "@/hooks/useSoundEngine";

export type SoundEngine = ReturnType<typeof useSoundEngine>;

const SoundContext = createContext<SoundEngine | null>(null);

export function SoundProvider({
  value,
  children,
}: {
  value: SoundEngine;
  children: ReactNode;
}) {
  return (
    <SoundContext.Provider value={value}>{children}</SoundContext.Provider>
  );
}

export function useSound(): SoundEngine {
  const ctx = useContext(SoundContext);
  if (!ctx) throw new Error("useSound must be used within SoundProvider");
  return ctx;
}
