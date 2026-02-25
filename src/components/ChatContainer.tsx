"use client";

import { useChat } from "@ai-sdk/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import TopBar from "./TopBar";
import MessageBubble from "./MessageBubble";
import ChatInput from "./ChatInput";
import TypingIndicator from "./TypingIndicator";
import WelcomeScreen from "./WelcomeScreen";
import VocabularyPanel from "./VocabularyPanel";
import FlashcardMode from "./FlashcardMode";
import GoshiwonEventBubble from "./GoshiwonEventBubble";
import StatsBar from "./StatsBar";
import StatsPanel from "./StatsPanel";
import XPToast from "./XPToast";
import HelpModal from "./HelpModal";
import LessonHistory from "./LessonHistory";
import LessonReview from "./LessonReview";
import OnboardingOverlay from "./OnboardingOverlay";
import TutorialOverlay from "./TutorialOverlay";
import { useShareConversation } from "./ShareButton";
import HangulKeyboard from "./HangulKeyboard";
import { useSoundEngine } from "@/hooks/useSoundEngine";
import { useTutorial } from "@/hooks/useTutorial";
import { useVocabulary } from "@/hooks/useVocabulary";
import { useFlashcards } from "@/hooks/useFlashcards";
import { useGoshiwonEvents } from "@/hooks/useGoshiwonEvents";
import { useNightProgression } from "@/hooks/useNightProgression";
import { useGamification } from "@/hooks/useGamification";
import { useLessonHistory } from "@/hooks/useLessonHistory";
import { resetTimestampCounter } from "@/lib/timestamps";
import { getTextContent } from "@/lib/message-utils";
import { computeKoreanRatio, getMoodLevel } from "@/lib/mood-engine";
import type { ResidentRank } from "@/types";

const VISITED_TOPICS_KEY = "nunchi-visited-topics";
const ONBOARDED_KEY = "nunchi-onboarded";

/** Rank-up atmospheric messages from Moon-jo */
const RANK_UP_MESSAGES: Record<ResidentRank, { korean: string; english: string } | null> = {
  new_resident: null,
  quiet_tenant: {
    korean: "조용한 세입자... 이제 당신을 기억하겠군요.",
    english: "Quiet Tenant... I'll remember you now.",
  },
  regular: {
    korean: "단골이 됐군요. 어느 계단이 삐걱거리는지 알겠죠?",
    english: "You've become a regular. You know which stairs creak, don't you?",
  },
  trusted_neighbor: {
    korean: "믿을 만한 이웃... 이제 비밀을 나눌 수 있겠군요.",
    english: "A trustworthy neighbor... Now I can share secrets with you.",
  },
  floor_senior: {
    korean: "층 선배님... 여기가 집이에요. 문조가 웃습니다.",
    english: "Floor Senior... This is home. Moon-jo smiles.",
  },
};

export default function ChatContainer() {
  const { messages, sendMessage, status, error, setMessages } = useChat();
  const [input, setInput] = useState("");
  const inputRef = useRef(input);
  inputRef.current = input;
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const prevMessageCountRef = useRef(0);

  // Share conversation as image
  const { handleShare, exporting: shareExporting } = useShareConversation(messages);

  const isLoading = status === "submitted" || status === "streaming";

  // Interactive tutorial
  const tutorial = useTutorial();

  // Hangul keyboard
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const toggleKeyboard = useCallback(() => {
    setKeyboardVisible((v) => !v);
    tutorial.notifyInteraction("keyboard");
  }, [tutorial]);
  const handleKeyboardInput = useCallback((text: string) => {
    setInput((prev) => prev + text);
  }, []);
  const handleKeyboardDelete = useCallback(() => {
    setInput((prev) => prev.slice(0, -1));
  }, []);

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

  // Goshiwon atmospheric events
  const assistantMsgCount = messages.filter((m) => m.role === "assistant").length;
  const { activeEvent, dismissEvent } = useGoshiwonEvents(assistantMsgCount);

  // Night mode progression
  const { styleOverrides } = useNightProgression(messages.length);

  // Gamification
  const {
    totalXP,
    recentXPGain,
    koreanHint,
    currentStreak,
    longestStreak,
    rank,
    rankProgress,
    nextRank,
    stats,
    recordMessage,
    recordTranslation,
    recordFlashcardComplete,
    recordWordSaved,
  } = useGamification(wordCount);

  // Auto-open keyboard for tutorial step "hangul-keys"
  useEffect(() => {
    if (tutorial.isActive && tutorial.currentStep?.id === "hangul-keys" && !keyboardVisible) {
      setKeyboardVisible(true);
    }
  }, [tutorial.isActive, tutorial.currentStep, keyboardVisible]);

  // Hangul keyboard submit — use ref so the callback always sees the latest input
  // even if called from a setTimeout (stale closure prevention)
  const handleKeyboardSubmit = useCallback(() => {
    const text = inputRef.current.trim();
    if (text && !isLoading && sendMessage) {
      setInput("");
      recordMessage(text);
      sendMessage({ text });
    }
  }, [isLoading, sendMessage, recordMessage]);

  // Stats panel
  const [statsOpen, setStatsOpen] = useState(false);
  const toggleStats = useCallback(() => {
    setStatsOpen((o) => {
      if (!o) closePanel();
      return !o;
    });
  }, [closePanel]);
  const closeStats = useCallback(() => setStatsOpen(false), []);

  // Lesson history
  const {
    conversations,
    historyOpen,
    reviewingConversation,
    saveConversation,
    deleteConversation,
    toggleHistory,
    closeHistory,
    reviewConversation,
    closeReview,
  } = useLessonHistory();

  const handleToggleHistory = useCallback(() => {
    closePanel();
    closeStats();
    toggleHistory();
  }, [closePanel, closeStats, toggleHistory]);

  const handleToggleVocabulary = useCallback(() => {
    closeStats();
    togglePanel();
  }, [closeStats, togglePanel]);

  // Help modal
  const [helpOpen, setHelpOpen] = useState(false);
  const toggleHelp = useCallback(() => {
    setHelpOpen((o) => {
      if (!o) {
        closePanel();
        closeStats();
      }
      return !o;
    });
  }, [closePanel, closeStats]);
  const closeHelp = useCallback(() => setHelpOpen(false), []);

  // Onboarding overlay — show once per browser
  const [showOnboarding, setShowOnboarding] = useState(false);
  useEffect(() => {
    if (typeof window !== "undefined") {
      setShowOnboarding(!localStorage.getItem(ONBOARDED_KEY));
    }
  }, []);
  const dismissOnboarding = useCallback(() => {
    localStorage.setItem(ONBOARDED_KEY, "1");
    setShowOnboarding(false);
  }, []);

  // Visited topics — persisted in localStorage
  const [visitedTopics, setVisitedTopics] = useState<Set<string>>(() => new Set());
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem(VISITED_TOPICS_KEY);
        setVisitedTopics(new Set(stored ? JSON.parse(stored) : []));
      } catch {
        setVisitedTopics(new Set());
      }
    }
  }, []);
  const markTopicVisited = useCallback((topicId: string) => {
    setVisitedTopics((prev) => {
      if (prev.has(topicId)) return prev;
      const next = new Set(prev);
      next.add(topicId);
      try {
        localStorage.setItem(VISITED_TOPICS_KEY, JSON.stringify([...next]));
      } catch { /* ignore */ }
      return next;
    });
  }, []);

  // Leave confirmation — requires explicit user action, no auto-dismiss
  const [confirmLeave, setConfirmLeave] = useState(false);
  const promptLeave = useCallback(() => setConfirmLeave(true), []);
  const cancelLeave = useCallback(() => setConfirmLeave(false), []);

  // Escape key closes overlays
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        if (tutorial.isActive) { tutorial.skipTutorial(); return; }
        if (confirmLeave) { cancelLeave(); return; }
        if (helpOpen) { closeHelp(); return; }
        if (reviewingConversation) { closeReview(); return; }
        if (historyOpen) { closeHistory(); return; }
        if (statsOpen) { closeStats(); return; }
        if (flashcardActive) { endFlashcards(); return; }
        if (panelOpen) { closePanel(); return; }
        if (keyboardVisible) { setKeyboardVisible(false); return; }
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [tutorial, confirmLeave, helpOpen, reviewingConversation, historyOpen, statsOpen, flashcardActive, panelOpen, keyboardVisible, cancelLeave, closeHelp, closeReview, closeHistory, closeStats, endFlashcards, closePanel]);

  // Rank-up notification
  const prevRankRef = useRef<ResidentRank>(rank.id);
  const [rankUpMessage, setRankUpMessage] = useState<{ korean: string; english: string } | null>(null);

  useEffect(() => {
    if (prevRankRef.current !== rank.id && prevRankRef.current !== undefined) {
      const msg = RANK_UP_MESSAGES[rank.id];
      if (msg) setRankUpMessage(msg);
    }
    prevRankRef.current = rank.id;
  }, [rank.id]);

  useEffect(() => {
    if (!rankUpMessage) return;
    if (panelOpen || flashcardActive || statsOpen) return;
    const timer = setTimeout(() => setRankUpMessage(null), 5000);
    return () => clearTimeout(timer);
  }, [rankUpMessage, panelOpen, flashcardActive, statsOpen]);

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

  // Compute current mood from message history
  const currentMood = useMemo(() => {
    if (messages.length === 0) return "neutral" as const;
    const simpleMessages = messages.map((m) => ({
      role: m.role,
      content: getTextContent(m),
    }));
    return getMoodLevel(computeKoreanRatio(simpleMessages));
  }, [messages]);

  // Reset conversation
  const handleReset = useCallback(() => {
    setConfirmLeave(false);
    endFlashcards();
    closePanel();
    closeStats();
    closeHistory();
    if (messages.length > 0) {
      saveConversation(
        messages.map((m) => ({ role: m.role, text: getTextContent(m) }))
      );
    }
    setShowFarewell(true);
    setTimeout(() => {
      setMessages([]);
      setShowFarewell(false);
      setInput("");
      resetTimestampCounter();
      prevMessageCountRef.current = 0;
    }, 2000);
  }, [setMessages, messages, closePanel, endFlashcards, closeStats, closeHistory, saveConversation]);

  const handleTopicSelect = useCallback((message: string, topicId: string) => {
    if (!sendMessage) {
      console.error("[ChatContainer] sendMessage not available");
      return;
    }
    tutorial.notifyInteraction("topics");
    markTopicVisited(topicId);
    recordMessage(message);
    sendMessage({ text: message });
  }, [sendMessage, markTopicVisited, recordMessage, tutorial]);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || isLoading || !sendMessage) return;
    setInput("");
    recordMessage(text);
    sendMessage({ text });
  };

  // Wrap addWords to also record XP for saved words
  const handleSaveWords = useCallback(
    (newWords: Parameters<typeof addWords>[0]) => {
      addWords(newWords);
      recordWordSaved(newWords.length);
    },
    [addWords, recordWordSaved]
  );

  return (
    <div style={styleOverrides} className="relative flex flex-col h-screen max-w-2xl mx-auto border-x border-goshiwon-border night-transition">
      <TopBar
        onReset={messages.length > 0 ? promptLeave : undefined}
        onToggleMute={toggleMute}
        isMuted={muted}
        onToggleHistory={handleToggleHistory}
        onShare={messages.length > 0 ? handleShare : undefined}
        shareDisabled={shareExporting}
        onToggleVocabulary={handleToggleVocabulary}
        onToggleHelp={toggleHelp}
        vocabularyCount={unseenCount}
        rank={rank}
        mood={currentMood}
      />

      <StatsBar
        streak={currentStreak}
        totalXP={totalXP}
        rank={rank}
        rankProgress={rankProgress}
        nextRank={nextRank}
        vocabCount={wordCount}
        onToggleStats={toggleStats}
      />

      {/* Leave confirmation banner — no auto-dismiss */}
      {confirmLeave && (
        <div className="relative z-50 flex items-center justify-center gap-3 px-4 py-2 bg-goshiwon-accent/20 border-b border-goshiwon-accent/40 animate-message-in">
          <span className="text-xs text-goshiwon-text-secondary">Leave Room 203? Your conversation will be saved.</span>
          <button
            onClick={handleReset}
            className="text-xs text-goshiwon-accent-light hover:text-goshiwon-accent font-medium transition-colors"
          >
            Leave
          </button>
          <button
            onClick={cancelLeave}
            className="text-xs text-goshiwon-text-muted hover:text-goshiwon-text transition-colors"
          >
            Stay
          </button>
        </div>
      )}

      {/* Help modal */}
      {helpOpen && (
        <HelpModal
          onClose={closeHelp}
          onReplayTutorial={() => { closeHelp(); tutorial.startTutorial(); }}
        />
      )}

      {/* Lesson history */}
      {historyOpen && !reviewingConversation && (
        <LessonHistory
          conversations={conversations}
          onSelect={reviewConversation}
          onDelete={deleteConversation}
          onClose={closeHistory}
        />
      )}
      {reviewingConversation && (
        <LessonReview
          conversation={reviewingConversation}
          onClose={closeReview}
        />
      )}

      {/* Stats panel overlay */}
      {statsOpen && (
        <StatsPanel
          rank={rank}
          rankProgress={rankProgress}
          nextRank={nextRank}
          totalXP={totalXP}
          currentStreak={currentStreak}
          longestStreak={longestStreak}
          stats={stats}
          vocabCount={wordCount}
          onClose={closeStats}
        />
      )}

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
          onSessionComplete={recordFlashcardComplete}
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
            <WelcomeScreen
              onSelectTopic={handleTopicSelect}
              rank={rank}
              visitedTopics={visitedTopics}
            />
          </div>
        ) : !showFarewell ? (
          <div className={transitioning ? "fade-enter" : "fade-enter-active"}>
            {messages.map((m) => (
              <div key={m.id} className="mb-3">
                <MessageBubble
                  message={m}
                  onSaveWords={handleSaveWords}
                  isWordSaved={isWordSaved}
                  onTranslateUsed={recordTranslation}
                />
              </div>
            ))}
            {activeEvent && (
              <GoshiwonEventBubble
                event={activeEvent}
                onDismiss={dismissEvent}
              />
            )}
            {/* Rank-up notification */}
            {rankUpMessage && (
              <div className="my-3 text-center animate-rank-up">
                <div className="inline-block bg-goshiwon-surface border border-goshiwon-yellow/30 rounded-lg px-5 py-3">
                  <p className="text-xs text-goshiwon-text-muted italic mb-1">
                    Moon-jo nods slowly.
                  </p>
                  <p className="text-sm text-goshiwon-yellow italic">
                    &ldquo;{rankUpMessage.korean}&rdquo;
                  </p>
                  <p className="text-xs text-goshiwon-text-secondary mt-1">
                    {rankUpMessage.english}
                  </p>
                </div>
              </div>
            )}
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
              {error.message || "An unexpected error occurred. Please try again."}
            </p>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* XP Toast */}
      {recentXPGain && (
        <XPToast amount={recentXPGain.amount} action={recentXPGain.action} />
      )}

      {/* Korean hint */}
      {koreanHint && (
        <div className={`absolute left-1/2 -translate-x-1/2 z-50 pointer-events-none animate-hint-toast transition-all duration-200 ${recentXPGain ? "bottom-28" : "bottom-20"}`}>
          <div className="bg-goshiwon-surface border border-goshiwon-border rounded-lg px-3 py-1.5 shadow-lg flex items-center gap-2">
            <span className="text-goshiwon-yellow text-xs">✦</span>
            <span className="text-goshiwon-text-secondary text-xs">
              Write in Korean to earn XP
            </span>
          </div>
        </div>
      )}

      <HangulKeyboard
        onInput={handleKeyboardInput}
        onDeleteChar={handleKeyboardDelete}
        onSubmit={handleKeyboardSubmit}
        visible={keyboardVisible}
      />

      <ChatInput
        input={input}
        onChange={setInput}
        onSubmit={handleSubmit}
        isLoading={isLoading}
        keyboardVisible={keyboardVisible}
        onToggleKeyboard={toggleKeyboard}
      />

      {/* First-run onboarding overlay */}
      {showOnboarding && (
        <OnboardingOverlay
          onStartTour={() => { dismissOnboarding(); tutorial.startTutorial(); }}
          onSkip={dismissOnboarding}
        />
      )}

      {/* Interactive tutorial overlay */}
      {tutorial.isActive && tutorial.currentStep && (
        <TutorialOverlay
          step={tutorial.currentStep}
          stepIndex={tutorial.currentStepIndex}
          totalSteps={tutorial.totalSteps}
          onNext={tutorial.nextStep}
          onPrev={tutorial.prevStep}
          onSkip={tutorial.skipTutorial}
        />
      )}
    </div>
  );
}
