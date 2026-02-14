"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import type { UIMessage } from "ai";
import { formatMessage } from "@/lib/format-message";
import { getAtmosphericTimestamp } from "@/lib/timestamps";

interface MessageBubbleProps {
  message: UIMessage;
}

function getTextContent(message: UIMessage): string {
  return message.parts
    .filter((p) => p.type === "text")
    .map((p) => p.text)
    .join("");
}

export default function MessageBubble({ message }: MessageBubbleProps) {
  const isAssistant = message.role === "assistant";
  const content = getTextContent(message);

  const [showTranslation, setShowTranslation] = useState(false);
  const [translation, setTranslation] = useState<string | null>(null);
  const [translating, setTranslating] = useState(false);
  const [translateError, setTranslateError] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Cancel speech on unmount
  useEffect(() => {
    return () => {
      if (typeof speechSynthesis !== "undefined") {
        speechSynthesis.cancel();
      }
    };
  }, []);

  const handleSpeak = useCallback(() => {
    if (isSpeaking) {
      speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }
    const utterance = new SpeechSynthesisUtterance(content);
    utterance.lang = "ko-KR";
    utterance.rate = 0.9;
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    speechSynthesis.cancel();
    speechSynthesis.speak(utterance);
    setIsSpeaking(true);
  }, [isSpeaking, content]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const timestamp = useMemo(() => getAtmosphericTimestamp(), []);

  async function handleTranslate() {
    if (!isAssistant) return;

    // Toggle back to original
    if (showTranslation) {
      setShowTranslation(false);
      return;
    }

    // Already cached — show it
    if (translation) {
      setShowTranslation(true);
      return;
    }

    // Fetch translation
    setTranslating(true);
    setTranslateError(false);
    try {
      const res = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: content }),
      });
      if (!res.ok) throw new Error("Translation failed");
      const data = await res.json();
      setTranslation(data.translation);
      setShowTranslation(true);
    } catch {
      setTranslateError(true);
    } finally {
      setTranslating(false);
    }
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Silently fail
    }
  }

  const displayContent =
    showTranslation && translation ? translation : content;

  return (
    <div
      className={`flex animate-message-in ${
        isAssistant ? "justify-start" : "justify-end"
      }`}
    >
      <div
        className={`max-w-[85%] flex flex-col ${
          isAssistant ? "items-start" : "items-end"
        }`}
      >
        {/* Message bubble */}
        <div
          className={`relative w-full ${
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
            {translating ? (
              <span className="text-goshiwon-text-secondary italic">
                Translating...
              </span>
            ) : translateError ? (
              <>
                {formatMessage(content)}
                <span className="block mt-1 text-xs text-goshiwon-accent-light">
                  Translation failed — try again
                </span>
              </>
            ) : isAssistant ? (
              formatMessage(displayContent)
            ) : (
              content
            )}
          </div>

          {/* Timestamp */}
          <div
            className={`px-4 pb-2 ${
              isAssistant ? "text-left" : "text-right"
            }`}
          >
            <span className="text-[10px] text-goshiwon-text-muted">
              {timestamp}
            </span>
          </div>
        </div>

        {/* Action buttons — below the bubble */}
        {isAssistant ? (
          <div className="flex items-center gap-1 mt-1 ml-1">
            {/* Translate */}
            <button
              onClick={handleTranslate}
              aria-label="Translate message"
              aria-pressed={showTranslation}
              className="p-1.5 text-goshiwon-text-muted hover:text-goshiwon-text transition-colors rounded"
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
                <circle cx="12" cy="12" r="10" />
                <line x1="2" y1="12" x2="22" y2="12" />
                <path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" />
              </svg>
            </button>

            {/* TTS */}
            <button
              onClick={handleSpeak}
              aria-label={isSpeaking ? "Stop reading" : "Read message aloud"}
              className="p-1.5 text-goshiwon-text-muted hover:text-goshiwon-text transition-colors rounded"
            >
              {isSpeaking ? (
                <svg
                  className="w-3.5 h-3.5"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <rect x="6" y="6" width="12" height="12" rx="1" />
                </svg>
              ) : (
                <svg
                  className="w-3.5 h-3.5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                  <path d="M15.54 8.46a5 5 0 010 7.07" />
                  <path d="M19.07 4.93a10 10 0 010 14.14" />
                </svg>
              )}
            </button>

            {/* Copy */}
            <button
              onClick={handleCopy}
              aria-label="Copy message"
              className="p-1.5 text-goshiwon-text-muted hover:text-goshiwon-text transition-colors rounded"
            >
              {copied ? (
                <span className="text-[10px] text-goshiwon-yellow font-medium">
                  Copied!
                </span>
              ) : (
                <svg
                  className="w-3.5 h-3.5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                  <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                </svg>
              )}
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-1 mt-1 mr-1 justify-end">
            {/* Copy only for user messages */}
            <button
              onClick={handleCopy}
              aria-label="Copy message"
              className="p-1.5 text-goshiwon-text-muted hover:text-goshiwon-text transition-colors rounded"
            >
              {copied ? (
                <span className="text-[10px] text-goshiwon-yellow font-medium">
                  Copied!
                </span>
              ) : (
                <svg
                  className="w-3.5 h-3.5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                  <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                </svg>
              )}
            </button>
          </div>
        )}

        {/* Read receipt for user messages */}
        {!isAssistant && (
          <span className="text-[10px] text-goshiwon-text-muted mt-1 mr-1 animate-read-receipt">
            읽음
          </span>
        )}
      </div>
    </div>
  );
}
