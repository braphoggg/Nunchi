"use client";

import { useChat } from "@ai-sdk/react";
import { useCallback, useEffect, useRef, useState } from "react";
import TopBar from "./TopBar";
import MessageBubble from "./MessageBubble";
import ChatInput from "./ChatInput";
import TypingIndicator from "./TypingIndicator";
import WelcomeScreen from "./WelcomeScreen";
import VocabularyPanel from "./VocabularyPanel";
import FlashcardMode from "./FlashcardMode";
import { useSoundEngine } from "@/hooks/useSoundEngine";
import { useVocabulary } from "@/hooks/useVocabulary";
import { useFlashcards } from "@/hooks/useFlashcards";
import { resetTimestampCounter } from "@/lib/timestamps";

export default function ChatContainer() {
  const { messages, sendMessage, status, error, setMessages } = useChat();
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const prevMessageCountRef = useRef(0);

  const isLoading = status === "submitted" || status === "streaming";

  // Sound engine
  const { playKeyClick, playAmbientHum, muted, toggleMute } = useSoundEngine();

  // Vocabulary tracker
  const {
    words,
    wordCount,
    unseenCount,
    panelOpen,
    addWords,
    removeWord,
    isWordSaved,
    togglePanel,
    closePanel,
  } = useVocabulary();

  // Flashcard mode
  const {
    startSession: startFlashcards,
    endSession: endFlashcards,
    isActive: flashcardActive,
    studyableCount,
  } = useFlashcards(words);

  // Farewell state for reset
  const [showFarewell, setShowFarewell] = useState(false);

  // Error dismiss
  const [errorDismissed, setErrorDismissed] = useState(false);

  // Transition state
  const [transitioning, setTransitioning] = useState(false);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Sound effects when Moon-jo is typing
  useEffect(() => {
    if (isLoading) {
      playAmbientHum();
      const interval = setInterval(playKeyClick, 300 + Math.random() * 200);
      return () => clearInterval(interval);
    }
  }, [isLoading, playAmbientHum, playKeyClick]);

  // Crossfade transition when first message appears
  useEffect(() => {
    if (prevMessageCountRef.current === 0 && messages.length > 0) {
      setTransitioning(true);
      const timer = setTimeout(() => setTransitioning(false), 400);
      return () => clearTimeout(timer);
    }
    prevMessageCountRef.current = messages.length;
  }, [messages.length]);

  // Reset error dismissed on new error
  useEffect(() => {
    if (error) setErrorDismissed(false);
  }, [error]);

  // Reset conversation
  const handleReset = useCallback(() => {
    endFlashcards();
    closePanel();
    setShowFarewell(true);
    setTimeout(() => {
      setMessages([]);
      setShowFarewell(false);
      setInput("");
      resetTimestampCounter();
      prevMessageCountRef.current = 0;
    }, 2000);
  }, [setMessages, closePanel, endFlashcards]);

  const handleTopicSelect = (message: string) => {
    sendMessage({ text: message });
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || isLoading) return;
    setInput("");
    sendMessage({ text });
  };

  return (
    <div className="relative flex flex-col h-screen max-w-2xl mx-auto border-x border-goshiwon-border">
      <TopBar
        onReset={messages.length > 0 ? handleReset : undefined}
        onToggleMute={toggleMute}
        isMuted={muted}
        onToggleVocabulary={togglePanel}
        vocabularyCount={unseenCount}
      />

      {panelOpen && !flashcardActive && (
        <VocabularyPanel
          words={words}
          onRemoveWord={removeWord}
          onClose={closePanel}
          onStartStudy={startFlashcards}
          studyableCount={studyableCount}
        />
      )}

      {panelOpen && flashcardActive && (
        <FlashcardMode
          words={words}
          onClose={endFlashcards}
        />
      )}

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {/* Farewell overlay */}
        {showFarewell && (
          <div className="flex-1 flex items-center justify-center py-20 animate-farewell">
            <p className="text-center text-goshiwon-text-secondary text-sm italic max-w-xs">
              &ldquo;You&rsquo;re leaving? The door is always open... I&rsquo;ll be here.&rdquo;
            </p>
          </div>
        )}

        {!showFarewell && messages.length === 0 ? (
          <div className={transitioning ? "fade-exit-active" : ""}>
            <WelcomeScreen onSelectTopic={handleTopicSelect} />
          </div>
        ) : !showFarewell ? (
          <div className={transitioning ? "fade-enter" : "fade-enter-active"}>
            {messages.map((m) => (
              <div key={m.id} className="mb-3">
                <MessageBubble
                  message={m}
                  onSaveWords={addWords}
                  isWordSaved={isWordSaved}
                />
              </div>
            ))}
            {isLoading &&
              messages[messages.length - 1]?.role === "user" && (
                <TypingIndicator />
              )}
          </div>
        ) : null}

        {error && !errorDismissed && (
          <div className="relative mx-4 p-3 rounded-lg bg-goshiwon-accent/20 border border-goshiwon-accent/40 text-sm animate-message-in">
            <button
              onClick={() => setErrorDismissed(true)}
              aria-label="Dismiss error"
              className="absolute top-2 right-2 text-goshiwon-text-muted hover:text-goshiwon-text transition-colors p-1"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
            <p className="font-medium text-goshiwon-accent-light">
              Something went wrong
            </p>
            <p className="mt-1 text-goshiwon-text-secondary text-xs">
              {error.message ||
                "An unexpected error occurred. Please try again."}
            </p>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <ChatInput
        input={input}
        onChange={setInput}
        onSubmit={handleSubmit}
        isLoading={isLoading}
      />
    </div>
  );
}
