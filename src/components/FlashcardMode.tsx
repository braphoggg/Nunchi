"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import type { VocabularyItem } from "@/types";
import type { FlashcardSummary } from "@/hooks/useFlashcards";
import { generateQuiz, MIN_QUIZ_WORDS, type QuizQuestion } from "@/lib/quiz-generator";

interface FlashcardModeProps {
  words: VocabularyItem[];
  onClose: () => void;
  onSessionComplete?: (summary: FlashcardSummary) => void;
  onWordGraded?: (wordId: string, grade: "again" | "good" | "easy") => void;
  onCorrectSound?: () => void;
  onWrongSound?: () => void;
  onCompleteSound?: () => void;
}

/** Moon-jo study feedback based on score percentage */
function getMoonjoFeedback(pct: number): { korean: string; english: string } {
  if (pct === 100) {
    return {
      korean: "완벽하군요... 이 방은 당신에게 꼭 맞아요.",
      english: "Perfect... This room suits you perfectly. Forever.",
    };
  }
  if (pct >= 70) {
    return {
      korean: "잘했어요. 하지만 이 복도에서 실수는 오래 기억돼요.",
      english: "Well done. But mistakes linger long in this hallway.",
    };
  }
  if (pct >= 40) {
    return {
      korean: "아직 부족해요... 걱정 마세요. 여기서 나갈 수 없으니까.",
      english: "Still not enough... But don't worry. You can't leave here anyway.",
    };
  }
  return {
    korean: "실망이에요... 다시 하세요. 시간은 많아요. 아주 많아요.",
    english: "Disappointing... Try again. There's plenty of time. Plenty.",
  };
}

export default function FlashcardMode({
  words,
  onClose,
  onSessionComplete,
  onWordGraded,
  onCorrectSound,
  onWrongSound,
  onCompleteSound,
}: FlashcardModeProps) {
  const studyable = useMemo(() => words.filter((w) => w.english?.trim()), [words]);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [answered, setAnswered] = useState(false);
  const [answers, setAnswers] = useState<Map<string, boolean>>(new Map());
  const [isComplete, setIsComplete] = useState(false);
  const completionReported = useRef(false);

  // TTS state
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Generate quiz on mount — all Korean→English, using all words
  useEffect(() => {
    if (studyable.length >= MIN_QUIZ_WORDS) {
      setQuestions(generateQuiz(studyable, studyable.length, "korean_to_english"));
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const currentQuestion = questions[currentIndex] ?? null;

  // Compute results
  const result = useMemo(() => {
    const correct = [...answers.values()].filter(Boolean).length;
    return {
      total: answers.size,
      correct,
      wrong: answers.size - correct,
    };
  }, [answers]);

  // Fire completion callback once
  useEffect(() => {
    if (isComplete && !completionReported.current) {
      completionReported.current = true;
      onCompleteSound?.();
      // Map to FlashcardSummary: correct→good, wrong→again, easy=0
      const summary: FlashcardSummary = {
        again: result.wrong,
        good: result.correct,
        easy: 0,
        total: questions.length,
      };
      onSessionComplete?.(summary);
    }
  }, [isComplete, result, questions.length, onSessionComplete, onCompleteSound]);

  // Cancel speech on unmount
  useEffect(() => {
    return () => {
      if (typeof speechSynthesis !== "undefined") {
        speechSynthesis.cancel();
      }
    };
  }, []);

  // Cancel speech when question changes
  useEffect(() => {
    if (typeof speechSynthesis !== "undefined") {
      speechSynthesis.cancel();
    }
    setIsSpeaking(false);
  }, [currentIndex]);

  const handleSpeak = useCallback(() => {
    if (!currentQuestion) return;
    if (isSpeaking) {
      speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }
    speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(currentQuestion.prompt);
    utterance.lang = "ko-KR";
    utterance.rate = 0.9;
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    speechSynthesis.speak(utterance);
    setIsSpeaking(true);
  }, [isSpeaking, currentQuestion]);

  const handleSelect = useCallback(
    (option: string) => {
      if (answered || !currentQuestion) return;
      setSelectedOption(option);
      setAnswered(true);
      const isCorrect = option === currentQuestion.correctAnswer;
      setAnswers((prev) => {
        const next = new Map(prev);
        next.set(currentQuestion.id, isCorrect);
        return next;
      });
      // SRS update
      onWordGraded?.(currentQuestion.wordId, isCorrect ? "good" : "again");
      // Sound feedback
      if (isCorrect) {
        onCorrectSound?.();
      } else {
        onWrongSound?.();
      }
    },
    [answered, currentQuestion, onCorrectSound, onWrongSound, onWordGraded],
  );

  const handleNext = useCallback(() => {
    if (currentIndex >= questions.length - 1) {
      setIsComplete(true);
    } else {
      setCurrentIndex((i) => i + 1);
      setSelectedOption(null);
      setAnswered(false);
    }
  }, [currentIndex, questions.length]);

  const handleRestart = useCallback(() => {
    setQuestions(generateQuiz(studyable, studyable.length, "korean_to_english"));
    setCurrentIndex(0);
    setSelectedOption(null);
    setAnswered(false);
    setAnswers(new Map());
    setIsComplete(false);
    completionReported.current = false;
  }, [studyable]);

  // Keyboard shortcuts: 1-4 select options, Enter/Space advance
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (isComplete) return;
      if (!currentQuestion) return;

      if (!answered) {
        const num = parseInt(e.key, 10);
        if (num >= 1 && num <= currentQuestion.options.length) {
          e.preventDefault();
          handleSelect(currentQuestion.options[num - 1]);
        }
      } else {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleNext();
        }
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isComplete, answered, currentQuestion, handleSelect, handleNext]);

  // Not enough words
  if (studyable.length < MIN_QUIZ_WORDS) {
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
            Save at least {MIN_QUIZ_WORDS} vocabulary words with translations to start studying.
          </p>
        </div>
      </div>
    );
  }

  // Summary screen
  if (isComplete) {
    const pct = result.total > 0 ? Math.round((result.correct / result.total) * 100) : 0;
    const feedback = getMoonjoFeedback(pct);

    return (
      <div className="absolute inset-0 z-10 bg-goshiwon-bg/95 backdrop-blur-sm flex flex-col animate-vocab-panel-in">
        <div className="flex items-center px-4 py-3 border-b border-goshiwon-border">
          <h2 className="text-sm font-medium text-goshiwon-text">Study Complete</h2>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center px-6 animate-summary-in">
          {/* Score circle */}
          <div className="relative w-24 h-24 mb-6">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
              <circle
                cx="18" cy="18" r="15.5"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="text-goshiwon-border"
              />
              <circle
                cx="18" cy="18" r="15.5"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeDasharray={`${pct} ${100 - pct}`}
                strokeLinecap="round"
                className={pct === 100 ? "text-goshiwon-yellow" : pct >= 70 ? "text-emerald-400" : pct >= 40 ? "text-amber-400" : "text-goshiwon-accent-light"}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-xl font-bold text-goshiwon-text">{pct}%</span>
              <span className="text-[9px] text-goshiwon-text-muted">{result.correct}/{result.total}</span>
            </div>
          </div>

          {/* Score breakdown */}
          <div className="w-full max-w-xs space-y-2 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                <span className="text-sm text-goshiwon-text">Correct</span>
              </div>
              <span className="text-sm font-medium text-goshiwon-text" data-testid="correct-count">
                {result.correct}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-goshiwon-accent" />
                <span className="text-sm text-goshiwon-text">Wrong</span>
              </div>
              <span className="text-sm font-medium text-goshiwon-text" data-testid="wrong-count">
                {result.wrong}
              </span>
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
              onClick={handleRestart}
              aria-label="Study again"
              className="px-4 py-2 text-xs font-medium rounded-lg bg-goshiwon-accent/20 text-goshiwon-accent-light border border-goshiwon-accent/40 hover:bg-goshiwon-accent/30 transition-colors"
            >
              Study Again
            </button>
            <button
              onClick={onClose}
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

  // Study question screen
  return (
    <div className="absolute inset-0 z-10 bg-goshiwon-bg/95 backdrop-blur-sm flex flex-col animate-vocab-panel-in">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-goshiwon-border">
        <button
          onClick={onClose}
          aria-label="Back to vocabulary"
          className="p-1.5 text-goshiwon-text-muted hover:text-goshiwon-text transition-colors"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <span className="text-xs text-goshiwon-text-muted">
          {currentIndex + 1} / {questions.length}
        </span>
        <div className="w-7" />
      </div>

      {/* Progress bar */}
      <div className="h-0.5 bg-goshiwon-border">
        <div
          className="h-full bg-goshiwon-yellow transition-all duration-300 ease-out"
          style={{ width: `${questions.length > 0 ? ((currentIndex + 1) / questions.length) * 100 : 0}%` }}
          role="progressbar"
          aria-valuenow={currentIndex + 1}
          aria-valuemin={1}
          aria-valuemax={questions.length}
        />
      </div>

      {/* Question area */}
      {currentQuestion && (
        <div className="flex-1 flex flex-col px-6 pt-8 pb-4">
          {/* Question type badge */}
          <div className="text-center mb-2">
            <span className="text-[10px] text-goshiwon-text-muted uppercase tracking-wider">
              Korean → English
            </span>
          </div>

          {/* Korean prompt */}
          <div className="text-center mb-2">
            <span className="text-[#d4a843] text-2xl font-bold leading-relaxed">
              {currentQuestion.prompt}
            </span>
          </div>

          {/* TTS speaker button */}
          <div className="text-center mb-6">
            <button
              onClick={handleSpeak}
              aria-label={isSpeaking ? "Stop listening" : "Listen to pronunciation"}
              className="p-1.5 text-goshiwon-text-muted hover:text-goshiwon-text transition-colors rounded-full"
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
          </div>

          {/* Options */}
          <div className="space-y-2 max-w-sm mx-auto w-full">
            {currentQuestion.options.map((option, idx) => {
              const isSelected = selectedOption === option;
              const isCorrect = option === currentQuestion.correctAnswer;
              let optionClass = "bg-goshiwon-surface border-goshiwon-border hover:border-goshiwon-yellow/50 hover:bg-goshiwon-surface-hover";

              if (answered) {
                if (isCorrect) {
                  optionClass = "bg-emerald-400/10 border-emerald-400/40 text-emerald-300";
                } else if (isSelected && !isCorrect) {
                  optionClass = "bg-goshiwon-accent/15 border-goshiwon-accent/40 text-goshiwon-accent-light";
                } else {
                  optionClass = "bg-goshiwon-surface/50 border-goshiwon-border/50 opacity-50";
                }
              }

              return (
                <button
                  key={`${currentQuestion.id}-${idx}`}
                  onClick={() => handleSelect(option)}
                  disabled={answered}
                  aria-label={`Option ${idx + 1}: ${option}`}
                  className={`w-full text-left px-4 py-3 rounded-lg border transition-all duration-200 ${optionClass} disabled:cursor-default`}
                >
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 flex items-center justify-center rounded-full border border-current/30 text-xs font-medium shrink-0 opacity-60">
                      {idx + 1}
                    </span>
                    <span className={`text-sm ${answered && isCorrect ? "font-medium" : ""} ${!answered ? "text-goshiwon-text" : ""}`}>
                      {option}
                    </span>
                    {answered && isCorrect && (
                      <svg className="w-4 h-4 ml-auto text-emerald-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                    {answered && isSelected && !isCorrect && (
                      <svg className="w-4 h-4 ml-auto text-goshiwon-accent-light shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Next / Continue button */}
          {answered && (
            <div className="mt-6 text-center animate-message-in">
              <button
                onClick={handleNext}
                className="px-6 py-2 text-xs font-medium rounded-lg bg-goshiwon-yellow/15 text-[#d4a843] border border-goshiwon-yellow/30 hover:bg-goshiwon-yellow/25 transition-colors"
              >
                {currentIndex >= questions.length - 1 ? "See Results" : "Next"}
                <span className="ml-1 opacity-40 text-[10px]">Enter</span>
              </button>
            </div>
          )}

          {/* Hint at bottom */}
          {!answered && (
            <p className="mt-auto text-center text-[10px] text-goshiwon-text-muted">
              press 1-{currentQuestion.options.length} to select
            </p>
          )}
        </div>
      )}
    </div>
  );
}
