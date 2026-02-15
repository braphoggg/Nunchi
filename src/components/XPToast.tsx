"use client";

import type { XPAction } from "@/types";

const ACTION_LABELS: Record<XPAction, string> = {
  message_korean: "Korean message",
  message_full_korean: "Full Korean",
  flashcard_session: "Flashcards",
  flashcard_perfect: "Perfect session",
  word_saved: "Words saved",
  no_translate: "No translate",
};

interface XPToastProps {
  amount: number;
  action: XPAction;
}

export default function XPToast({ amount, action }: XPToastProps) {
  return (
    <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-50 pointer-events-none animate-xp-toast">
      <div className="bg-goshiwon-surface border border-goshiwon-border rounded-lg px-3 py-1.5 shadow-lg flex items-center gap-2">
        <span className="text-goshiwon-yellow font-bold text-sm">
          +{amount} XP
        </span>
        <span className="text-goshiwon-text-muted text-xs">
          {ACTION_LABELS[action]}
        </span>
      </div>
    </div>
  );
}
