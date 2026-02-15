"use client";

import type { VocabularyItem } from "@/types";

interface VocabularyPanelProps {
  words: VocabularyItem[];
  onRemoveWord: (id: string) => void;
  onClose: () => void;
}

export default function VocabularyPanel({
  words,
  onRemoveWord,
  onClose,
}: VocabularyPanelProps) {
  const sortedWords = [...words].sort(
    (a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime()
  );

  return (
    <div className="absolute inset-0 z-10 bg-goshiwon-bg/95 backdrop-blur-sm flex flex-col animate-vocab-panel-in">
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
                <p className="text-goshiwon-text-secondary text-xs mt-0.5">
                  {word.english}
                </p>
              </div>
              <button
                onClick={() => onRemoveWord(word.id)}
                aria-label={`Remove ${word.korean}`}
                className="p-1 text-goshiwon-text-muted hover:text-goshiwon-accent-light transition-colors opacity-0 group-hover:opacity-100 shrink-0"
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
          ))
        )}
      </div>
    </div>
  );
}
