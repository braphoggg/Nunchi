"use client";

import Modal from "./Modal";

interface LessonCompleteProps {
  topicTitle: string;
  topicTitleKr: string;
  wordsLearned: number;
  xpEarned: number;
  currentStreak: number;
  onReviewVocabulary: () => void;
  onReturnHome: () => void;
}

export default function LessonComplete({
  topicTitle,
  topicTitleKr,
  wordsLearned,
  xpEarned,
  currentStreak,
  onReviewVocabulary,
  onReturnHome,
}: LessonCompleteProps) {
  return (
    <Modal
      onClose={onReturnHome}
      title="Lesson Complete"
      stickyHeader
      closeAriaLabel="Return to home"
    >
      <div className="p-6 space-y-6">
        {/* Topic completed */}
        <div className="text-center space-y-2">
          <div className="w-16 h-16 mx-auto flex items-center justify-center rounded-full bg-goshiwon-yellow/10 border border-goshiwon-yellow/30">
            <span className="text-3xl">✓</span>
          </div>
          <p className="text-goshiwon-yellow text-lg font-medium font-korean">
            {topicTitleKr}
          </p>
          <p className="text-goshiwon-text text-sm">
            {topicTitle}
          </p>
          <p className="text-goshiwon-text-secondary text-xs italic">
            &ldquo;잘 했어요... 다음에 또 만나요.&rdquo;
          </p>
          <p className="text-goshiwon-text-muted text-xs italic">
            Well done... See you next time.
          </p>
        </div>

        {/* Session stats */}
        <div className="bg-goshiwon-surface rounded-lg p-4 border border-goshiwon-border space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-goshiwon-text-secondary text-xs flex items-center gap-1.5">
              <span>📝</span> Words saved
            </span>
            <span className="text-goshiwon-yellow font-bold">{wordsLearned}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-goshiwon-text-secondary text-xs flex items-center gap-1.5">
              <span>⚡</span> XP earned
            </span>
            <span className="text-goshiwon-yellow font-bold">+{xpEarned}</span>
          </div>
          {currentStreak > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-goshiwon-text-secondary text-xs flex items-center gap-1.5">
                <span>🔥</span> Current streak
              </span>
              <span className="text-goshiwon-yellow font-bold">
                {currentStreak} {currentStreak === 1 ? "day" : "days"}
              </span>
            </div>
          )}
        </div>

        {/* CTAs */}
        <div className="space-y-2">
          {wordsLearned > 0 && (
            <button
              onClick={onReviewVocabulary}
              className="w-full py-3 px-4 text-sm font-medium rounded-lg bg-goshiwon-yellow/20 text-goshiwon-yellow border border-goshiwon-yellow/30 hover:bg-goshiwon-yellow/30 transition-colors min-h-[44px]"
            >
              Review Vocabulary
            </button>
          )}
          <button
            onClick={onReturnHome}
            className="w-full py-3 px-4 text-sm font-medium rounded-lg bg-goshiwon-surface text-goshiwon-text-secondary border border-goshiwon-border hover:bg-goshiwon-surface-hover transition-colors min-h-[44px]"
          >
            Return Home
          </button>
        </div>
      </div>
    </Modal>
  );
}
