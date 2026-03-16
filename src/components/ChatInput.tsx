"use client";

import { FormEvent, useRef, useState, useEffect, KeyboardEvent } from "react";
import { useSettingsContext } from "@/contexts/SettingsContext";

interface ChatInputProps {
  input: string;
  onChange: (value: string) => void;
  onSubmit: (e: FormEvent<HTMLFormElement>) => void;
  isLoading: boolean;
  keyboardVisible?: boolean;
  onToggleKeyboard?: () => void;
}

export default function ChatInput({
  input,
  onChange,
  onSubmit,
  isLoading,
  keyboardVisible,
  onToggleKeyboard,
}: ChatInputProps) {
  const { apiKey } = useSettingsContext();
  const formRef = useRef<HTMLFormElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const noKey = !apiKey;

  // Shorter placeholder on mobile to prevent text wrapping
  const SHORT_PH = "메시지를 입력하세요...";
  const LONG_PH = "메시지를 입력하세요... (Type a message...)";
  const [placeholder, setPlaceholder] = useState(SHORT_PH);
  useEffect(() => {
    if (typeof window.matchMedia !== "function") {
      setPlaceholder(LONG_PH);
      return;
    }
    const mq = window.matchMedia("(min-width: 640px)");
    const update = () => setPlaceholder(mq.matches ? LONG_PH : SHORT_PH);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (input.trim() && !isLoading) {
        formRef.current?.requestSubmit();
      }
    }
  };

  const handleInput = () => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = "auto";
      el.style.height = Math.min(el.scrollHeight, 120) + "px";
    }
  };

  return (
    <form
      ref={formRef}
      onSubmit={onSubmit}
      data-tutorial="chat-input"
      className="border-t border-goshiwon-border bg-goshiwon-surface/95 backdrop-blur-sm px-3 py-2 sm:px-4 sm:py-3 safe-area-bottom"
    >
      <div className="flex gap-2 items-end">
        {/* Hangul keyboard toggle */}
        {onToggleKeyboard && (
          <button
            type="button"
            onClick={onToggleKeyboard}
            data-tutorial="keyboard-toggle"
            title={keyboardVisible ? "Hide Korean keyboard" : "Korean keyboard"}
            aria-label={keyboardVisible ? "Hide Korean keyboard" : "Show Korean keyboard"}
            className={`min-w-[40px] min-h-[40px] px-2 py-2 rounded-lg border transition-colors flex items-center justify-center text-sm font-bold ${
              keyboardVisible
                ? "bg-goshiwon-yellow/15 text-goshiwon-yellow border-goshiwon-yellow/30"
                : "bg-goshiwon-bg text-goshiwon-text-muted border-goshiwon-border hover:text-goshiwon-text"
            }`}
          >
            {/* Keyboard icon */}
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect x="2" y="6" width="20" height="12" rx="2" />
              <line x1="6" y1="10" x2="6" y2="10" strokeWidth="2.5" />
              <line x1="10" y1="10" x2="10" y2="10" strokeWidth="2.5" />
              <line x1="14" y1="10" x2="14" y2="10" strokeWidth="2.5" />
              <line x1="18" y1="10" x2="18" y2="10" strokeWidth="2.5" />
              <line x1="6" y1="14" x2="6" y2="14" strokeWidth="2.5" />
              <line x1="18" y1="14" x2="18" y2="14" strokeWidth="2.5" />
              <line x1="10" y1="14" x2="14" y2="14" strokeWidth="2.5" />
            </svg>
          </button>
        )}

        <textarea
          ref={textareaRef}
          rows={1}
          value={input}
          onChange={(e) => {
            onChange(e.target.value);
            handleInput();
          }}
          onKeyDown={handleKeyDown}
          aria-label="Message input"
          placeholder={noKey ? "Enter your API key in Settings to start" : placeholder}
          className="flex-1 bg-goshiwon-input rounded-lg px-4 py-3 text-goshiwon-text text-sm placeholder:text-goshiwon-text-muted focus:outline-none focus:ring-1 focus:ring-goshiwon-accent/50 border border-goshiwon-border focus:border-goshiwon-accent/50 transition-colors auto-grow-textarea"
          disabled={isLoading || noKey}
          autoFocus
        />
        <button
          type="submit"
          disabled={isLoading || !input.trim() || noKey}
          aria-label="Send message"
          className="bg-goshiwon-accent hover:bg-goshiwon-accent-light min-w-[48px] min-h-[48px] px-4 py-3 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed text-goshiwon-text flex items-center justify-center"
        >
          {isLoading ? (
            <svg
              className="w-5 h-5 animate-spin"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
            >
              <circle
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="2"
                strokeDasharray="31.4 31.4"
                strokeLinecap="round"
              />
            </svg>
          ) : (
            <svg
              className="w-5 h-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          )}
        </button>
      </div>
    </form>
  );
}
