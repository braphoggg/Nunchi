"use client";

import { useCallback, useState, useEffect, useRef } from "react";
import type { SavedConversation, SavedMessage } from "@/types";
import { validateLessonHistory } from "@/lib/security";

const STORAGE_KEY = "nunchi-lesson-history";
const MAX_CONVERSATIONS = 20;
const MAX_STORAGE_BYTES = 2_000_000; // 2 MB
const PREVIEW_LENGTH = 60;

function stripHtml(text: string): string {
  return text.replace(/<[^>]*>/g, "");
}

/** Remove markdown formatting (bold, italic, etc.) for plain-text previews */
function stripMarkdown(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, "$1")  // **bold**
    .replace(/__(.+?)__/g, "$1")       // __bold__
    .replace(/\*(.+?)\*/g, "$1")       // *italic*
    .replace(/_(.+?)_/g, "$1");        // _italic_
}

function loadFromStorage(): SavedConversation[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    const parsed = JSON.parse(stored);
    return validateLessonHistory(parsed) ?? [];
  } catch {
    return [];
  }
}

function saveToStorage(items: SavedConversation[]): void {
  try {
    const serialized = JSON.stringify(items);
    if (serialized.length > MAX_STORAGE_BYTES) return;
    localStorage.setItem(STORAGE_KEY, serialized);
  } catch {
    // localStorage full or unavailable — silently fail
  }
}

export function useLessonHistory() {
  const [conversations, setConversations] = useState<SavedConversation[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const initialized = useRef(false);

  // Load from localStorage on mount
  useEffect(() => {
    setConversations(loadFromStorage());
  }, []);

  // Persist whenever conversations change (skip initial mount)
  useEffect(() => {
    if (!initialized.current) {
      initialized.current = true;
      return;
    }
    saveToStorage(conversations);
  }, [conversations]);

  const saveConversation = useCallback(
    (messages: Array<{ role: string; text: string }>) => {
      // Filter to user/assistant only, skip empty conversations
      const filtered: SavedMessage[] = messages
        .filter((m) => m.role === "user" || m.role === "assistant")
        .map((m) => ({
          role: m.role as "user" | "assistant",
          text: stripHtml(m.text),
        }));

      if (filtered.length === 0) return;

      // Generate preview from first assistant message
      const firstAssistant = filtered.find((m) => m.role === "assistant");
      const rawPreview = firstAssistant
        ? firstAssistant.text.slice(0, PREVIEW_LENGTH + 20).replace(/\n/g, " ")
        : filtered[0].text.slice(0, PREVIEW_LENGTH + 20).replace(/\n/g, " ");
      const preview = stripMarkdown(rawPreview).slice(0, PREVIEW_LENGTH);

      const conversation: SavedConversation = {
        id: crypto.randomUUID?.() ?? `${Date.now()}-${Math.random()}`,
        savedAt: new Date().toISOString(),
        preview,
        messageCount: filtered.length,
        messages: filtered,
      };

      setConversations((prev) => [conversation, ...prev].slice(0, MAX_CONVERSATIONS));
    },
    []
  );

  const deleteConversation = useCallback((id: string) => {
    setConversations((prev) => prev.filter((c) => c.id !== id));
  }, []);

  const toggleHistory = useCallback(() => {
    setHistoryOpen((o) => !o);
    setReviewingId(null);
  }, []);

  const closeHistory = useCallback(() => {
    setHistoryOpen(false);
    setReviewingId(null);
  }, []);

  const reviewConversation = useCallback((id: string) => {
    setReviewingId(id);
  }, []);

  const closeReview = useCallback(() => {
    setReviewingId(null);
  }, []);

  const reviewingConversation =
    conversations.find((c) => c.id === reviewingId) ?? null;

  return {
    conversations,
    historyOpen,
    reviewingConversation,
    saveConversation,
    deleteConversation,
    toggleHistory,
    closeHistory,
    reviewConversation,
    closeReview,
  };
}
