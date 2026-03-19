"use client";

import { useCallback, useState, useEffect, useRef } from "react";

const STORAGE_KEY = "nunchi-api-key";

function loadKey(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function saveKey(key: string | null): void {
  try {
    if (key) {
      localStorage.setItem(STORAGE_KEY, key);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    // localStorage full or unavailable
  }
}

/** Check if a string looks like a valid Gemini API key (starts with AIza) */
export function isValidGeminiKey(key: string): boolean {
  return /^AIza[A-Za-z0-9_-]{20,}$/.test(key.trim());
}

export function useApiKey() {
  const [apiKey, setApiKeyState] = useState<string | null>(null);
  const initialized = useRef(false);

  // Load on mount
  useEffect(() => {
    setApiKeyState(loadKey());
  }, []);

  // Persist on change (skip initial mount)
  useEffect(() => {
    if (!initialized.current) {
      initialized.current = true;
      return;
    }
    saveKey(apiKey);
  }, [apiKey]);

  const setApiKey = useCallback((key: string) => {
    const trimmed = key.trim();
    if (trimmed) setApiKeyState(trimmed);
  }, []);

  const clearApiKey = useCallback(() => {
    setApiKeyState(null);
  }, []);

  return { apiKey, setApiKey, clearApiKey };
}
