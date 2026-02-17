"use client";

import { useState, useEffect, useCallback } from "react";
import type { VocabularyItem } from "@/types";

interface VocabularyPanelProps {
  words: VocabularyItem[];
  onRemoveWord: (id: string) => void;
  onClose: () => void;
  onStartStudy?: () => void;
  studyableCount?: number;
}

export default function VocabularyPanel({
  words,
  onRemoveWord,
  onClose,
  onStartStudy,
  studyableCount = 0,
}: VocabularyPanelProps) {
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

  return (
    <div className="absolute inset-0 z-50 bg-goshiwon-bg/95 backdrop-blur-sm flex flex-col animate-vocab-panel-in">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-goshiwon-border">
        <div>
          <h2 className="text-sm font-medium text-goshiwon-text">
            나의 단어장
          </h2>
          <p className="text-[10px] text-goshiwon-text-muted">
            My Vocabulary &mdash; {words.length}{" "}
            {words.length === 1 ? "word" : "words"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {onStartStudy && studyableCount >= 2 && (
            <button
              onClick={onStartStudy}
              aria-label="Study flashcards"
              className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full bg-goshiwon-accent/20 text-goshiwon-accent-light hover:bg-goshiwon-accent/30 transition-colors"
            >
              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                <line x1="8" y1="21" x2="16" y2="21" />
                <line x1="12" y1="17" x2="12" y2="21" />
              </svg>
              Study
            </button>
          )}
        <button
          onClick={onClose}
          aria-label="Close vocabulary panel"
          className="p-1.5 text-goshiwon-text-muted hover:text-goshiwon-text transition-colors"
        >
          <svg
            className="w-4 h-4"
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

      {/* Word list */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {sortedWords.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center py-20 text-center">
            <p className="text-goshiwon-text-secondary text-sm">
              No words saved yet.
            </p>
            <p className="text-goshiwon-text-muted text-xs mt-1">
              Save vocabulary from Moon-jo&rsquo;s messages to build your
              dictionary.
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
                  <span className="text-goshiwon-text-muted text-xs">
                    ({word.romanization})
                  </span>
                </div>
                {word.english ? (
                  <p className="text-goshiwon-text-secondary text-xs mt-0.5">
                    {word.english}
                  </p>
                ) : (
                  <p className="text-goshiwon-text-muted text-xs mt-0.5 italic">
                    translation unavailable
                  </p>
                )}
              </div>
              <div className="flex items-center gap-0.5 shrink-0">
                {/* TTS button */}
                <button
                  onClick={() => handleSpeak(word)}
                  aria-label={speakingId === word.id ? `Stop listening to ${word.korean}` : `Listen to ${word.korean}`}
                  className="p-1 text-goshiwon-text-muted hover:text-goshiwon-text transition-colors"
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
                  className="p-1 text-goshiwon-text-muted hover:text-goshiwon-accent-light transition-colors opacity-0 group-hover:opacity-100"
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
    </div>
  );
}
