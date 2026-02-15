"use client";

import { useCallback, useState, useEffect, useRef } from "react";
import type { VocabularyItem } from "@/types";

const STORAGE_KEY = "nunchi-vocabulary";
const MAX_WORDS = 5000;
const MAX_STORAGE_BYTES = 1_000_000; // 1 MB

/** Strip HTML tags for defense-in-depth XSS prevention. */
function stripHtml(text: string): string {
  return text.replace(/<[^>]*>/g, "");
}

/** Validate that an item has the correct VocabularyItem shape. */
function isValidVocabularyItem(item: unknown): item is VocabularyItem {
  if (typeof item !== "object" || item === null || Array.isArray(item)) {
    return false;
  }

  // Prototype pollution prevention
  const obj = item as Record<string, unknown>;
  const requiredFields = ["id", "korean", "romanization", "english", "savedAt"];

  for (const field of requiredFields) {
    if (!Object.hasOwn(obj, field) || typeof obj[field] !== "string") {
      return false;
    }
  }

  return true;
}

function loadFromStorage(): VocabularyItem[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed)) return [];
    // Validate each item and discard malformed entries
    return parsed.filter(isValidVocabularyItem);
  } catch {
    return [];
  }
}

function saveToStorage(items: VocabularyItem[]): void {
  try {
    const serialized = JSON.stringify(items);
    // Security: reject if data exceeds storage size limit
    if (serialized.length > MAX_STORAGE_BYTES) return;
    localStorage.setItem(STORAGE_KEY, serialized);
  } catch {
    // localStorage full or unavailable — silently fail
  }
}

export function useVocabulary() {
  const [words, setWords] = useState<VocabularyItem[]>([]);
  const [panelOpen, setPanelOpen] = useState(false);
  const [unseenCount, setUnseenCount] = useState(0);
  const initialized = useRef(false);

  // Load from localStorage on mount
  useEffect(() => {
    setWords(loadFromStorage());
  }, []);

  // Persist whenever words change (skip initial mount to avoid overwriting)
  useEffect(() => {
    if (!initialized.current) {
      initialized.current = true;
      return;
    }
    saveToStorage(words);
  }, [words]);

  const addWords = useCallback(
    (newWords: Omit<VocabularyItem, "id" | "savedAt">[]) => {
      setWords((prev) => {
        // Security: enforce max words cap
        if (prev.length >= MAX_WORDS) return prev;

        const existingKorean = new Set(prev.map((w) => w.korean));
        const toAdd = newWords
          .filter((w) => !existingKorean.has(w.korean))
          .slice(0, MAX_WORDS - prev.length) // respect cap
          .map((w) => ({
            id: crypto.randomUUID?.() ?? `${Date.now()}-${Math.random()}`,
            korean: stripHtml(w.korean),
            romanization: stripHtml(w.romanization),
            english: stripHtml(w.english),
            savedAt: new Date().toISOString(),
          }));

        if (toAdd.length === 0) return prev;

        // Track unseen new words for badge
        setUnseenCount((c) => c + toAdd.length);

        return [...prev, ...toAdd];
      });
    },
    []
  );

  const removeWord = useCallback((id: string) => {
    setWords((prev) => prev.filter((w) => w.id !== id));
  }, []);

  const isWordSaved = useCallback(
    (korean: string) => words.some((w) => w.korean === korean),
    [words]
  );

  // Clear unseen count when opening the panel
  const togglePanel = useCallback(() => {
    setPanelOpen((o) => {
      if (!o) setUnseenCount(0); // opening → clear badge
      return !o;
    });
  }, []);

  const closePanel = useCallback(() => setPanelOpen(false), []);

  const wordCount = words.length;

  return {
    words,
    wordCount,
    unseenCount,
    panelOpen,
    addWords,
    removeWord,
    isWordSaved,
    togglePanel,
    closePanel,
  };
}
