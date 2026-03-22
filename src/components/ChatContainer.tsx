"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import TopBar from "./TopBar";
import MessageBubble from "./MessageBubble";
import ChatInput from "./ChatInput";
import TypingIndicator from "./TypingIndicator";
import WelcomeScreen from "./WelcomeScreen";
import VocabularyPanel from "./VocabularyPanel";
import FlashcardMode from "./FlashcardMode";
import QuizMode from "./QuizMode";
import WritingMode from "./WritingMode";
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
import HangulKeyboard, { type HangulKeyboardHandle } from "./HangulKeyboard";
import { useSoundEngine } from "@/hooks/useSoundEngine";
import { useSettings } from "@/hooks/useSettings";
import { useTutorial } from "@/hooks/useTutorial";
import { useVocabulary } from "@/hooks/useVocabulary";
import { useFlashcards } from "@/hooks/useFlashcards";
import { useAtmosphere } from "@/hooks/useAtmosphere";
import { useOverlayState } from "@/hooks/useOverlayState";
import { useViewportHeight } from "@/hooks/useViewportHeight";
import { useGamification } from "@/hooks/useGamification";
import { useLessonHistory } from "@/hooks/useLessonHistory";
import { useApiKey } from "@/hooks/useApiKey";
import { useAchievements } from "@/hooks/useAchievements";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { useDailyChallenges } from "@/hooks/useDailyChallenges";
import NetworkBanner from "./NetworkBanner";
import AchievementToast from "./AchievementToast";
import LessonComplete from "./LessonComplete";
import { resetTimestampCounter } from "@/lib/timestamps";
import { getTextContent } from "@/lib/message-utils";
import { LESSON_TOPICS } from "@/lib/lesson-topics";
import type { ResidentRank } from "@/types";
import { computeNextSRS, getSRSState } from "@/lib/srs";
import { MIN_QUIZ_WORDS } from "@/lib/quiz-generator";
import type { FlashcardGrade } from "@/hooks/useFlashcards";
import { SoundProvider } from "@/contexts/SoundContext";
import { SettingsProvider } from "@/contexts/SettingsContext";
import { GamificationProvider } from "@/contexts/GamificationContext";

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
  const { apiKey, setApiKey, clearApiKey } = useApiKey();

  // Active lesson topic (set when user picks a topic from WelcomeScreen)
  const [activeTopic, setActiveTopic] = useState<{ id: string; titleKr: string; difficulty: string } | null>(null);

  const chatTransport = useMemo(
    () => new DefaultChatTransport({ headers: apiKey ? { "x-api-key": apiKey } : undefined }),
    [apiKey],
  );
  const { messages, sendMessage, regenerate, status, error, setMessages } = useChat({
    transport: chatTransport,
  });
  const [input, setInput] = useState("");
  const inputRef = useRef(input);
  inputRef.current = input;
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const prevMessageCountRef = useRef(0);
  const hangulKeyboardRef = useRef<HangulKeyboardHandle>(null);

  // Share conversation as image
  const { handleShare, handleShareText, exporting: shareExporting } = useShareConversation(messages);

  const isLoading = status === "submitted" || status === "streaming";

  // Sound engine
  const sound = useSoundEngine();

  // Accessibility settings
  const { settings, resolvedTheme, setTheme, setFontScale, setReduceAnimations, setShowRomanization, setTTSRate } = useSettings();

  // Network status
  const { isOnline, wasOffline, dismissReconnected } = useNetworkStatus();

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
    setInput((prev) => {
      const next = prev + text;
      inputRef.current = next; // sync ref immediately for flush-then-send
      return next;
    });
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
    () => words.filter((w) => w.english?.trim() || w.romanization?.trim()).length >= MIN_QUIZ_WORDS,
    [words],
  );
  const startQuiz = useCallback(() => setQuizActive(true), []);
  const endQuiz = useCallback(() => setQuizActive(false), []);

  // Writing practice mode
  const [writingActive, setWritingActive] = useState(false);
  const startWriting = useCallback(() => setWritingActive(true), []);
  const endWriting = useCallback(() => setWritingActive(false), []);

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

  // Gamification
  const {
    totalXP,
    xpHistory,
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

  // Achievements
  const { progress: achievementProgress, recentAchievement, checkAndUnlock } = useAchievements();

  // Daily challenges
  const { challengeState, recordProgress: recordChallengeProgress } = useDailyChallenges();

  // Atmosphere: ambient sound, night mode, mood, goshiwon events
  const { styleOverrides, activeEvent, dismissEvent, currentMood, nightStage } = useAtmosphere({
    messages,
    isLoading,
    recentXPGain,
    sound,
    tutorial,
  });

  // Check achievements whenever relevant state changes
  useEffect(() => {
    const fullKoreanCount = xpHistory.filter((e) => e.action === "message_full_korean").length;
    const perfectQuizCount = xpHistory.filter((e) => e.action === "quiz_perfect").length;
    const perfectFlashcardCount = xpHistory.filter((e) => e.action === "flashcard_perfect").length;
    checkAndUnlock({
      totalXP,
      vocabCount: wordCount,
      currentStreak,
      longestStreak,
      totalMessages: stats.totalMessages,
      totalFlashcardSessions: stats.totalFlashcardSessions,
      totalTranslations: stats.totalTranslations,
      messagesWithoutTranslate: stats.messagesWithoutTranslate,
      rankId: rank.id,
      fullKoreanMessageCount: fullKoreanCount,
      nightStage,
      perfectQuizCount,
      perfectFlashcardCount,
    });
  }, [totalXP, wordCount, currentStreak, longestStreak, stats, rank.id, nightStage, xpHistory, checkAndUnlock]);

  // Quiz completion handler
  const handleQuizComplete = useCallback(
    (result: { correct: number; total: number }) => {
      recordQuizComplete(result.correct, result.total);
      if (result.correct === result.total && result.total > 0) {
        recordChallengeProgress("quiz_perfect", 1);
      }
    },
    [recordQuizComplete, recordChallengeProgress],
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

  // Auto-open keyboard for tutorial step "hangul-keys", auto-close when leaving.
  // A ref tracks whether the tutorial (not the user) opened the keyboard so
  // normal keyboard usage outside the tutorial is never affected.
  const tutorialOpenedKbRef = useRef(false);
  useEffect(() => {
    if (!tutorial.isActive) {
      // Tutorial ended — close keyboard only if the tutorial opened it
      if (tutorialOpenedKbRef.current && keyboardVisible) {
        setKeyboardVisible(false);
      }
      tutorialOpenedKbRef.current = false;
      return;
    }
    if (tutorial.currentStep?.id === "hangul-keys") {
      if (!keyboardVisible) {
        setKeyboardVisible(true);
        tutorialOpenedKbRef.current = true;
      }
    } else if (tutorialOpenedKbRef.current && keyboardVisible) {
      // Moved past hangul-keys step — close the auto-opened keyboard
      setKeyboardVisible(false);
      tutorialOpenedKbRef.current = false;
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

  // Overlay panel state (stats, help, settings)
  const {
    statsOpen, toggleStats, closeStats,
    helpOpen, toggleHelp, closeHelp,
    settingsOpen, toggleSettings, closeSettings,
  } = useOverlayState(sound, closePanel);

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

  // Escape key — Modal handles its own Escape for overlay panels.
  // ChatContainer only handles non-Modal overlays (tutorial, leave dialog, keyboard).
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        if (tutorial.isActive) { tutorial.skipTutorial(); return; }
        if (confirmLeave) { cancelLeave(); return; }
        // Guard: if any Modal-based overlay is open, let Modal handle it
        if (helpOpen || settingsOpen || reviewingConversation || historyOpen || statsOpen || quizActive || flashcardActive || panelOpen) return;
        if (keyboardVisible) { setKeyboardVisible(false); return; }
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [tutorial, confirmLeave, helpOpen, settingsOpen, reviewingConversation, historyOpen, statsOpen, quizActive, flashcardActive, panelOpen, keyboardVisible, cancelLeave]);

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

  // Lesson completion state
  const [lessonComplete, setLessonComplete] = useState<{
    topicTitle: string;
    topicTitleKr: string;
    wordsLearned: number;
    xpEarned: number;
  } | null>(null);
  const sessionStartXPRef = useRef(totalXP);
  const sessionStartWordCountRef = useRef(wordCount);

  // Error dismiss
  const [errorDismissed, setErrorDismissed] = useState(false);

  // Transition state
  const [transitioning, setTransitioning] = useState(false);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Accurate viewport height for mobile browsers
  useViewportHeight();

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

  // Final reset — clear everything and return to welcome
  const doReset = useCallback(() => {
    setMessages([]);
    setShowFarewell(false);
    setLessonComplete(null);
    setInput("");
    setActiveTopic(null);
    resetTimestampCounter();
    prevMessageCountRef.current = 0;
  }, [setMessages]);

  // Reset conversation — show lesson complete if a topic was active
  const handleReset = useCallback(() => {
    setConfirmLeave(false);
    endQuiz();
    endFlashcards();
    endWriting();
    closePanel();
    closeStats();
    closeHistory();
    closeSettings();
    if (messages.length > 0) {
      saveConversation(
        messages.map((m) => ({ role: m.role, text: getTextContent(m) }))
      );
    }

    // Show lesson completion screen if a topic was active
    if (activeTopic && messages.length > 1) {
      const topic = LESSON_TOPICS.find((t) => t.id === activeTopic.id);
      setLessonComplete({
        topicTitle: topic?.title ?? activeTopic.id,
        topicTitleKr: activeTopic.titleKr,
        wordsLearned: Math.max(0, wordCount - sessionStartWordCountRef.current),
        xpEarned: Math.max(0, totalXP - sessionStartXPRef.current),
      });
      // Clear messages but keep lessonComplete overlay
      setShowFarewell(true);
      sound.playFarewell();
      setTimeout(() => {
        setMessages([]);
        setShowFarewell(false);
        setActiveTopic(null);
        resetTimestampCounter();
        prevMessageCountRef.current = 0;
      }, 1500);
    } else {
      setShowFarewell(true);
      sound.playFarewell();
      setTimeout(doReset, 2000);
    }
  }, [setMessages, messages, closePanel, endFlashcards, closeStats, closeHistory, closeSettings, saveConversation, sound, activeTopic, wordCount, totalXP, doReset]);

  const handleTopicSelect = useCallback((message: string, topicId: string) => {
    if (!sendMessage) {
      console.error("[ChatContainer] sendMessage not available");
      return;
    }
    // Snapshot start state for lesson completion summary
    sessionStartXPRef.current = totalXP;
    sessionStartWordCountRef.current = wordCount;
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
    // Flush any in-progress Hangul composition to input state before sending
    hangulKeyboardRef.current?.flushComposition();
    // Read from ref to get the freshest value after flush
    const text = inputRef.current.trim();
    if (!text || isLoading || !sendMessage) return;
    sound.playMessageSend();
    tutorial.notifyInteraction("topics");
    setInput("");
    recordMessage(text);
    sendMessage({ text }, { body: { context: chatContextRef.current } });
  };

  // Wrap addWords to also record XP for saved words + daily challenges
  const handleSaveWords = useCallback(
    (newWords: Parameters<typeof addWords>[0]) => {
      addWords(newWords);
      recordWordSaved(newWords.length);
      recordChallengeProgress("words_saved", newWords.length);
    },
    [addWords, recordWordSaved, recordChallengeProgress]
  );

  const settingsCtx = useMemo(
    () => ({ settings, resolvedTheme, setTheme, setFontScale, setReduceAnimations, setShowRomanization, setTTSRate, apiKey, setApiKey, clearApiKey }),
    [settings, resolvedTheme, setTheme, setFontScale, setReduceAnimations, setShowRomanization, setTTSRate, apiKey, setApiKey, clearApiKey],
  );

  const gamificationCtx = useMemo(
    () => ({
      totalXP, xpHistory, recentXPGain, koreanHint, currentStreak, longestStreak,
      rank, rankProgress, nextRank, stats,
      recordMessage, recordTranslation, recordFlashcardComplete, recordQuizComplete, recordWordSaved,
      vocabCount: wordCount, words,
      achievementProgress,
    }),
    [totalXP, xpHistory, recentXPGain, koreanHint, currentStreak, longestStreak,
     rank, rankProgress, nextRank, stats,
     recordMessage, recordTranslation, recordFlashcardComplete, recordQuizComplete, recordWordSaved,
     wordCount, words, achievementProgress],
  );

  return (
    <SoundProvider value={sound}>
    <SettingsProvider value={settingsCtx}>
    <GamificationProvider value={gamificationCtx}>
    <div
      style={{ ...(resolvedTheme === "light" ? LIGHT_THEME : styleOverrides), zoom: settings.fontScale }}
      data-reduce-motion={settings.reduceAnimations ? "true" : "false"}
      data-theme={resolvedTheme}
      className="relative flex flex-col overflow-clip app-height max-w-2xl mx-auto border-x border-goshiwon-border night-transition bg-goshiwon-bg goshiwon-atmosphere"
    >
      <NetworkBanner isOnline={isOnline} wasOffline={wasOffline} onDismiss={dismissReconnected} />
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

      {/* Lesson complete overlay */}
      {lessonComplete && (
        <LessonComplete
          topicTitle={lessonComplete.topicTitle}
          topicTitleKr={lessonComplete.topicTitleKr}
          wordsLearned={lessonComplete.wordsLearned}
          xpEarned={lessonComplete.xpEarned}
          currentStreak={currentStreak}
          onReviewVocabulary={() => { setLessonComplete(null); togglePanel(); startFlashcards(); }}
          onReturnHome={() => { setLessonComplete(null); doReset(); }}
        />
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
        <StatsPanel onClose={closeStats} />
      )}

      {/* Settings panel */}
      {settingsOpen && (
        <SettingsPanel onClose={closeSettings} />
      )}

      {panelOpen && !flashcardActive && !quizActive && !writingActive && (
        <VocabularyPanel
          words={words}
          onRemoveWord={removeWord}
          onUpdateWord={updateWord}
          onClose={closePanel}
          onStartStudy={startFlashcards}
          onStartQuiz={startQuiz}
          onStartWriting={startWriting}
          studyableCount={studyableCount}
          quizReady={quizReady}
          dueCount={dueCount}
        />
      )}

      {panelOpen && flashcardActive && !quizActive && (
        <FlashcardMode
          words={words}
          onClose={endFlashcards}
          onSessionComplete={recordFlashcardComplete}
          onWordGraded={handleWordGraded}
        />
      )}

      {panelOpen && quizActive && (
        <QuizMode
          words={words}
          onClose={endQuiz}
          onQuizComplete={handleQuizComplete}
        />
      )}

      {panelOpen && writingActive && (
        <WritingMode
          words={words}
          onClose={endWriting}
          onSessionComplete={recordFlashcardComplete}
          onWordGraded={handleWordGraded}
        />
      )}

      <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-3">
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
              challengeState={challengeState}
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
              className="absolute top-2 right-2 text-goshiwon-text-muted hover:text-goshiwon-text transition-colors p-1 min-h-[44px] min-w-[44px] flex items-center justify-center"
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

      {/* Achievement Toast */}
      {recentAchievement && (
        <AchievementToast achievement={recentAchievement} />
      )}

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

      {/* mt-auto pushes to container bottom even if flex-1 doesn't absorb
          all space; shrink-0 prevents compression on tight viewports */}
      <div className="shrink-0 mt-auto">
        <HangulKeyboard
          ref={hangulKeyboardRef}
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
          isOffline={!isOnline}
          keyboardVisible={keyboardVisible}
          onToggleKeyboard={toggleKeyboard}
        />
      </div>

      {/* First-run onboarding overlay */}
      {showOnboarding && apiKey && (
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
    </GamificationProvider>
    </SettingsProvider>
    </SoundProvider>
  );
}
