"use client";

import type { GoshiwonEvent } from "@/lib/goshiwon-events";

interface GoshiwonEventBubbleProps {
  event: GoshiwonEvent;
  onDismiss: () => void;
}

/**
 * Atmospheric event bubble — displays environmental narration
 * centered in the chat, styled as italic system text.
 * Tap to dismiss.
 */
export default function GoshiwonEventBubble({
  event,
  onDismiss,
}: GoshiwonEventBubbleProps) {
  return (
    <div
      onClick={onDismiss}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onDismiss();
        }
      }}
      role="button"
      tabIndex={0}
      aria-label="Dismiss event"
      className="flex justify-center my-3 animate-message-in cursor-pointer"
    >
      <div className="max-w-[80%] text-center px-4 py-3 rounded-lg bg-goshiwon-surface/50 border border-goshiwon-border/50">
        <p className="text-sm italic text-[#d4a843] leading-relaxed">
          {event.korean}
        </p>
        <p className="text-[10px] text-goshiwon-text-muted mt-1">
          {event.english}
        </p>
      </div>
    </div>
  );
}
