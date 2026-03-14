"use client";

import { useState, useEffect, useCallback, memo } from "react";
import type { VocabularyItem } from "@/types";
import Modal from "./Modal";
import { useSettingsContext } from "@/contexts/SettingsContext";

interface VocabularyPanelProps {
  words: VocabularyItem[];
  onRemoveWord: (id: string) => void;
  onUpdateWord?: (id: string, updates: Partial<Omit<VocabularyItem, "id" | "korean" | "romanization" | "savedAt">>) => void;
  onClose: () => void;
  onStartStudy?: () => void;
  onStartQuiz?: () => void;
  studyableCount?: number;
  quizReady?: boolean;
  dueCount?: number;
}

function VocabularyPanel({
  words,
  onRemoveWord,
  onUpdateWord,
  onClose,
  onStartStudy,
  onStartQuiz,
  studyableCount = 0,
  quizReady = false,
  dueCount = 0,
}: VocabularyPanelProps) {
  const { settings } = useSettingsContext();
  const showRomanization = settings.showRomanization;
  const sortedWords = [...words].sort(
    (a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime()
  );

  // TTS state — tracks which word is currently being spoken
  const [speakingId, setSpeakingId] = useState<string | null>(null);

  // Cancel speech on unmount
  useEffect(() => {
    return () => {
      if (typeof speechSynthesis !== "undefined") {
        speechSynthesis.cancel();
      }
    };
  }, []);

  const handleSpeak = useCallback((word: VocabularyItem) => {
    if (speakingId === word.id) {
      speechSynthesis.cancel();
      setSpeakingId(null);
      return;
    }
    speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(word.korean);
    utterance.lang = "ko-KR";
    utterance.rate = 0.9;
    utterance.onend = () => setSpeakingId(null);
    utterance.onerror = () => setSpeakingId(null);
    speechSynthesis.speak(utterance);
    setSpeakingId(word.id);
  }, [speakingId]);

  // Retry translation for words with missing english
  const [retryingIds, setRetryingIds] = useState<Set<string>>(new Set());
  const untranslatedWords = words.filter((w) => !w.english);

  const handleRetryTranslation = useCallback(async (targetWords: VocabularyItem[]) => {
    if (!onUpdateWord || targetWords.length === 0) return;
    const ids = new Set(targetWords.map((w) => w.id));
    setRetryingIds(ids);
    try {
      // Batch up to 20 words per API call
      const koreanWords = targetWords.map((w) => w.korean).slice(0, 20);
      const res = await fetch("/api/vocabulary-translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ words: koreanWords }),
      });
      if (res.ok) {
        const data = await res.json();
        const translations: Record<string, string> = data.translations ?? {};
        for (const word of targetWords) {
          const english = translations[word.korean];
          if (english) {
            onUpdateWord(word.id, { english: english.toLowerCase() });
          }
        }
      }
    } catch {
      // Silently fail — user can try again
    } finally {
      setRetryingIds(new Set());
    }
  }, [onUpdateWord]);

  const vocabHeaderContent = (
    <>
      {onUpdateWord && untranslatedWords.length > 0 && (
        <button
          onClick={() => handleRetryTranslation(untranslatedWords)}
          disabled={retryingIds.size > 0}
          aria-label="Retry translations for untranslated words"
          className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full bg-goshiwon-yellow/10 text-goshiwon-yellow/80 hover:bg-goshiwon-yellow/20 hover:text-goshiwon-yellow transition-colors disabled:opacity-50"
        >
          {retryingIds.size > 0 ? "Translating..." : `Translate ${untranslatedWords.length}`}
        </button>
      )}
      {onStartStudy && studyableCount >= 4 && (
        <button
          onClick={onStartStudy}
          aria-label="Study flashcards"
          className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full bg-goshiwon-accent/20 text-goshiwon-accent-light hover:bg-goshiwon-accent/30 transition-colors"
        >
          <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
            <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
          </svg>
          Study All
          {dueCount > 0 && (
            <span className="ml-0.5 px-1.5 py-px text-xs font-bold rounded-full bg-goshiwon-accent/40 text-goshiwon-accent-light">
              {dueCount}
            </span>
          )}
        </button>
      )}
      {onStartQuiz && quizReady && (
        <button
          onClick={onStartQuiz}
          aria-label="Take a quiz"
          className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full bg-goshiwon-yellow/10 text-goshiwon-yellow/80 hover:bg-goshiwon-yellow/20 transition-colors"
        >
          <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
          </svg>
          Quick Quiz
        </button>
      )}
    </>
  );

  return (
    <Modal
      onClose={onClose}
      title="나의 단어장"
      subtitle={`My Vocabulary — ${words.length} ${words.length === 1 ? "word" : "words"}`}
      closeAriaLabel="Close vocabulary panel"
      headerContent={vocabHeaderContent}
    >
      {/* Word list */}
      <div className="p-4 space-y-2">
        {sortedWords.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center py-16 px-6 text-center">
            {/* Book icon */}
            <svg className="w-10 h-10 text-goshiwon-text-muted/40 mb-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 19.5A2.5 2.5 0 016.5 17H20" />
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" />
              <path d="M8 7h8M8 11h6" />
            </svg>
            <p className="text-goshiwon-text-secondary text-sm">
              Your dictionary is empty.
            </p>
            <p className="text-goshiwon-text-muted text-xs mt-2 max-w-[240px] leading-relaxed">
              Tap the <span className="text-[#d4a843]">golden Korean words</span> in
              Moon-jo&rsquo;s messages to save them here.
            </p>
            <p className="text-goshiwon-text-muted/50 text-xs italic mt-4">
              &ldquo;단어를 모으세요... 제가 가르쳐 드릴게요.&rdquo;
            </p>
          </div>
        ) : (
          sortedWords.map((word) => (
            <div
              key={word.id}
              className="flex items-start justify-between p-3 bg-goshiwon-surface border border-goshiwon-border rounded-lg group"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-2">
                  <span className="text-[#d4a843] font-semibold text-sm">
                    {word.korean}
                  </span>
                  {showRomanization && (
                    <span className="text-goshiwon-text-muted text-xs">
                      ({word.romanization})
                    </span>
                  )}
                </div>
                {word.english ? (
                  <p className="text-goshiwon-text-secondary text-xs mt-0.5">
                    {word.english}
                  </p>
                ) : (
                  <p className="text-goshiwon-text-muted text-xs mt-0.5 italic flex items-center gap-1.5">
                    <span>translation unavailable</span>
                    {onUpdateWord && (
                      <button
                        onClick={() => handleRetryTranslation([word])}
                        disabled={retryingIds.has(word.id)}
                        className="text-xs text-goshiwon-yellow/70 hover:text-goshiwon-yellow underline transition-colors disabled:opacity-50"
                      >
                        {retryingIds.has(word.id) ? "..." : "retry"}
                      </button>
                    )}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-0.5 shrink-0">
                {/* TTS button */}
                <button
                  onClick={() => handleSpeak(word)}
                  aria-label={speakingId === word.id ? `Stop listening to ${word.korean}` : `Listen to ${word.korean}`}
                  className="p-1 min-h-[44px] min-w-[44px] flex items-center justify-center text-goshiwon-text-muted hover:text-goshiwon-text transition-colors"
                >
                  {speakingId === word.id ? (
                    <svg
                      className="w-3.5 h-3.5"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                    >
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
                {/* Delete button */}
                <button
                  onClick={() => onRemoveWord(word.id)}
                  aria-label={`Remove ${word.korean}`}
                  className="p-1 min-h-[44px] min-w-[44px] flex items-center justify-center text-goshiwon-text-muted hover:text-goshiwon-accent-light transition-colors sm:opacity-0 sm:group-hover:opacity-100"
                >
                  <svg
                    className="w-3.5 h-3.5"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  >
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </Modal>
  );
}

export default memo(VocabularyPanel);
