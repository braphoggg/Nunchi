"use client";

import { useState, useEffect, useCallback, useRef, useMemo, memo } from "react";
import type { VocabularyItem } from "@/types";
import { generateQuiz, MIN_QUIZ_WORDS, type QuizQuestion, type QuizResult } from "@/lib/quiz-generator";
import Modal from "./Modal";
import { useSound } from "@/contexts/SoundContext";

interface QuizModeProps {
  words: VocabularyItem[];
  onClose: () => void;
  onQuizComplete?: (result: QuizResult) => void;
}

/** Moon-jo quiz feedback based on score */
function getMoonjoQuizFeedback(pct: number): { korean: string; english: string } {
  if (pct === 100) {
    return {
      korean: "완벽해요... 역시 제가 고른 사람이에요.",
      english: "Perfect... As expected of someone I chose.",
    };
  }
  if (pct >= 70) {
    return {
      korean: "잘했어요. 하지만 더 잘할 수 있잖아요?",
      english: "Well done. But you can do better, can't you?",
    };
  }
  if (pct >= 40) {
    return {
      korean: "아직 멀었어요... 더 연습하세요. 저는 인내심이 많아요.",
      english: "Still far off... Practice more. I'm very patient.",
    };
  }
  return {
    korean: "실망이에요... 다시 해보세요. 도망칠 수 없어요.",
    english: "Disappointing... Try again. You can't escape.",
  };
}

function QuizMode({
  words,
  onClose,
  onQuizComplete,
}: QuizModeProps) {
  const sound = useSound();
  const studyable = useMemo(() => words.filter((w) => w.english?.trim()), [words]);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [answered, setAnswered] = useState(false);
  const [answers, setAnswers] = useState<Map<string, boolean>>(new Map());
  const [isComplete, setIsComplete] = useState(false);
  const completionReported = useRef(false);

  // Generate quiz on mount
  useEffect(() => {
    if (studyable.length >= MIN_QUIZ_WORDS) {
      setQuestions(generateQuiz(studyable, 10));
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const currentQuestion = questions[currentIndex] ?? null;

  const result: QuizResult = useMemo(() => {
    const correct = [...answers.values()].filter(Boolean).length;
    return {
      total: answers.size,
      correct,
      wrong: answers.size - correct,
      answers,
    };
  }, [answers]);

  // Fire completion callback once
  useEffect(() => {
    if (isComplete && !completionReported.current) {
      completionReported.current = true;
      sound.playSessionComplete();
      onQuizComplete?.(result);
    }
  }, [isComplete, result, onQuizComplete, sound]);

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
      if (isCorrect) {
        sound.playWordSaved();
      } else {
        sound.playFlashcardGrade("again");
      }
    },
    [answered, currentQuestion, sound],
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
    setQuestions(generateQuiz(studyable, 10));
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
      <Modal title="Quiz" backButton onClose={onClose} zIndex={10} closeAriaLabel="Back to vocabulary">
        <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
          <p className="text-goshiwon-text-secondary text-sm">
            Not enough words for a quiz.
          </p>
          <p className="text-goshiwon-text-muted text-xs mt-1">
            Save at least {MIN_QUIZ_WORDS} vocabulary words with translations to start a quiz.
          </p>
        </div>
      </Modal>
    );
  }

  // Summary screen
  if (isComplete) {
    const pct = result.total > 0 ? Math.round((result.correct / result.total) * 100) : 0;
    const feedback = getMoonjoQuizFeedback(pct);

    return (
      <Modal title="Quiz Complete" onClose={onClose} zIndex={10}>
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
              <span className="text-xs text-goshiwon-text-muted">{result.correct}/{result.total}</span>
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
              aria-label="Take quiz again"
              className="px-4 py-2 text-xs font-medium rounded-lg bg-goshiwon-accent/20 text-goshiwon-accent-light border border-goshiwon-accent/40 hover:bg-goshiwon-accent/30 transition-colors"
            >
              Try Again
            </button>
            <button
              onClick={onClose}
              aria-label="Done with quiz"
              className="px-4 py-2 text-xs font-medium rounded-lg bg-goshiwon-surface text-goshiwon-text border border-goshiwon-border hover:bg-goshiwon-surface-hover transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      </Modal>
    );
  }

  // Quiz question screen
  const quizHeader = (
    <div className="flex items-center justify-between px-4 py-3 border-b border-goshiwon-border">
      <button
        onClick={onClose}
        aria-label="Exit quiz"
        className="min-h-[44px] min-w-[44px] flex items-center justify-center text-goshiwon-text-muted hover:text-goshiwon-text transition-colors"
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15 18 9 12 15 6" />
        </svg>
      </button>
      <span className="text-xs text-goshiwon-text-muted">
        {currentIndex + 1} / {questions.length}
      </span>
      <div className="w-[44px]" />
    </div>
  );

  return (
    <Modal title="Quiz" onClose={onClose} zIndex={10} customHeader={quizHeader} closeAriaLabel="Exit quiz">
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
            <span className="text-xs text-goshiwon-text-muted uppercase tracking-wider">
              {currentQuestion.type === "korean_to_english"
                ? "Korean \u2192 English"
                : "English \u2192 Korean"}
            </span>
          </div>

          {/* Prompt */}
          <div className="text-center mb-8">
            <span className={`text-2xl font-bold leading-relaxed ${
              currentQuestion.type === "korean_to_english"
                ? "text-[#d4a843]"
                : "text-goshiwon-text"
            }`}>
              {currentQuestion.prompt}
            </span>
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
                    <span className="w-6 h-6 flex items-center justify-center rounded-full border border-current/50 text-xs font-medium shrink-0 opacity-80">
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
                <span className="ml-1 opacity-40 text-xs">Enter</span>
              </button>
            </div>
          )}

          {/* Hint at bottom */}
          {!answered && (
            <p className="mt-auto text-center text-xs text-goshiwon-text-muted">
              press 1-{currentQuestion.options.length} to select
            </p>
          )}
        </div>
      )}
    </Modal>
  );
}

export default memo(QuizMode);
