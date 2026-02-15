"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { VocabularyItem } from "@/types";
import { useFlashcards, type FlashcardSummary } from "@/hooks/useFlashcards";

interface FlashcardModeProps {
  words: VocabularyItem[];
  onClose: () => void;
  onSessionComplete?: (summary: FlashcardSummary) => void;
}

/** Moon-jo feedback quotes based on performance */
function getMoonjoFeedback(goodAndEasyPct: number): { korean: string; english: string } {
  if (goodAndEasyPct >= 80) {
    return {
      korean: "아주 잘했어요... 역시 제가 가르친 사람이에요. 자랑스럽군요.",
      english: "You did very well... as expected of my student. I'm proud.",
    };
  }
  if (goodAndEasyPct >= 50) {
    return {
      korean: "괜찮아요. 아직 시간이 있어요. 우리 함께 더 연습해요.",
      english: "It's okay. There's still time. Let's practice together more.",
    };
  }
  return {
    korean: "천천히 하세요... 서두르지 마세요. 저는 기다릴 수 있어요. 항상 여기 있을 거니까요.",
    english: "Take it slow... don't rush. I can wait. I'll always be here.",
  };
}

export default function FlashcardMode({ words, onClose, onSessionComplete }: FlashcardModeProps) {
  const {
    startSession,
    endSession,
    isActive,
    currentCard,
    currentIndex,
    totalCards,
    flipped,
    flip,
    next,
    prev,
    grade,
    isComplete,
    summary,
    studyableCount,
  } = useFlashcards(words);

  // Track card changes for slide animation
  const [animKey, setAnimKey] = useState(0);
  useEffect(() => {
    setAnimKey((k) => k + 1);
  }, [currentIndex]);

  // Fire onSessionComplete once when session finishes
  const sessionReported = useRef(false);
  useEffect(() => {
    if (isComplete && !sessionReported.current) {
      sessionReported.current = true;
      onSessionComplete?.(summary);
    }
    if (!isComplete) {
      sessionReported.current = false;
    }
  }, [isComplete, summary, onSessionComplete]);

  // TTS state
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Cancel speech on unmount
  useEffect(() => {
    return () => {
      if (typeof speechSynthesis !== "undefined") {
        speechSynthesis.cancel();
      }
    };
  }, []);

  // Cancel speech when card changes
  useEffect(() => {
    if (typeof speechSynthesis !== "undefined") {
      speechSynthesis.cancel();
    }
    setIsSpeaking(false);
  }, [currentIndex]);

  const handleSpeak = useCallback(() => {
    if (!currentCard) return;
    if (isSpeaking) {
      speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }
    speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(currentCard.korean);
    utterance.lang = "ko-KR";
    utterance.rate = 0.9;
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    speechSynthesis.speak(utterance);
    setIsSpeaking(true);
  }, [isSpeaking, currentCard]);

  // Auto-start session on mount
  useEffect(() => {
    if (!isActive && studyableCount >= 2) {
      startSession();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Not enough words
  if (studyableCount < 2) {
    return (
      <div className="absolute inset-0 z-10 bg-goshiwon-bg/95 backdrop-blur-sm flex flex-col animate-vocab-panel-in">
        <div className="flex items-center px-4 py-3 border-b border-goshiwon-border">
          <button
            onClick={onClose}
            aria-label="Back to vocabulary"
            className="p-1.5 text-goshiwon-text-muted hover:text-goshiwon-text transition-colors mr-2"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <h2 className="text-sm font-medium text-goshiwon-text">Study</h2>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
          <p className="text-goshiwon-text-secondary text-sm">
            Not enough words to study.
          </p>
          <p className="text-goshiwon-text-muted text-xs mt-1">
            Save at least 2 vocabulary words with translations to start a study session.
          </p>
        </div>
      </div>
    );
  }

  // Summary screen
  if (isComplete) {
    const goodAndEasyPct = summary.total > 0
      ? Math.round(((summary.good + summary.easy) / summary.total) * 100)
      : 0;
    const feedback = getMoonjoFeedback(goodAndEasyPct);

    return (
      <div className="absolute inset-0 z-10 bg-goshiwon-bg/95 backdrop-blur-sm flex flex-col animate-vocab-panel-in">
        <div className="flex items-center px-4 py-3 border-b border-goshiwon-border">
          <h2 className="text-sm font-medium text-goshiwon-text">Session Complete</h2>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center px-6 animate-summary-in">
          {/* Score breakdown */}
          <div className="w-full max-w-xs space-y-3 mb-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-goshiwon-accent" />
                <span className="text-sm text-goshiwon-text">Again</span>
              </div>
              <span className="text-sm font-medium text-goshiwon-text" data-testid="again-count">{summary.again}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-goshiwon-text-secondary" />
                <span className="text-sm text-goshiwon-text">Good</span>
              </div>
              <span className="text-sm font-medium text-goshiwon-text" data-testid="good-count">{summary.good}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-goshiwon-yellow" />
                <span className="text-sm text-goshiwon-text">Easy</span>
              </div>
              <span className="text-sm font-medium text-goshiwon-text" data-testid="easy-count">{summary.easy}</span>
            </div>
            <div className="border-t border-goshiwon-border pt-2 flex items-center justify-between">
              <span className="text-xs text-goshiwon-text-muted">Total</span>
              <span className="text-xs text-goshiwon-text-muted">{summary.total}</span>
            </div>
          </div>

          {/* Moon-jo feedback */}
          <div className="max-w-xs text-center mb-8">
            <p className="text-sm text-[#d4a843] italic leading-relaxed">
              &ldquo;{feedback.korean}&rdquo;
            </p>
            <p className="text-xs text-goshiwon-text-muted mt-2">
              {feedback.english}
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => startSession()}
              aria-label="Study again"
              className="px-4 py-2 text-xs font-medium rounded-lg bg-goshiwon-accent/20 text-goshiwon-accent-light border border-goshiwon-accent/40 hover:bg-goshiwon-accent/30 transition-colors"
            >
              Study Again
            </button>
            <button
              onClick={() => { endSession(); onClose(); }}
              aria-label="Done studying"
              className="px-4 py-2 text-xs font-medium rounded-lg bg-goshiwon-surface text-goshiwon-text border border-goshiwon-border hover:bg-goshiwon-surface-hover transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Study screen
  return (
    <div className="absolute inset-0 z-10 bg-goshiwon-bg/95 backdrop-blur-sm flex flex-col animate-vocab-panel-in">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-goshiwon-border">
        <button
          onClick={() => { endSession(); onClose(); }}
          aria-label="Back to vocabulary"
          className="p-1.5 text-goshiwon-text-muted hover:text-goshiwon-text transition-colors"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <span className="text-xs text-goshiwon-text-muted">
          {currentIndex + 1} / {totalCards}
        </span>
        <div className="w-7" /> {/* Spacer for centering */}
      </div>

      {/* Progress bar */}
      <div className="h-0.5 bg-goshiwon-border">
        <div
          className="h-full bg-goshiwon-yellow transition-all duration-300 ease-out"
          style={{ width: `${totalCards > 0 ? ((currentIndex + 1) / totalCards) * 100 : 0}%` }}
          role="progressbar"
          aria-valuenow={currentIndex + 1}
          aria-valuemin={1}
          aria-valuemax={totalCards}
        />
      </div>

      {/* Card area */}
      <div className="flex-1 flex flex-col items-center justify-center px-6">
        {currentCard && (
          <div
            key={animKey}
            className="flashcard-container w-full max-w-sm animate-card-slide-in"
          >
            <div
              onClick={flip}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); flip(); } }}
              role="button"
              tabIndex={0}
              aria-label={flipped ? "Flip card to front" : "Flip card to back"}
              className="w-full cursor-pointer"
            >
              <div className={`flashcard-inner ${flipped ? "flashcard-flipped" : ""}`}>
                {/* Front face */}
                <div className="flashcard-front bg-goshiwon-surface border border-goshiwon-border rounded-xl p-8 flex flex-col items-center justify-center">
                  <span className="text-[#d4a843] text-2xl font-bold leading-relaxed">
                    {currentCard.korean}
                  </span>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleSpeak(); }}
                    aria-label={isSpeaking ? "Stop listening" : "Listen to pronunciation"}
                    className="mt-3 p-1.5 text-goshiwon-text-muted hover:text-goshiwon-text transition-colors rounded-full"
                  >
                    {isSpeaking ? (
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                        <rect x="6" y="6" width="12" height="12" rx="1" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                        <path d="M15.54 8.46a5 5 0 010 7.07" />
                      </svg>
                    )}
                  </button>
                  <span className="text-[10px] text-goshiwon-text-muted mt-2">
                    tap to flip
                  </span>
                </div>
                {/* Back face */}
                <div className="flashcard-back bg-goshiwon-surface border border-goshiwon-border rounded-xl p-8 flex flex-col items-center justify-center">
                  <span className="text-goshiwon-text-muted text-sm mb-2">
                    {currentCard.romanization}
                  </span>
                  <span className="text-goshiwon-text text-lg font-medium">
                    {currentCard.english}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom controls */}
      <div className="px-4 pb-4 pt-2 space-y-3">
        {/* Grade buttons — only visible when flipped */}
        {flipped && (
          <div className="flex items-center justify-center gap-2 animate-message-in">
            <button
              onClick={() => grade("again")}
              aria-label="Grade: Again"
              className="flex-1 max-w-[110px] py-2 text-xs font-medium rounded-lg bg-goshiwon-accent/20 text-goshiwon-accent-light border border-goshiwon-accent/40 hover:bg-goshiwon-accent/30 transition-colors flex flex-col items-center gap-0.5"
            >
              <span>Again</span>
              <span className="text-[10px] opacity-60">다시</span>
            </button>
            <button
              onClick={() => grade("good")}
              aria-label="Grade: Good"
              className="flex-1 max-w-[110px] py-2 text-xs font-medium rounded-lg bg-goshiwon-surface text-goshiwon-text border border-goshiwon-border hover:bg-goshiwon-surface-hover transition-colors flex flex-col items-center gap-0.5"
            >
              <span>Good</span>
              <span className="text-[10px] opacity-60">좋아요</span>
            </button>
            <button
              onClick={() => grade("easy")}
              aria-label="Grade: Easy"
              className="flex-1 max-w-[110px] py-2 text-xs font-medium rounded-lg bg-goshiwon-yellow/15 text-[#d4a843] border border-goshiwon-yellow/30 hover:bg-goshiwon-yellow/25 transition-colors flex flex-col items-center gap-0.5"
            >
              <span>Easy</span>
              <span className="text-[10px] opacity-60">쉬워요</span>
            </button>
          </div>
        )}

        {/* Navigation arrows */}
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={prev}
            disabled={currentIndex === 0}
            aria-label="Previous card"
            className="p-2 text-goshiwon-text-muted hover:text-goshiwon-text transition-colors disabled:opacity-30 disabled:cursor-default"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <button
            onClick={next}
            disabled={currentIndex >= totalCards - 1}
            aria-label="Next card"
            className="p-2 text-goshiwon-text-muted hover:text-goshiwon-text transition-colors disabled:opacity-30 disabled:cursor-default"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
