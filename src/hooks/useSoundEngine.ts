"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { getAudioContext, getMasterGain, setMasterMuted, setMasterVolume, disposeAudioContext } from "@/lib/sound/audio-context";
import { AmbientEngine, type MoodLevel } from "@/lib/sound/ambient-engine";
import {
  startTypingSequence,
  playMessageSend,
  playMessageReceive,
  playJamoPress,
  playSpecialKey,
  playCardFlip,
  playFlashcardGrade,
  playSessionComplete,
  playXPDing,
  playRankUp,
  playWordSaved,
  playTranslationToggle,
  playCopyConfirm,
  playTopicSelect,
  playPanelTransition,
  playKeyboardToggle,
  playTutorialStep,
  playFarewell,
  playMuteAcknowledge,
  playGoshiwonEvent,
  type TypingSequence,
} from "@/lib/sound/sfx-library";

const MUTE_KEY = "nunchi-sound-muted";
const VOLUME_KEY = "nunchi-sound-volume";

/** Max concurrent SFX to prevent node overload. */
const MAX_CONCURRENT = 12;

export function useSoundEngine() {
  const ambientRef = useRef<AmbientEngine | null>(null);
  const typingRef = useRef<TypingSequence | null>(null);
  const concurrentRef = useRef(0);
  const jamoLastRef = useRef(0);

  const [muted, setMuted] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(MUTE_KEY) === "1";
  });

  const [volume, setVolumeState] = useState(() => {
    if (typeof window === "undefined") return 80;
    const stored = localStorage.getItem(VOLUME_KEY);
    if (stored !== null) {
      const parsed = parseInt(stored, 10);
      if (!isNaN(parsed) && parsed >= 0 && parsed <= 100) return parsed;
    }
    return 80;
  });

  // Sync mute + volume to master gain and localStorage
  useEffect(() => {
    setMasterVolume(volume, muted);
    if (typeof window !== "undefined") {
      localStorage.setItem(MUTE_KEY, muted ? "1" : "0");
      localStorage.setItem(VOLUME_KEY, String(volume));
    }
  }, [muted, volume]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      typingRef.current?.stop();
      ambientRef.current?.dispose();
      disposeAudioContext();
    };
  }, []);

  // ─── Helpers ──────────────────────────────────────────────────────

  /** Guard: skip SFX when muted or at polyphony cap. */
  const canPlay = useCallback(() => {
    if (muted) return false;
    if (concurrentRef.current >= MAX_CONCURRENT) return false;
    return true;
  }, [muted]);

  /** Track a short SFX's lifetime for polyphony counting. */
  const trackSfx = useCallback((durationMs: number) => {
    concurrentRef.current++;
    setTimeout(() => { concurrentRef.current = Math.max(0, concurrentRef.current - 1); }, durationMs);
  }, []);

  const getCtxAndOutput = useCallback(() => {
    const ctx = getAudioContext();
    const output = getMasterGain();
    return { ctx, output };
  }, []);

  // ─── Ambient ──────────────────────────────────────────────────────

  const startAmbient = useCallback(() => {
    if (ambientRef.current) return;
    const { ctx, output } = getCtxAndOutput();
    ambientRef.current = new AmbientEngine(ctx, output);
    ambientRef.current.start();
  }, [getCtxAndOutput]);

  const stopAmbient = useCallback(() => {
    ambientRef.current?.stop();
    ambientRef.current = null;
  }, []);

  const setNightStage = useCallback((stage: number) => {
    ambientRef.current?.setNightStage(stage);
  }, []);

  const setMoodLevel = useCallback((mood: MoodLevel) => {
    ambientRef.current?.setMoodLevel(mood);
  }, []);

  // ─── Typing Sequence ──────────────────────────────────────────────

  const startTyping = useCallback(() => {
    if (muted || typingRef.current) return;
    const { ctx, output } = getCtxAndOutput();
    typingRef.current = startTypingSequence(ctx, output);
  }, [muted, getCtxAndOutput]);

  const stopTyping = useCallback(() => {
    typingRef.current?.stop();
    typingRef.current = null;
  }, []);

  // ─── Chat Sounds ──────────────────────────────────────────────────

  const playSend = useCallback(() => {
    if (!canPlay()) return;
    const { ctx, output } = getCtxAndOutput();
    playMessageSend(ctx, output);
    trackSfx(150);
  }, [canPlay, getCtxAndOutput, trackSfx]);

  const playReceive = useCallback(() => {
    if (!canPlay()) return;
    const { ctx, output } = getCtxAndOutput();
    playMessageReceive(ctx, output);
    trackSfx(150);
  }, [canPlay, getCtxAndOutput, trackSfx]);

  // ─── Hangul Keyboard ─────────────────────────────────────────────

  const playJamo = useCallback(() => {
    if (!canPlay()) return;
    // 30ms debounce
    const now = Date.now();
    if (now - jamoLastRef.current < 30) return;
    jamoLastRef.current = now;
    const { ctx, output } = getCtxAndOutput();
    playJamoPress(ctx, output);
    trackSfx(50);
  }, [canPlay, getCtxAndOutput, trackSfx]);

  const playSpecial = useCallback((type: "space" | "enter" | "backspace" | "shift") => {
    if (!canPlay()) return;
    const { ctx, output } = getCtxAndOutput();
    playSpecialKey(ctx, output, type);
    trackSfx(100);
  }, [canPlay, getCtxAndOutput, trackSfx]);

  const playKbToggle = useCallback((opening: boolean) => {
    if (!canPlay()) return;
    const { ctx, output } = getCtxAndOutput();
    playKeyboardToggle(ctx, output, opening);
    trackSfx(150);
  }, [canPlay, getCtxAndOutput, trackSfx]);

  // ─── Flashcards ───────────────────────────────────────────────────

  const playFlip = useCallback(() => {
    if (!canPlay()) return;
    const { ctx, output } = getCtxAndOutput();
    playCardFlip(ctx, output);
    trackSfx(200);
  }, [canPlay, getCtxAndOutput, trackSfx]);

  const playGrade = useCallback((grade: "again" | "good" | "easy") => {
    if (!canPlay()) return;
    const { ctx, output } = getCtxAndOutput();
    playFlashcardGrade(ctx, output, grade);
    trackSfx(200);
  }, [canPlay, getCtxAndOutput, trackSfx]);

  const playComplete = useCallback(() => {
    if (!canPlay()) return;
    const { ctx, output } = getCtxAndOutput();
    playSessionComplete(ctx, output);
    trackSfx(600);
  }, [canPlay, getCtxAndOutput, trackSfx]);

  // ─── Gamification ─────────────────────────────────────────────────

  const playXP = useCallback(() => {
    if (!canPlay()) return;
    const { ctx, output } = getCtxAndOutput();
    playXPDing(ctx, output);
    trackSfx(100);
  }, [canPlay, getCtxAndOutput, trackSfx]);

  const playRankUpSound = useCallback(() => {
    if (!canPlay()) return;
    const { ctx, output } = getCtxAndOutput();
    playRankUp(ctx, output);
    trackSfx(2500);
  }, [canPlay, getCtxAndOutput, trackSfx]);

  const playWordSavedSound = useCallback(() => {
    if (!canPlay()) return;
    const { ctx, output } = getCtxAndOutput();
    playWordSaved(ctx, output);
    trackSfx(100);
  }, [canPlay, getCtxAndOutput, trackSfx]);

  // ─── UI Feedback ──────────────────────────────────────────────────

  const playTransToggle = useCallback(() => {
    if (!canPlay()) return;
    const { ctx, output } = getCtxAndOutput();
    playTranslationToggle(ctx, output);
    trackSfx(50);
  }, [canPlay, getCtxAndOutput, trackSfx]);

  const playCopy = useCallback(() => {
    if (!canPlay()) return;
    const { ctx, output } = getCtxAndOutput();
    playCopyConfirm(ctx, output);
    trackSfx(50);
  }, [canPlay, getCtxAndOutput, trackSfx]);

  const playTopic = useCallback(() => {
    if (!canPlay()) return;
    const { ctx, output } = getCtxAndOutput();
    playTopicSelect(ctx, output);
    trackSfx(100);
  }, [canPlay, getCtxAndOutput, trackSfx]);

  const playPanel = useCallback((direction: "open" | "close") => {
    if (!canPlay()) return;
    const { ctx, output } = getCtxAndOutput();
    playPanelTransition(ctx, output, direction);
    trackSfx(200);
  }, [canPlay, getCtxAndOutput, trackSfx]);

  const playTutorial = useCallback(() => {
    if (!canPlay()) return;
    const { ctx, output } = getCtxAndOutput();
    playTutorialStep(ctx, output);
    trackSfx(100);
  }, [canPlay, getCtxAndOutput, trackSfx]);

  // ─── Special Events ───────────────────────────────────────────────

  const playFarewellSound = useCallback(() => {
    if (!canPlay()) return;
    const { ctx, output } = getCtxAndOutput();
    playFarewell(ctx, output);
    trackSfx(2500);
  }, [canPlay, getCtxAndOutput, trackSfx]);

  const playGoshiwon = useCallback((eventEnglish: string) => {
    if (!canPlay()) return;
    const { ctx, output } = getCtxAndOutput();
    playGoshiwonEvent(ctx, output, eventEnglish, ambientRef.current ?? undefined);
    trackSfx(3000);
  }, [canPlay, getCtxAndOutput, trackSfx]);

  // ─── Mute Toggle ──────────────────────────────────────────────────

  const toggleMute = useCallback(() => {
    setMuted((prev) => {
      const next = !prev;
      // Play acknowledge sound (bypasses master gain)
      try {
        const ctx = getAudioContext();
        playMuteAcknowledge(ctx, next);
      } catch { /* ok */ }
      return next;
    });
  }, []);

  const setVolume = useCallback((v: number) => {
    setVolumeState(Math.max(0, Math.min(100, Math.round(v))));
  }, []);

  // ─── Backward-compatible aliases ──────────────────────────────────

  const playKeyClick = playJamo;
  const playAmbientHum = useCallback(() => {
    // Legacy: no longer used separately; ambient is handled by startAmbient/typing
  }, []);

  return {
    // Legacy API (backward compat)
    playKeyClick,
    playAmbientHum,
    muted,
    toggleMute,
    volume,
    setVolume,

    // Ambient
    startAmbient,
    stopAmbient,
    setNightStage,
    setMoodLevel,

    // Typing
    startTyping,
    stopTyping,

    // Chat
    playMessageSend: playSend,
    playMessageReceive: playReceive,

    // Hangul keyboard
    playJamoPress: playJamo,
    playSpecialKey: playSpecial,
    playKeyboardToggle: playKbToggle,

    // Flashcards
    playCardFlip: playFlip,
    playFlashcardGrade: playGrade,
    playSessionComplete: playComplete,

    // Gamification
    playXPDing: playXP,
    playRankUp: playRankUpSound,
    playWordSaved: playWordSavedSound,

    // UI feedback
    playTranslationToggle: playTransToggle,
    playCopyConfirm: playCopy,
    playTopicSelect: playTopic,
    playPanelTransition: playPanel,
    playTutorialStep: playTutorial,

    // Special events
    playFarewell: playFarewellSound,
    playGoshiwonEvent: playGoshiwon,
  };
}
