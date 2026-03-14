"use client";

import { useEffect, useMemo, useRef } from "react";
import type { UIMessage } from "ai";
import type { useSoundEngine } from "./useSoundEngine";
import type { useTutorial } from "./useTutorial";
import { useGoshiwonEvents } from "./useGoshiwonEvents";
import { useNightProgression } from "./useNightProgression";
import { getTextContent } from "@/lib/message-utils";
import { computeKoreanRatio, getMoodLevel } from "@/lib/mood-engine";

interface UseAtmosphereOptions {
  messages: UIMessage[];
  isLoading: boolean;
  recentXPGain: { amount: number; action: string } | null;
  sound: ReturnType<typeof useSoundEngine>;
  tutorial: ReturnType<typeof useTutorial>;
}

export function useAtmosphere({
  messages,
  isLoading,
  recentXPGain,
  sound,
  tutorial,
}: UseAtmosphereOptions) {
  // Goshiwon atmospheric events
  const assistantMsgCount = useMemo(
    () => messages.filter((m) => m.role === "assistant").length,
    [messages],
  );
  const { activeEvent, dismissEvent } = useGoshiwonEvents(assistantMsgCount);

  // Night mode progression
  const { stage: nightStage, styleOverrides } = useNightProgression(messages.length);

  // Compute current mood from message history
  const currentMood = useMemo(() => {
    if (messages.length === 0) return "neutral" as const;
    const simpleMessages = messages.map((m) => ({
      role: m.role,
      content: getTextContent(m),
    }));
    return getMoodLevel(computeKoreanRatio(simpleMessages));
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

  // Moon-jo typing sequence
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

  return {
    styleOverrides,
    activeEvent,
    dismissEvent,
    currentMood,
    nightStage,
  };
}
