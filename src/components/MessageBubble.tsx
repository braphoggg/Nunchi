"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import type { UIMessage } from "ai";
import { formatMessage } from "@/lib/format-message";
import { getAtmosphericTimestamp } from "@/lib/timestamps";
import { parseVocabulary, hasVocabulary } from "@/lib/parse-vocabulary";
import type { VocabularyItem } from "@/types";

interface MessageBubbleProps {
  message: UIMessage;
  onSaveWords?: (words: Omit<VocabularyItem, "id" | "savedAt">[]) => void;
  isWordSaved?: (korean: string) => boolean;
  onTranslateUsed?: () => void;
}

function getTextContent(message: UIMessage): string {
  return message.parts
    .filter((p) => p.type === "text")
    .map((p) => p.text)
    .join("");
}

export default function MessageBubble({ message, onSaveWords, isWordSaved, onTranslateUsed }: MessageBubbleProps) {
  const isAssistant = message.role === "assistant";
  const content = getTextContent(message);

  const [showTranslation, setShowTranslation] = useState(false);
  const [translation, setTranslation] = useState<string | null>(null);
  const [translating, setTranslating] = useState(false);
  const [translateError, setTranslateError] = useState(false);
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  // Check if all vocabulary in this message is already saved
  const allWordsSaved = useMemo(() => {
    if (!isWordSaved || !isAssistant || !hasVocabulary(content)) return false;
    const vocabItems = parseVocabulary(content);
    if (vocabItems.length === 0) return false;
    return vocabItems.every((w) => isWordSaved(w.korean));
  }, [isWordSaved, isAssistant, content]);

  const handleSaveWords = useCallback(async () => {
    if (!onSaveWords || saved || saving || allWordsSaved) return;
    const vocabItems = parseVocabulary(content);
    if (vocabItems.length === 0) return;

    // Find words that need English translation
    const needsTranslation = vocabItems.filter((w) => !w.english);

    if (needsTranslation.length > 0) {
      setSaving(true);
      try {
        const res = await fetch("/api/vocabulary-translate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            words: needsTranslation.map((w) => w.korean),
          }),
        });
        if (res.ok) {
          const data = await res.json();
          const translations: Record<string, string> = data.translations ?? {};
          // Merge translations into vocab items
          for (const item of vocabItems) {
            if (!item.english && translations[item.korean]) {
              item.english = translations[item.korean];
            }
          }
        }
      } catch {
        // Translation failed — save with empty English (better than not saving)
      } finally {
        setSaving(false);
      }
    }

    onSaveWords(vocabItems);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }, [content, onSaveWords, saved, saving, allWordsSaved]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const timestamp = useMemo(() => getAtmosphericTimestamp(), []);

  async function handleTranslate() {
    if (!isAssistant || translating) return;

    // Toggle back to original
    if (showTranslation) {
      setShowTranslation(false);
      return;
    }

    // Already cached — show it
    if (translation) {
      setShowTranslation(true);
      return;
    }

    // Fetch translation
    setTranslating(true);
    setTranslateError(false);
    onTranslateUsed?.();
    try {
      const res = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: content }),
      });
      if (!res.ok) throw new Error("Translation failed");
      const data = await res.json();
      setTranslation(data.translation);
      setShowTranslation(true);
    } catch {
      setTranslateError(true);
    } finally {
      setTranslating(false);
    }
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Silently fail
    }
  }

  const displayContent =
    showTranslation && translation ? translation : content;

  return (
    <div
      className={`flex animate-message-in ${
        isAssistant ? "justify-start" : "justify-end"
      }`}
    >
      <div
        className={`max-w-[85%] flex flex-col ${
          isAssistant ? "items-start" : "items-end"
        }`}
      >
        {/* Message bubble */}
        <div
          className={`relative w-full ${
            isAssistant
              ? "bg-goshiwon-surface border-l-2 border-goshiwon-accent rounded-tr-lg rounded-br-lg rounded-bl-lg rounded-tl-sm"
              : "bg-goshiwon-user-bubble rounded-tl-lg rounded-bl-lg rounded-br-lg rounded-tr-sm"
          }`}
        >
          {isAssistant && (
            <div className="px-4 pt-3 pb-0">
              <span className="text-[10px] text-goshiwon-text-muted uppercase tracking-wider">
                서문조
              </span>
            </div>
          )}
          <div
            className={`px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
              isAssistant ? "pt-1.5" : ""
            }`}
          >
            {showTranslation && translation && (
              <p className="text-[10px] text-goshiwon-text-muted italic mb-1">
                Translated — tap the globe to see original
              </p>
            )}
            {translating ? (
              <span className="text-goshiwon-text-secondary italic">
                Translating...
              </span>
            ) : translateError ? (
              <>
                {formatMessage(content)}
                <span className="block mt-1 text-xs text-goshiwon-accent-light">
                  Translation failed — try again
                </span>
              </>
            ) : isAssistant ? (
              formatMessage(displayContent)
            ) : (
              content
            )}
          </div>

          {/* Timestamp */}
          <div
            className={`px-4 pb-2 ${
              isAssistant ? "text-left" : "text-right"
            }`}
          >
            <span className="text-[10px] text-goshiwon-text-muted">
              {timestamp}
            </span>
          </div>
        </div>

        {/* Action buttons — below the bubble */}
        {isAssistant ? (
          <div className="flex items-center gap-1 mt-1 ml-1">
            {/* Translate */}
            <button
              onClick={handleTranslate}
              title={showTranslation ? "Show original" : "Translate"}
              aria-label={showTranslation ? "Show original message" : "Translate message"}
              aria-pressed={showTranslation}
              className={`p-1.5 transition-colors rounded ${
                showTranslation
                  ? "text-goshiwon-yellow hover:text-goshiwon-yellow/80"
                  : "text-goshiwon-text-muted hover:text-goshiwon-text"
              }`}
            >
              <svg
                className="w-3.5 h-3.5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="2" y1="12" x2="22" y2="12" />
                <path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" />
              </svg>
            </button>

            {/* Copy */}
            <button
              onClick={handleCopy}
              title="Copy"
              aria-label="Copy message"
              className="p-1.5 text-goshiwon-text-muted hover:text-goshiwon-text transition-colors rounded"
            >
              {copied ? (
                <span className="text-[10px] text-goshiwon-yellow font-medium">
                  Copied!
                </span>
              ) : (
                <svg
                  className="w-3.5 h-3.5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                  <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                </svg>
              )}
            </button>

            {/* Save vocabulary */}
            {onSaveWords && hasVocabulary(content) && (
              <button
                onClick={handleSaveWords}
                title={saving ? "Saving..." : allWordsSaved ? "Already saved" : "Save words"}
                aria-label={saving ? "Saving vocabulary" : allWordsSaved ? "Words already saved" : "Save vocabulary"}
                disabled={allWordsSaved || saved || saving}
                className={`p-1.5 transition-colors rounded ${
                  allWordsSaved
                    ? "text-goshiwon-yellow/60 cursor-default"
                    : "text-goshiwon-text-muted hover:text-goshiwon-text"
                }`}
              >
                {saving ? (
                  <span className="text-[10px] text-goshiwon-text-muted font-medium">
                    Saving...
                  </span>
                ) : saved ? (
                  <span className="text-[10px] text-goshiwon-yellow font-medium">
                    Saved!
                  </span>
                ) : allWordsSaved ? (
                  <svg
                    className="w-3.5 h-3.5"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : (
                  <svg
                    className="w-3.5 h-3.5"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" />
                    <polyline points="17 21 17 13 7 13 7 21" />
                    <polyline points="7 3 7 8 15 8" />
                  </svg>
                )}
              </button>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-1 mt-1 mr-1 justify-end">
            {/* Copy only for user messages */}
            <button
              onClick={handleCopy}
              title="Copy"
              aria-label="Copy message"
              className="p-1.5 text-goshiwon-text-muted hover:text-goshiwon-text transition-colors rounded"
            >
              {copied ? (
                <span className="text-[10px] text-goshiwon-yellow font-medium">
                  Copied!
                </span>
              ) : (
                <svg
                  className="w-3.5 h-3.5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                  <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                </svg>
              )}
            </button>
          </div>
        )}

        {/* Read receipt for user messages */}
        {!isAssistant && (
          <span className="text-[10px] text-goshiwon-text-muted mt-1 mr-1 animate-read-receipt">
            읽음
          </span>
        )}
      </div>
    </div>
  );
}
