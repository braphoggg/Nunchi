"use client";

import type { SavedConversation } from "@/types";
import { formatMessage } from "@/lib/format-message";

interface LessonReviewProps {
  conversation: SavedConversation;
  onClose: () => void;
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export default function LessonReview({
  conversation,
  onClose,
}: LessonReviewProps) {
  return (
    <div className="absolute inset-0 z-50 bg-goshiwon-bg/95 backdrop-blur-sm flex flex-col animate-vocab-panel-in">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-goshiwon-border">
        <button
          onClick={onClose}
          aria-label="Back to history"
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
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <div className="flex-1 min-w-0">
          <h2 className="text-sm font-medium text-goshiwon-text">
            Lesson Review
          </h2>
          <p className="text-[10px] text-goshiwon-text-muted truncate">
            {formatDate(conversation.savedAt)} · {conversation.messageCount} messages
          </p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {conversation.messages.map((msg, i) => {
          const isAssistant = msg.role === "assistant";
          return (
            <div
              key={i}
              className={`flex ${isAssistant ? "justify-start" : "justify-end"}`}
            >
              <div
                className={`max-w-[85%] ${
                  isAssistant ? "items-start" : "items-end"
                }`}
              >
                <div
                  className={`${
                    isAssistant
                      ? "bg-goshiwon-surface border-l-2 border-goshiwon-accent rounded-tr-lg rounded-br-lg rounded-bl-lg rounded-tl-sm"
                      : "bg-goshiwon-user-bubble rounded-tl-lg rounded-bl-lg rounded-br-lg rounded-tr-sm"
                  }`}
                >
                  {isAssistant && (
                    <div className="px-4 pt-3 pb-0">
                      <span className="text-[10px] text-goshiwon-text-muted uppercase tracking-wider">
                        서문조
                      </span>
                    </div>
                  )}
                  <div
                    className={`px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                      isAssistant ? "pt-1.5" : ""
                    }`}
                  >
                    {isAssistant ? formatMessage(msg.text) : msg.text}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
