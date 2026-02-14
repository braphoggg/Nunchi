"use client";

import { FormEvent, useRef, KeyboardEvent } from "react";

interface ChatInputProps {
  input: string;
  onChange: (value: string) => void;
  onSubmit: (e: FormEvent<HTMLFormElement>) => void;
  isLoading: boolean;
}

export default function ChatInput({
  input,
  onChange,
  onSubmit,
  isLoading,
}: ChatInputProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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
      className="border-t border-goshiwon-border bg-goshiwon-surface/95 backdrop-blur-sm px-3 py-2 sm:px-4 sm:py-3 safe-area-bottom"
    >
      <div className="flex gap-2 items-end">
        <textarea
          ref={textareaRef}
          rows={1}
          value={input}
          onChange={(e) => {
            onChange(e.target.value);
            handleInput();
          }}
          onKeyDown={handleKeyDown}
          placeholder="메시지를 입력하세요... (Type a message...)"
          className="flex-1 bg-goshiwon-input rounded-lg px-4 py-3 text-goshiwon-text text-sm placeholder:text-goshiwon-text-muted focus:outline-none focus:ring-1 focus:ring-goshiwon-accent/50 border border-goshiwon-border focus:border-goshiwon-accent/50 transition-colors auto-grow-textarea"
          disabled={isLoading}
          autoFocus
        />
        <button
          type="submit"
          disabled={isLoading || !input.trim()}
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
