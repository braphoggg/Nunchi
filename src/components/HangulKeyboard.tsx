"use client";

import { useState, useCallback, useRef, useImperativeHandle, forwardRef } from "react";
import {
  createCompositionState,
  feedJamo,
  feedBackspace,
  getDisplayText,
  commitAll,
  type CompositionState,
} from "@/lib/hangul-compose";
import { useSound } from "@/contexts/SoundContext";

export interface HangulKeyboardHandle {
  /** Flush any in-progress composition to the parent input and reset keyboard state */
  flushComposition: () => void;
}

interface HangulKeyboardProps {
  /** Called with committed text to insert into the input */
  onInput: (text: string) => void;
  /** Called when the keyboard needs to delete one character from the parent input */
  onDeleteChar?: () => void;
  /** Called when Enter is pressed on the keyboard */
  onSubmit: () => void;
  visible: boolean;
}

// Standard Korean 2-set (두벌식) keyboard layout
const ROWS_NORMAL = [
  ["ㅂ","ㅈ","ㄷ","ㄱ","ㅅ","ㅛ","ㅕ","ㅑ","ㅐ","ㅔ"],
  ["ㅁ","ㄴ","ㅇ","ㄹ","ㅎ","ㅗ","ㅓ","ㅏ","ㅣ"],
  ["ㅋ","ㅌ","ㅊ","ㅍ","ㅠ","ㅜ","ㅡ"],
];

const ROWS_SHIFT = [
  ["ㅃ","ㅉ","ㄸ","ㄲ","ㅆ","ㅛ","ㅕ","ㅑ","ㅒ","ㅖ"],
  ["ㅁ","ㄴ","ㅇ","ㄹ","ㅎ","ㅗ","ㅓ","ㅏ","ㅣ"],
  ["ㅋ","ㅌ","ㅊ","ㅍ","ㅠ","ㅜ","ㅡ"],
];

const HangulKeyboard = forwardRef<HangulKeyboardHandle, HangulKeyboardProps>(function HangulKeyboard({ onInput, onDeleteChar, onSubmit, visible }, ref) {
  const sound = useSound();
  const [shifted, setShifted] = useState(false);
  // Use a ref for composition state to avoid React strict mode double-invocation
  // of setState callbacks causing duplicate side effects (onInput called twice).
  const compRef = useRef<CompositionState>(createCompositionState());
  const prevCommittedLenRef = useRef(0);
  // Trigger re-render when composition changes (for preview display)
  const [, setTick] = useState(0);
  const rerender = useCallback(() => setTick((t) => t + 1), []);

  const rows = shifted ? ROWS_SHIFT : ROWS_NORMAL;

  const handleKey = useCallback((jamo: string) => {
    sound.playJamoPress();
    const prev = compRef.current;
    const next = feedJamo(prev, jamo);
    compRef.current = next;

    // Emit any newly committed characters
    if (next.committed.length > prevCommittedLenRef.current) {
      const delta = next.committed.slice(prevCommittedLenRef.current);
      onInput(delta);
    }
    prevCommittedLenRef.current = next.committed.length;

    rerender();
    if (shifted) setShifted(false);
  }, [shifted, onInput, rerender, sound]);

  const handleBackspace = useCallback(() => {
    sound.playSpecialKey("backspace");
    const prev = compRef.current;
    const next = feedBackspace(prev);
    compRef.current = next;
    prevCommittedLenRef.current = next.committed.length;

    // Propagate a deletion to the parent in two cases:
    // 1. A previously-committed char was removed from our tracked buffer
    // 2. Nothing left in keyboard state (pass-through) — parent owns the remaining chars
    if (
      next.committed.length < prev.committed.length ||
      (!prev.composing && prev.committed.length === 0)
    ) {
      onDeleteChar?.();
    }

    rerender();
  }, [rerender, onDeleteChar, sound]);

  const handleSpace = useCallback(() => {
    sound.playSpecialKey("space");
    const prev = compRef.current;
    const text = commitAll(prev);

    if (text.length > prevCommittedLenRef.current) {
      const newText = text.slice(prevCommittedLenRef.current);
      onInput(newText + " ");
    } else {
      onInput(" ");
    }

    compRef.current = createCompositionState();
    prevCommittedLenRef.current = 0;
    setShifted(false);
    rerender();
  }, [onInput, rerender, sound]);

  /** Flush any in-progress composition to the parent input and reset state */
  const flushComposition = useCallback(() => {
    const prev = compRef.current;
    if (!prev.composing && prev.committed.length === 0) return;
    const text = commitAll(prev);
    if (text.length > prevCommittedLenRef.current) {
      onInput(text.slice(prevCommittedLenRef.current));
    }
    compRef.current = createCompositionState();
    prevCommittedLenRef.current = 0;
    rerender();
  }, [onInput, rerender]);

  // Expose flushComposition to parent via ref
  useImperativeHandle(ref, () => ({ flushComposition }), [flushComposition]);

  const handleCommitComposing = useCallback(() => {
    const prev = compRef.current;
    if (!prev.composing) return;
    flushComposition();
  }, [flushComposition]);

  const handleEnter = useCallback(() => {
    sound.playSpecialKey("enter");
    flushComposition();
    setShifted(false);

    // Delay submit slightly so onInput state update fires first
    setTimeout(onSubmit, 10);
  }, [flushComposition, onSubmit, sound]);

  // Get the currently composing character for preview
  const comp = compRef.current;
  const displayText = getDisplayText(comp);
  const composingChar = displayText.slice(comp.committed.length);

  if (!visible) return null;

  return (
    <div data-tutorial="hangul-keyboard" className="border-t border-goshiwon-border bg-goshiwon-surface/98 backdrop-blur-sm px-2 py-2 animate-keyboard-in">
      {/* Composing preview — tap to commit */}
      {composingChar && (
        <div className="text-center mb-1.5">
          <button
            onClick={handleCommitComposing}
            className="inline-block px-4 py-2 min-h-[44px] text-sm text-goshiwon-yellow bg-goshiwon-bg rounded border border-goshiwon-yellow/40 hover:bg-goshiwon-yellow/10 active:bg-goshiwon-yellow/20 transition-colors focus-visible:ring-2 focus-visible:ring-goshiwon-yellow/60 focus-visible:outline-none"
            title="Tap to complete"
            aria-label={`Commit composing character: ${composingChar}`}
          >
            {composingChar}
          </button>
        </div>
      )}

      {/* Key rows */}
      {rows.map((row, rowIdx) => (
        <div key={rowIdx} className="flex justify-center gap-1 mb-1">
          {/* Shift key on row 3 */}
          {rowIdx === 2 && (
            <button
              onClick={() => { sound.playSpecialKey("shift"); setShifted((s) => !s); }}
              aria-label={shifted ? "Shift on" : "Shift"}
              aria-pressed={shifted}
              className={`min-w-[40px] h-11 rounded text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:ring-goshiwon-yellow/60 focus-visible:outline-none ${
                shifted
                  ? "bg-goshiwon-yellow/20 text-goshiwon-yellow border border-goshiwon-yellow/40"
                  : "bg-goshiwon-bg border border-goshiwon-border text-goshiwon-text-muted hover:text-goshiwon-text"
              }`}
            >
              ⇧
            </button>
          )}

          {row.map((key) => (
            <button
              key={key}
              onClick={() => handleKey(key)}
              aria-label={key}
              className="min-w-[32px] h-11 rounded bg-goshiwon-bg border border-goshiwon-border text-goshiwon-text text-sm font-medium hover:bg-goshiwon-surface-hover active:bg-goshiwon-accent/20 transition-colors focus-visible:ring-2 focus-visible:ring-goshiwon-yellow/60 focus-visible:outline-none"
            >
              {key}
            </button>
          ))}

          {/* Backspace on row 3 */}
          {rowIdx === 2 && (
            <button
              onClick={handleBackspace}
              aria-label="Backspace"
              className="min-w-[40px] h-11 rounded bg-goshiwon-bg border border-goshiwon-border text-goshiwon-text-muted hover:text-goshiwon-text transition-colors flex items-center justify-center focus-visible:ring-2 focus-visible:ring-goshiwon-yellow/60 focus-visible:outline-none"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 4H8l-7 8 7 8h13a2 2 0 002-2V6a2 2 0 00-2-2z" />
                <line x1="18" y1="9" x2="12" y2="15" />
                <line x1="12" y1="9" x2="18" y2="15" />
              </svg>
            </button>
          )}
        </div>
      ))}

      {/* Bottom row: space + enter */}
      <div className="flex justify-center gap-1">
        <button
          onClick={handleSpace}
          aria-label="Space"
          className="flex-1 max-w-[240px] h-11 rounded bg-goshiwon-bg border border-goshiwon-border text-goshiwon-text-muted text-xs hover:text-goshiwon-text transition-colors focus-visible:ring-2 focus-visible:ring-goshiwon-yellow/60 focus-visible:outline-none"
        >
          space
        </button>
        <button
          onClick={handleEnter}
          aria-label="Enter"
          className="min-w-[64px] h-11 rounded bg-goshiwon-accent/30 border border-goshiwon-accent/50 text-goshiwon-text text-xs font-medium hover:bg-goshiwon-accent/40 transition-colors focus-visible:ring-2 focus-visible:ring-goshiwon-yellow/60 focus-visible:outline-none"
        >
          ↵
        </button>
      </div>
    </div>
  );
});

export default HangulKeyboard;
