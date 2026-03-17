"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import type { VocabularyItem } from "@/types";
import type { FlashcardSummary } from "@/hooks/useFlashcards";
import Modal from "./Modal";
import HangulKeyboard from "./HangulKeyboard";
import { useSound } from "@/contexts/SoundContext";

interface WritingModeProps {
  words: VocabularyItem[];
  onClose: () => void;
  onSessionComplete?: (summary: FlashcardSummary) => void;
  onWordGraded?: (wordId: string, grade: "again" | "good" | "easy") => void;
}

const MIN_WRITING_WORDS = 4;

/** Normalize Korean text for comparison (remove spaces, lowercase) */
function normalize(text: string): string {
  return text.replace(/\s+/g, "").toLowerCase().trim();
}

/** Check if user answer matches the target Korean word */
function checkAnswer(userInput: string, target: string): "exact" | "close" | "wrong" {
  const normalizedInput = normalize(userInput);
  const normalizedTarget = normalize(target);

  if (normalizedInput === normalizedTarget) return "exact";

  // Allow minor differences (1 character off for words 3+ chars)
  if (normalizedTarget.length >= 3) {
    let diffs = 0;
    const maxLen = Math.max(normalizedInput.length, normalizedTarget.length);
    const minLen = Math.min(normalizedInput.length, normalizedTarget.length);
    diffs += maxLen - minLen;
    for (let i = 0; i < minLen; i++) {
      if (normalizedInput[i] !== normalizedTarget[i]) diffs++;
    }
    if (diffs <= 1) return "close";
  }

  return "wrong";
}

/** Moon-jo feedback based on score */
function getMoonjoFeedback(pct: number): { korean: string; english: string } {
  if (pct === 100) {
    return {
      korean: "글씨가 아름다워요... 손이 기억하고 있군요.",
      english: "Beautiful writing... Your hands remember.",
    };
  }
  if (pct >= 70) {
    return {
      korean: "잘했어요. 하지만 아직 연습이 필요해요.",
      english: "Well done. But you still need practice.",
    };
  }
  if (pct >= 40) {
    return {
      korean: "마음은 알겠는데... 손이 따라가지 못하네요.",
      english: "Your heart understands... but your hands can't keep up.",
    };
  }
  return {
    korean: "다시 쓰세요. 이 방에서 시간은 충분해요.",
    english: "Write again. There's plenty of time in this room.",
  };
}

export default function WritingMode({
  words,
  onClose,
  onSessionComplete,
  onWordGraded,
}: WritingModeProps) {
  const sound = useSound();
  const studyable = useMemo(
    () => words.filter((w) => w.english?.trim()),
    [words],
  );

  // Shuffle words for the session
  const deck = useMemo(() => {
    const shuffled = [...studyable];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled.slice(0, 10); // Max 10 words per session
  }, [studyable]);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [userInput, setUserInput] = useState("");
  const [result, setResult] = useState<"exact" | "close" | "wrong" | null>(null);
  const [results, setResults] = useState<Map<string, "exact" | "close" | "wrong">>(new Map());
  const [isComplete, setIsComplete] = useState(false);
  const [keyboardVisible, setKeyboardVisible] = useState(true);
  const completionReported = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const userInputRef = useRef(userInput);

  const currentWord = deck[currentIndex] ?? null;

  // Keep ref in sync for use in keyboard Enter handler (avoids stale closure)
  useEffect(() => { userInputRef.current = userInput; }, [userInput]);

  // ─── Hangul keyboard handlers ───────────────────────────────────────
  const handleKeyboardInput = useCallback((text: string) => {
    setUserInput((prev) => {
      const next = prev + text;
      userInputRef.current = next; // sync ref immediately for keyboard Enter
      return next;
    });
  }, []);

  const handleKeyboardDelete = useCallback(() => {
    setUserInput((prev) => {
      const next = prev.slice(0, -1);
      userInputRef.current = next;
      return next;
    });
  }, []);

  const toggleKeyboard = useCallback(() => {
    setKeyboardVisible((v) => {
      sound.playKeyboardToggle(!v);
      return !v;
    });
  }, [sound]);

  // Focus input on mount and when moving to next word
  useEffect(() => {
    if (!isComplete && !result) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [currentIndex, isComplete, result]);

  const handleSubmit = useCallback(() => {
    if (!currentWord || result !== null) return;
    // Use ref for freshest value (keyboard Enter fires before React re-renders)
    const trimmed = userInputRef.current.trim();
    if (!trimmed) return;

    const answerResult = checkAnswer(trimmed, currentWord.korean);
    setResult(answerResult);
    setResults((prev) => new Map(prev).set(currentWord.id, answerResult));

    // Grade for SRS
    if (onWordGraded) {
      if (answerResult === "exact") {
        onWordGraded(currentWord.id, "easy");
        sound.playFlashcardGrade("easy");
      } else if (answerResult === "close") {
        onWordGraded(currentWord.id, "good");
        sound.playFlashcardGrade("good");
      } else {
        onWordGraded(currentWord.id, "again");
        sound.playFlashcardGrade("again");
      }
    }
  }, [currentWord, result, onWordGraded, sound]);

  const handleNext = useCallback(() => {
    if (currentIndex < deck.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      setUserInput("");
      setResult(null);
    } else {
      setIsComplete(true);
      sound.playSessionComplete();
    }
  }, [currentIndex, deck.length, sound]);

  const handleSkip = useCallback(() => {
    if (!currentWord) return;
    setResults((prev) => new Map(prev).set(currentWord.id, "wrong"));
    if (onWordGraded) {
      onWordGraded(currentWord.id, "again");
    }
    handleNext();
  }, [currentWord, onWordGraded, handleNext]);

  /** Shared Enter logic — used by both physical keyboard and HangulKeyboard.
   *  Uses userInputRef so the HangulKeyboard's delayed onSubmit (10ms after
   *  onInput) sees the freshly-committed text even before React re-renders. */
  const handleEnterAction = useCallback(() => {
    if (result !== null) {
      handleNext();
    } else if (userInputRef.current.trim()) {
      handleSubmit();
    }
  }, [result, handleNext, handleSubmit]);

  // Keyboard shortcuts (physical keyboard)
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleEnterAction();
      }
      if (e.key === "Tab" && !result) {
        e.preventDefault();
        handleSkip();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [result, handleEnterAction, handleSkip]);

  // Report completion
  useEffect(() => {
    if (isComplete && !completionReported.current && onSessionComplete) {
      completionReported.current = true;
      const correctCount = Array.from(results.values()).filter((r) => r === "exact" || r === "close").length;
      const againCount = Array.from(results.values()).filter((r) => r === "wrong").length;
      onSessionComplete({
        again: againCount,
        good: correctCount,
        easy: Array.from(results.values()).filter((r) => r === "exact").length,
        total: results.size,
      });
    }
  }, [isComplete, results, onSessionComplete]);

  // Not enough words
  if (studyable.length < MIN_WRITING_WORDS) {
    return (
      <Modal onClose={onClose} title="Writing Practice" stickyHeader closeAriaLabel="Close writing practice">
        <div className="flex flex-col items-center justify-center p-8 text-center gap-4">
          <span className="text-4xl">✍️</span>
          <p className="text-goshiwon-text text-sm">
            Not enough words to practice writing.
          </p>
          <p className="text-goshiwon-text-muted text-xs">
            Save at least {MIN_WRITING_WORDS} translated words first.
          </p>
        </div>
      </Modal>
    );
  }

  // Completion screen
  if (isComplete) {
    const correctCount = Array.from(results.values()).filter((r) => r !== "wrong").length;
    const pct = results.size > 0 ? Math.round((correctCount / results.size) * 100) : 0;
    const feedback = getMoonjoFeedback(pct);

    return (
      <Modal onClose={onClose} title="Writing Practice" stickyHeader closeAriaLabel="Close writing practice">
        <div className="p-6 space-y-5">
          {/* Score circle */}
          <div className="flex flex-col items-center gap-3">
            <div className="relative w-20 h-20">
              <svg className="w-20 h-20 -rotate-90" viewBox="0 0 36 36">
                <circle cx="18" cy="18" r="15" fill="none" stroke="currentColor" strokeWidth="3" className="text-goshiwon-border" />
                <circle
                  cx="18" cy="18" r="15" fill="none"
                  strokeWidth="3"
                  strokeDasharray={`${pct * 0.94} 100`}
                  strokeLinecap="round"
                  className="text-goshiwon-yellow"
                />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-xl font-bold text-goshiwon-text">
                {pct}%
              </span>
            </div>
            <p className="text-sm text-goshiwon-text">
              {correctCount}/{results.size} correct
            </p>
          </div>

          {/* Feedback */}
          <div className="text-center space-y-1">
            <p className="text-sm text-goshiwon-yellow italic font-korean">
              &ldquo;{feedback.korean}&rdquo;
            </p>
            <p className="text-xs text-goshiwon-text-muted italic">
              {feedback.english}
            </p>
          </div>

          {/* Result breakdown */}
          <div className="bg-goshiwon-surface rounded-lg p-3 border border-goshiwon-border space-y-2">
            {deck.map((word) => {
              const r = results.get(word.id);
              return (
                <div key={word.id} className="flex items-center justify-between text-xs">
                  <span className="text-goshiwon-text font-korean">{word.korean}</span>
                  <span className={r === "exact" ? "text-emerald-400" : r === "close" ? "text-amber-400" : "text-red-400"}>
                    {r === "exact" ? "✓ Exact" : r === "close" ? "~ Close" : "✗ Wrong"}
                  </span>
                </div>
              );
            })}
          </div>

          <button
            onClick={onClose}
            className="w-full py-3 px-4 text-sm font-medium rounded-lg bg-goshiwon-surface text-goshiwon-text-secondary border border-goshiwon-border hover:bg-goshiwon-surface-hover transition-colors min-h-[44px]"
          >
            Done
          </button>
        </div>
      </Modal>
    );
  }

  // Main writing UI
  return (
    <Modal onClose={onClose} title="Writing Practice" stickyHeader closeAriaLabel="Close writing practice">
      <div className="p-4 space-y-6">
        {/* Progress */}
        <div className="flex items-center gap-2">
          <div className="flex-1 h-1.5 bg-goshiwon-border rounded-full overflow-hidden">
            <div
              className="h-full bg-goshiwon-yellow rounded-full transition-all duration-300"
              style={{ width: `${((currentIndex) / deck.length) * 100}%` }}
              role="progressbar"
              aria-valuenow={currentIndex}
              aria-valuemin={0}
              aria-valuemax={deck.length}
            />
          </div>
          <span className="text-xs text-goshiwon-text-muted shrink-0">
            {currentIndex + 1}/{deck.length}
          </span>
        </div>

        {/* Prompt */}
        {currentWord && (
          <div className="text-center space-y-3 py-4">
            <p className="text-goshiwon-text-muted text-xs uppercase tracking-wider">
              Write in Korean
            </p>
            <p className="text-xl text-goshiwon-text font-medium">
              {currentWord.english}
            </p>
            {currentWord.romanization && (
              <p className="text-sm text-goshiwon-text-muted">
                ({currentWord.romanization})
              </p>
            )}
          </div>
        )}

        {/* Input row */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <button
              onClick={toggleKeyboard}
              aria-label={keyboardVisible ? "Hide Korean keyboard" : "Show Korean keyboard"}
              className={`min-w-[40px] min-h-[40px] flex items-center justify-center rounded-lg border transition-colors shrink-0 ${
                keyboardVisible
                  ? "bg-goshiwon-yellow/15 border-goshiwon-yellow/30 text-goshiwon-yellow"
                  : "bg-goshiwon-surface border-goshiwon-border text-goshiwon-text-muted hover:text-goshiwon-text"
              }`}
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="4" width="20" height="16" rx="2" />
                <path d="M6 8h.01M10 8h.01M14 8h.01M18 8h.01M6 12h.01M10 12h.01M14 12h.01M18 12h.01M8 16h8" />
              </svg>
            </button>
            <input
              ref={inputRef}
              type="text"
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              disabled={result !== null}
              placeholder="Type Korean here..."
              className="flex-1 px-4 py-3 text-lg text-center font-korean bg-goshiwon-input border border-goshiwon-border rounded-lg text-goshiwon-text placeholder:text-goshiwon-text-muted/50 focus:outline-none focus:border-goshiwon-yellow/50 disabled:opacity-60 min-h-[44px]"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              lang="ko"
              aria-label="Write Korean word"
            />
          </div>

          {/* Result feedback */}
          {result !== null && currentWord && (
            <div className={`text-center p-3 rounded-lg border ${
              result === "exact"
                ? "bg-emerald-500/10 border-emerald-500/30"
                : result === "close"
                ? "bg-amber-400/10 border-amber-400/30"
                : "bg-red-400/10 border-red-400/30"
            }`}>
              {result === "exact" && (
                <p className="text-emerald-400 text-sm font-medium">Correct!</p>
              )}
              {result === "close" && (
                <>
                  <p className="text-amber-400 text-sm font-medium">Close!</p>
                  <p className="text-goshiwon-text text-sm font-korean mt-1">
                    {currentWord.korean}
                  </p>
                </>
              )}
              {result === "wrong" && (
                <>
                  <p className="text-red-400 text-sm font-medium">Incorrect</p>
                  <p className="text-goshiwon-text text-sm font-korean mt-1">
                    {currentWord.korean}
                  </p>
                </>
              )}
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex gap-2">
          {result === null ? (
            <>
              <button
                onClick={handleSkip}
                className="flex-1 py-3 px-4 text-sm font-medium rounded-lg bg-goshiwon-surface text-goshiwon-text-muted border border-goshiwon-border hover:bg-goshiwon-surface-hover transition-colors min-h-[44px]"
              >
                Skip (Tab)
              </button>
              <button
                onClick={handleSubmit}
                disabled={!userInput.trim()}
                className="flex-1 py-3 px-4 text-sm font-medium rounded-lg bg-goshiwon-yellow/20 text-goshiwon-yellow border border-goshiwon-yellow/30 hover:bg-goshiwon-yellow/30 transition-colors disabled:opacity-40 disabled:cursor-not-allowed min-h-[44px]"
              >
                Check (Enter)
              </button>
            </>
          ) : (
            <button
              onClick={handleNext}
              className="flex-1 py-3 px-4 text-sm font-medium rounded-lg bg-goshiwon-yellow/20 text-goshiwon-yellow border border-goshiwon-yellow/30 hover:bg-goshiwon-yellow/30 transition-colors min-h-[44px]"
            >
              {currentIndex < deck.length - 1 ? "Next (Enter)" : "See Results (Enter)"}
            </button>
          )}
        </div>
      </div>

      {/* Korean keyboard — hidden during feedback and completion */}
      {result === null && (
        <HangulKeyboard
          onInput={handleKeyboardInput}
          onDeleteChar={handleKeyboardDelete}
          onSubmit={handleEnterAction}
          visible={keyboardVisible}
        />
      )}
    </Modal>
  );
}
