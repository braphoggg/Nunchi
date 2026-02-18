"use client";

import type { SavedConversation } from "@/types";

interface LessonHistoryProps {
  conversations: SavedConversation[];
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export default function LessonHistory({
  conversations,
  onSelect,
  onDelete,
  onClose,
}: LessonHistoryProps) {
  return (
    <div className="absolute inset-0 z-50 bg-goshiwon-bg/95 backdrop-blur-sm flex flex-col animate-vocab-panel-in">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-goshiwon-border">
        <div>
          <h2 className="text-sm font-medium text-goshiwon-text">
            수업 기록
          </h2>
          <p className="text-[10px] text-goshiwon-text-muted">
            Lesson History{conversations.length > 0 && ` — ${conversations.length} saved`}
          </p>
        </div>
        <button
          onClick={onClose}
          aria-label="Close history"
          className="p-1.5 text-goshiwon-text-muted hover:text-goshiwon-text transition-colors"
        >
          <svg
            className="w-4 h-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <svg
              className="w-8 h-8 text-goshiwon-text-muted mb-3"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            <p className="text-sm text-goshiwon-text-secondary">
              No saved lessons yet
            </p>
            <p className="text-xs text-goshiwon-text-muted mt-1">
              Conversations are saved when you leave the room.
            </p>
          </div>
        ) : (
          conversations.map((c) => (
            <div
              key={c.id}
              role="button"
              tabIndex={0}
              onClick={() => onSelect(c.id)}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSelect(c.id); } }}
              className="w-full text-left group bg-goshiwon-surface border border-goshiwon-border rounded-lg p-3 hover:bg-goshiwon-surface-hover transition-colors cursor-pointer"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-goshiwon-text-muted mb-1">
                    {formatDate(c.savedAt)}
                  </p>
                  <p className="text-sm text-goshiwon-text truncate leading-snug">
                    {c.preview || "..."}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[10px] text-goshiwon-text-muted bg-goshiwon-bg rounded-full px-2 py-0.5">
                    {c.messageCount} msgs
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(c.id);
                    }}
                    aria-label="Delete conversation"
                    className="p-1 text-goshiwon-text-muted hover:text-goshiwon-accent-light transition-colors opacity-0 group-hover:opacity-100"
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
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
                      <path d="M10 11v6M14 11v6" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
