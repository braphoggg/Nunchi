"use client";

import { useState, useMemo, useEffect, useCallback, memo } from "react";
import type { UIMessage } from "ai";
import { formatMessage } from "@/lib/format-message";
import { getAtmosphericTimestamp } from "@/lib/timestamps";
import { parseVocabulary, hasVocabulary } from "@/lib/parse-vocabulary";
import type { VocabularyItem } from "@/types";
import { getTextContent } from "@/lib/message-utils";
import { useSound } from "@/contexts/SoundContext";
import { useSettingsContext } from "@/contexts/SettingsContext";

/** Strip romanization parentheticals from text, e.g. " (annyeonghaseyo)" */
function stripRomanization(text: string): string {
  return text.replace(/\s*\([a-zA-Z][a-zA-Z\s\-''.]*\)/g, "");
}

/** Check if text contains Korean characters */
function hasKorean(text: string): boolean {
  return /[\uAC00-\uD7AF\u1100-\u11FF\u3130-\u318F]/.test(text);
}

/** Extract Korean-only text for TTS (strips English/romanization) */
function extractKoreanForTTS(text: string): string {
  // Remove romanization parentheticals and English text, keep Korean + punctuation
  const stripped = stripRomanization(text);
  // Keep lines that have Korean characters
  return stripped
    .split("\n")
    .filter((line) => hasKorean(line))
    .join("\n")
    .trim();
}

interface MessageBubbleProps {
  message: UIMessage;
  onSaveWords?: (words: Omit<VocabularyItem, "id" | "savedAt">[]) => void;
  isWordSaved?: (korean: string) => boolean;
  onTranslateUsed?: () => void;
}

function MessageBubble({ message, onSaveWords, isWordSaved, onTranslateUsed }: MessageBubbleProps) {
  const sound = useSound();
  const { settings, apiKey } = useSettingsContext();
  const showRomanization = settings.showRomanization;
  const authHeaders: Record<string, string> = apiKey
    ? { "Content-Type": "application/json", "x-api-key": apiKey }
    : { "Content-Type": "application/json" };
  const isAssistant = message.role === "assistant";
  const content = getTextContent(message);

  const [showTranslation, setShowTranslation] = useState(false);
  const [translation, setTranslation] = useState<string | null>(null);
  const [translating, setTranslating] = useState(false);
  const [translateError, setTranslateError] = useState(false);
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [speaking, setSpeaking] = useState(false);

  // TTS for assistant Korean text
  const koreanText = useMemo(
    () => (isAssistant ? extractKoreanForTTS(content) : ""),
    [isAssistant, content],
  );
  const canSpeak = isAssistant && hasKorean(content);

  // Cancel speech on unmount
  useEffect(() => {
    return () => {
      if (speaking && typeof speechSynthesis !== "undefined") {
        speechSynthesis.cancel();
      }
    };
  }, [speaking]);

  const handleSpeak = useCallback(() => {
    if (!canSpeak || typeof speechSynthesis === "undefined") return;
    if (speaking) {
      speechSynthesis.cancel();
      setSpeaking(false);
      return;
    }
    speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(koreanText);
    utterance.lang = "ko-KR";
    utterance.rate = 0.85;
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    speechSynthesis.speak(utterance);
    setSpeaking(true);
  }, [canSpeak, speaking, koreanText]);

  // Check if all vocabulary in this message is already saved
  const allWordsSaved = useMemo(() => {
    if (!isWordSaved || !isAssistant || !hasVocabulary(content)) return false;
    const vocabItems = parseVocabulary(content);
    if (vocabItems.length === 0) return false;
    return vocabItems.every((w) => isWordSaved(w.korean));
  }, [isWordSaved, isAssistant, content]);

  // Memoize parsed vocabulary so both handlers share the same parse
  const vocabItems = useMemo(
    () => (isAssistant && hasVocabulary(content) ? parseVocabulary(content) : []),
    [isAssistant, content],
  );

  const handleSaveWords = useCallback(async () => {
    if (!onSaveWords || saved || saving || allWordsSaved) return;
    if (vocabItems.length === 0) return;

    // Find words that need English translation
    const needsTranslation = vocabItems.filter((w) => !w.english);

    if (needsTranslation.length > 0) {
      setSaving(true);
      try {
        const res = await fetch("/api/vocabulary-translate", {
          method: "POST",
          headers: authHeaders,
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
    sound.playWordSaved();
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }, [vocabItems, onSaveWords, saved, saving, allWordsSaved, sound]);

  /** Save a single vocabulary word by its Korean text (clicked inline) */
  const handleSingleWordSave = useCallback(async (koreanWord: string) => {
    if (!onSaveWords || saving) return;
    if (isWordSaved?.(koreanWord)) return;

    const item = vocabItems.find((w) => w.korean === koreanWord);
    if (!item) return;

    // Fetch translation if missing
    if (!item.english) {
      setSaving(true);
      try {
        const res = await fetch("/api/vocabulary-translate", {
          method: "POST",
          headers: authHeaders,
          body: JSON.stringify({ words: [item.korean] }),
        });
        if (res.ok) {
          const data = await res.json();
          const translations: Record<string, string> = data.translations ?? {};
          if (translations[item.korean]) {
            item.english = translations[item.korean];
          }
        }
      } catch {
        // Save with empty English — better than not saving
      } finally {
        setSaving(false);
      }
    }

    onSaveWords([item]);
    sound.playWordSaved();
  }, [vocabItems, onSaveWords, saving, isWordSaved, sound]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const timestamp = useMemo(() => getAtmosphericTimestamp(), []);

  async function handleTranslate() {
    if (!isAssistant || translating) return;
    sound.playTranslationToggle();

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
      sound.playCopyConfirm();
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Silently fail
    }
  }

  const rawDisplayContent =
    showTranslation && translation ? translation : content;
  const displayContent =
    !showRomanization && isAssistant && !showTranslation
      ? stripRomanization(rawDisplayContent)
      : rawDisplayContent;

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
              <span className="text-xs text-goshiwon-text-muted uppercase tracking-wider">
                서문조
              </span>
            </div>
          )}
          <div
            className={`px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
              isAssistant ? "pt-1.5 font-korean" : ""
            }`}
          >
            {showTranslation && translation && (
              <p className="text-xs text-goshiwon-text-muted italic mb-1">
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
              formatMessage(
                displayContent,
                onSaveWords && hasVocabulary(content) && !showTranslation
                  ? { onVocabClick: handleSingleWordSave, isWordSaved }
                  : undefined
              )
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
            <span className="text-xs text-goshiwon-text-muted">
              {timestamp}
            </span>
          </div>
        </div>

        {/* Action buttons — below the bubble */}
        {isAssistant ? (
          <div data-tutorial="message-actions" className="flex items-center gap-1.5 mt-1 ml-1">
            {/* Translate */}
            <button
              onClick={handleTranslate}
              title={showTranslation ? "Show original" : "Translate"}
              aria-label={showTranslation ? "Show original message" : "Translate message"}
              aria-pressed={showTranslation}
              className={`p-2.5 min-h-[44px] min-w-[44px] flex items-center justify-center transition-colors rounded ${
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
              className="p-2.5 min-h-[44px] min-w-[44px] flex items-center justify-center text-goshiwon-text-muted hover:text-goshiwon-text transition-colors rounded"
            >
              {copied ? (
                <span className="text-xs text-goshiwon-yellow font-medium">
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

            {/* Listen (TTS) */}
            {canSpeak && (
              <button
                onClick={handleSpeak}
                title={speaking ? "Stop listening" : "Listen"}
                aria-label={speaking ? "Stop listening to message" : "Listen to Korean text"}
                className={`p-2.5 min-h-[44px] min-w-[44px] flex items-center justify-center transition-colors rounded ${
                  speaking
                    ? "text-goshiwon-yellow hover:text-goshiwon-yellow/80"
                    : "text-goshiwon-text-muted hover:text-goshiwon-text"
                }`}
              >
                {speaking ? (
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                    <rect x="6" y="6" width="12" height="12" rx="1" />
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
                    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                    <path d="M15.54 8.46a5 5 0 010 7.07" />
                  </svg>
                )}
              </button>
            )}

            {/* Save vocabulary */}
            {onSaveWords && hasVocabulary(content) && (
              <button
                onClick={handleSaveWords}
                title={saving ? "Saving..." : allWordsSaved ? "Already saved" : "Save words"}
                aria-label={saving ? "Saving vocabulary" : allWordsSaved ? "Words already saved" : "Save vocabulary"}
                disabled={allWordsSaved || saved || saving}
                className={`p-2.5 min-h-[44px] min-w-[44px] flex items-center justify-center transition-colors rounded ${
                  allWordsSaved
                    ? "text-goshiwon-yellow/60 cursor-default"
                    : "text-goshiwon-text-muted hover:text-goshiwon-text"
                }`}
              >
                {saving ? (
                  <span className="text-xs text-goshiwon-text-muted font-medium">
                    Saving...
                  </span>
                ) : saved ? (
                  <span className="text-xs text-goshiwon-yellow font-medium">
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
          <div className="flex items-center gap-1.5 mt-1 mr-1 justify-end">
            {/* Copy only for user messages */}
            <button
              onClick={handleCopy}
              title="Copy"
              aria-label="Copy message"
              className="p-2.5 min-h-[44px] min-w-[44px] flex items-center justify-center text-goshiwon-text-muted hover:text-goshiwon-text transition-colors rounded"
            >
              {copied ? (
                <span className="text-xs text-goshiwon-yellow font-medium">
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
          <span className="text-xs text-goshiwon-text-muted mt-1 mr-1 animate-read-receipt">
            읽음
          </span>
        )}
      </div>
    </div>
  );
}

export default memo(MessageBubble);
