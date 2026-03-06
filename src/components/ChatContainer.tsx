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
import QuizMode from "./QuizMode";
import GoshiwonEventBubble from "./GoshiwonEventBubble";
import StatsBar from "./StatsBar";
import StatsPanel from "./StatsPanel";
import XPToast from "./XPToast";
import HelpModal from "./HelpModal";
import LessonHistory from "./LessonHistory";
import LessonReview from "./LessonReview";
import OnboardingOverlay from "./OnboardingOverlay";
import TutorialOverlay from "./TutorialOverlay";
import SettingsPanel from "./SettingsPanel";
import { useShareConversation } from "./ShareButton";
import HangulKeyboard from "./HangulKeyboard";
import { useSoundEngine } from "@/hooks/useSoundEngine";
import { useSettings } from "@/hooks/useSettings";
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
import { LESSON_TOPICS } from "@/lib/lesson-topics";
import type { ResidentRank } from "@/types";
import { computeNextSRS, getSRSState } from "@/lib/srs";
import { MIN_QUIZ_WORDS } from "@/lib/quiz-generator";
import type { FlashcardGrade } from "@/hooks/useFlashcards";

const VISITED_TOPICS_KEY = "nunchi-visited-topics";
const ONBOARDED_KEY = "nunchi-onboarded";

/** Light theme color overrides — warm parchment tones */
const LIGHT_THEME: Record<string, string> = {
  "--color-goshiwon-bg": "#f0ece4",
  "--color-goshiwon-surface": "#e6e0d6",
  "--color-goshiwon-surface-hover": "#ddd6ca",
  "--color-goshiwon-border": "#c8bfb0",
  "--color-goshiwon-accent": "#8b1a1a",
  "--color-goshiwon-accent-light": "#a83232",
  "--color-goshiwon-yellow": "#9a7a20",
  "--color-goshiwon-text": "#1a1520",
  "--color-goshiwon-text-secondary": "#5a5060",
  "--color-goshiwon-text-muted": "#8a8090",
  "--color-goshiwon-input": "#ebe5db",
  "--color-goshiwon-user-bubble": "#e0d9cd",
};

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
  // Active lesson topic (set when user picks a topic from WelcomeScreen)
  const [activeTopic, setActiveTopic] = useState<{ id: string; titleKr: string; difficulty: string } | null>(null);

  const { messages, sendMessage, regenerate, status, error, setMessages } = useChat();
  const [input, setInput] = useState("");
  const inputRef = useRef(input);
  inputRef.current = input;
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const prevMessageCountRef = useRef(0);

  // Share conversation as image
  const { handleShare, handleShareText, exporting: shareExporting } = useShareConversation(messages);

  const isLoading = status === "submitted" || status === "streaming";

  // Sound engine
  const sound = useSoundEngine();

  // Accessibility settings
  const { settings, setTheme, setFontScale, setReduceAnimations, setShowRomanization } = useSettings();

  // Interactive tutorial
  const tutorial = useTutorial();

  // Hangul keyboard
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const toggleKeyboard = useCallback(() => {
    setKeyboardVisible((v) => {
      sound.playKeyboardToggle(!v);
      return !v;
    });
    tutorial.notifyInteraction("keyboard");
  }, [tutorial, sound]);
  const handleKeyboardInput = useCallback((text: string) => {
    setInput((prev) => prev + text);
  }, []);
  const handleKeyboardDelete = useCallback(() => {
    setInput((prev) => prev.slice(0, -1));
  }, []);

  // Vocabulary tracker
  const {
    words,
    wordCount,
    unseenCount,
    panelOpen,
    addWords,
    removeWord,
    updateWord,
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
    dueCount,
  } = useFlashcards(words);

  // Quiz mode
  const [quizActive, setQuizActive] = useState(false);
  const quizReady = useMemo(
    () => words.filter((w) => w.english?.trim()).length >= MIN_QUIZ_WORDS,
    [words],
  );
  const startQuiz = useCallback(() => setQuizActive(true), []);
  const endQuiz = useCallback(() => setQuizActive(false), []);

  // SRS: update word after flashcard grading
  const handleWordGraded = useCallback(
    (wordId: string, grade: FlashcardGrade) => {
      const word = words.find((w) => w.id === wordId);
      if (!word) return;
      const current = getSRSState(word);
      const next = computeNextSRS(current, grade);
      updateWord(wordId, next);
    },
    [words, updateWord],
  );

  // Goshiwon atmospheric events
  const assistantMsgCount = messages.filter((m) => m.role === "assistant").length;
  const { activeEvent, dismissEvent } = useGoshiwonEvents(assistantMsgCount);

  // Night mode progression
  const { stage: nightStage, styleOverrides } = useNightProgression(messages.length);

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
    recordQuizComplete,
    recordWordSaved,
  } = useGamification(wordCount);

  // Quiz completion handler
  const handleQuizComplete = useCallback(
    (result: { correct: number; total: number }) => {
      recordQuizComplete(result.correct, result.total);
    },
    [recordQuizComplete],
  );

  // Build context for the system prompt (sent with each chat request)
  const savedWordsKorean = useMemo(() => words.map((w) => w.korean), [words]);
  const chatContextRef = useRef({
    rankKorean: rank.korean,
    rankEnglish: rank.english,
    totalXP,
    vocabCount: wordCount,
    streakDays: currentStreak,
    activeTopic: activeTopic?.id,
    activeTopicKr: activeTopic?.titleKr,
    activeTopicDifficulty: activeTopic?.difficulty,
    savedWords: savedWordsKorean,
  });
  chatContextRef.current = {
    rankKorean: rank.korean,
    rankEnglish: rank.english,
    totalXP,
    vocabCount: wordCount,
    streakDays: currentStreak,
    activeTopic: activeTopic?.id,
    activeTopicKr: activeTopic?.titleKr,
    activeTopicDifficulty: activeTopic?.difficulty,
    savedWords: savedWordsKorean,
  };

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
      sound.playMessageSend();
      setInput("");
      recordMessage(text);
      sendMessage({ text }, { body: { context: chatContextRef.current } });
    }
  }, [isLoading, sendMessage, recordMessage, sound]);

  // Stats panel
  const [statsOpen, setStatsOpen] = useState(false);
  const toggleStats = useCallback(() => {
    setStatsOpen((o) => {
      sound.playPanelTransition(!o ? "open" : "close");
      if (!o) closePanel();
      return !o;
    });
  }, [closePanel, sound]);
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
    sound.playPanelTransition(historyOpen ? "close" : "open");
    closePanel();
    closeStats();
    toggleHistory();
  }, [closePanel, closeStats, toggleHistory, sound, historyOpen]);

  const handleToggleVocabulary = useCallback(() => {
    sound.playPanelTransition(panelOpen ? "close" : "open");
    closeStats();
    togglePanel();
  }, [closeStats, togglePanel, sound, panelOpen]);

  // Help modal
  const [helpOpen, setHelpOpen] = useState(false);
  const toggleHelp = useCallback(() => {
    setHelpOpen((o) => {
      sound.playPanelTransition(!o ? "open" : "close");
      if (!o) {
        closePanel();
        closeStats();
      }
      return !o;
    });
  }, [closePanel, closeStats, sound]);
  const closeHelp = useCallback(() => setHelpOpen(false), []);

  // Settings panel
  const [settingsOpen, setSettingsOpen] = useState(false);
  const toggleSettings = useCallback(() => {
    setSettingsOpen((o) => {
      sound.playPanelTransition(!o ? "open" : "close");
      if (!o) { closePanel(); closeStats(); closeHelp(); }
      return !o;
    });
  }, [closePanel, closeStats, closeHelp, sound]);
  const closeSettings = useCallback(() => setSettingsOpen(false), []);

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
        if (settingsOpen) { closeSettings(); return; }
        if (reviewingConversation) { closeReview(); return; }
        if (historyOpen) { closeHistory(); return; }
        if (statsOpen) { closeStats(); return; }
        if (quizActive) { endQuiz(); return; }
        if (flashcardActive) { endFlashcards(); return; }
        if (panelOpen) { closePanel(); return; }
        if (keyboardVisible) { setKeyboardVisible(false); return; }
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [tutorial, confirmLeave, helpOpen, settingsOpen, reviewingConversation, historyOpen, statsOpen, quizActive, flashcardActive, panelOpen, keyboardVisible, cancelLeave, closeHelp, closeSettings, closeReview, closeHistory, closeStats, endQuiz, endFlashcards, closePanel]);

  // Rank-up notification
  const prevRankRef = useRef<ResidentRank>(rank.id);
  const [rankUpMessage, setRankUpMessage] = useState<{ korean: string; english: string } | null>(null);

  useEffect(() => {
    if (prevRankRef.current !== rank.id && prevRankRef.current !== undefined) {
      const msg = RANK_UP_MESSAGES[rank.id];
      if (msg) {
        setRankUpMessage(msg);
        sound.playRankUp();
      }
    }
    prevRankRef.current = rank.id;
  }, [rank.id, sound]);

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

  // Compute current mood from message history
  const currentMood = useMemo(() => {
    if (messages.length === 0) return "neutral" as const;
    const simpleMessages = messages.map((m) => ({
      role: m.role,
      content: getTextContent(m),
    }));
    return getMoodLevel(computeKoreanRatio(simpleMessages));
  }, [messages]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Ambient soundscape — start on mount, stop on unmount
  useEffect(() => {
    sound.startAmbient();
    return () => sound.stopAmbient();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync night stage with ambient engine
  useEffect(() => {
    sound.setNightStage(nightStage);
  }, [nightStage, sound]);

  // Sync mood level with ambient engine
  useEffect(() => {
    sound.setMoodLevel(currentMood);
  }, [currentMood, sound]);

  // Moon-jo typing sequence (replaces old hum+click interval)
  useEffect(() => {
    if (isLoading) {
      sound.startTyping();
      return () => sound.stopTyping();
    }
  }, [isLoading, sound]);

  // Message receive sound — fires when assistant finishes a message
  const prevMsgLenRef = useRef(messages.length);
  useEffect(() => {
    if (messages.length > prevMsgLenRef.current && !isLoading) {
      const last = messages[messages.length - 1];
      if (last?.role === "assistant") {
        sound.playMessageReceive();
      }
    }
    prevMsgLenRef.current = messages.length;
  }, [messages.length, isLoading, messages, sound]);

  // XP ding sound
  useEffect(() => {
    if (recentXPGain) sound.playXPDing();
  }, [recentXPGain, sound]);

  // Goshiwon event sound
  useEffect(() => {
    if (activeEvent) sound.playGoshiwonEvent(activeEvent.english);
  }, [activeEvent, sound]);

  // Tutorial step sound
  useEffect(() => {
    if (tutorial.isActive && tutorial.currentStepIndex > 0) {
      sound.playTutorialStep();
    }
  }, [tutorial.isActive, tutorial.currentStepIndex, sound]);

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
    setConfirmLeave(false);
    endQuiz();
    endFlashcards();
    closePanel();
    closeStats();
    closeHistory();
    closeSettings();
    if (messages.length > 0) {
      saveConversation(
        messages.map((m) => ({ role: m.role, text: getTextContent(m) }))
      );
    }
    setShowFarewell(true);
    sound.playFarewell();
    setTimeout(() => {
      setMessages([]);
      setShowFarewell(false);
      setInput("");
      setActiveTopic(null);
      resetTimestampCounter();
      prevMessageCountRef.current = 0;
    }, 2000);
  }, [setMessages, messages, closePanel, endFlashcards, closeStats, closeHistory, closeSettings, saveConversation, sound]);

  const handleTopicSelect = useCallback((message: string, topicId: string) => {
    if (!sendMessage) {
      console.error("[ChatContainer] sendMessage not available");
      return;
    }
    sound.playTopicSelect();
    tutorial.notifyInteraction("topics");
    markTopicVisited(topicId);
    // Track active topic for system prompt context
    const topic = LESSON_TOPICS.find((t) => t.id === topicId);
    if (topic) {
      setActiveTopic({ id: topic.id, titleKr: topic.titleKr, difficulty: topic.difficulty });
      // Update context ref immediately so sendMessage picks up the topic data
      chatContextRef.current = {
        ...chatContextRef.current,
        activeTopic: topic.id,
        activeTopicKr: topic.titleKr,
        activeTopicDifficulty: topic.difficulty,
      };
    }
    recordMessage(message);
    sendMessage({ text: message }, { body: { context: chatContextRef.current } });
  }, [sendMessage, markTopicVisited, recordMessage, tutorial, sound]);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || isLoading || !sendMessage) return;
    sound.playMessageSend();
    tutorial.notifyInteraction("topics");
    setInput("");
    recordMessage(text);
    sendMessage({ text }, { body: { context: chatContextRef.current } });
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
    <div
      style={{ ...(settings.theme === "light" ? LIGHT_THEME : styleOverrides), zoom: settings.fontScale }}
      data-reduce-motion={settings.reduceAnimations ? "true" : "false"}
      className="relative flex flex-col h-screen max-w-2xl mx-auto border-x border-goshiwon-border night-transition bg-goshiwon-bg"
    >
      <TopBar
        onReset={messages.length > 0 ? promptLeave : undefined}
        onToggleHistory={handleToggleHistory}
        onShare={messages.length > 0 ? handleShare : undefined}
        onShareText={messages.length > 0 ? handleShareText : undefined}
        shareDisabled={shareExporting}
        onToggleVocabulary={handleToggleVocabulary}
        onToggleHelp={toggleHelp}
        onToggleSettings={toggleSettings}
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
          words={words}
          onClose={closeStats}
        />
      )}

      {/* Settings panel */}
      {settingsOpen && (
        <SettingsPanel
          settings={settings}
          onSetTheme={setTheme}
          onSetFontScale={setFontScale}
          onSetReduceAnimations={setReduceAnimations}
          onSetShowRomanization={setShowRomanization}
          isMuted={sound.muted}
          onToggleMute={sound.toggleMute}
          volume={sound.volume}
          onSetVolume={sound.setVolume}
          onClose={closeSettings}
        />
      )}

      {panelOpen && !flashcardActive && !quizActive && (
        <VocabularyPanel
          words={words}
          onRemoveWord={removeWord}
          onUpdateWord={updateWord}
          onClose={closePanel}
          onStartStudy={startFlashcards}
          onStartQuiz={startQuiz}
          studyableCount={studyableCount}
          quizReady={quizReady}
          dueCount={dueCount}
          showRomanization={settings.showRomanization}
        />
      )}

      {panelOpen && flashcardActive && !quizActive && (
        <FlashcardMode
          words={words}
          onClose={endFlashcards}
          onSessionComplete={recordFlashcardComplete}
          onWordGraded={handleWordGraded}
          onCorrectSound={sound.playWordSaved}
          onWrongSound={() => sound.playFlashcardGrade("again")}
          onCompleteSound={sound.playSessionComplete}
        />
      )}

      {panelOpen && quizActive && (
        <QuizMode
          words={words}
          onClose={endQuiz}
          onQuizComplete={handleQuizComplete}
          onCorrectSound={sound.playWordSaved}
          onWrongSound={() => sound.playFlashcardGrade("again")}
          onCompleteSound={sound.playSessionComplete}
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
              dueCount={dueCount}
              onStartStudy={() => { togglePanel(); startFlashcards(); }}
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
                  onTranslationToggleSound={sound.playTranslationToggle}
                  onCopySound={sound.playCopyConfirm}
                  onWordSavedSound={sound.playWordSaved}
                  showRomanization={settings.showRomanization}
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
              {error.message || "An unexpected error occurred."}
            </p>
            <button
              onClick={() => { setErrorDismissed(true); regenerate(); }}
              className="mt-2 px-3 py-1 text-xs font-medium rounded-full bg-goshiwon-accent/30 text-goshiwon-accent-light hover:bg-goshiwon-accent/40 transition-colors"
            >
              Retry
            </button>
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
        onJamoPress={sound.playJamoPress}
        onSpecialKey={sound.playSpecialKey}
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
