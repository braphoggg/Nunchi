"use client";

import type { SavedConversation } from "@/types";
import { formatMessage } from "@/lib/format-message";
import Modal from "./Modal";

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
    <Modal
      onClose={onClose}
      title="Lesson Review"
      subtitle={`${formatDate(conversation.savedAt)} · ${conversation.messageCount} messages`}
      backButton
      closeAriaLabel="Back to history"
    >
      {/* Messages */}
      <div className="p-4 space-y-3">
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
                      <span className="text-xs text-goshiwon-text-muted uppercase tracking-wider">
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
    </Modal>
  );
}
