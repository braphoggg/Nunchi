"use client";

import { useState, useCallback, useRef } from "react";
import { TUTORIAL_STEPS, type TutorialStep } from "@/lib/tutorial-steps";

const TUTORIAL_COMPLETED_KEY = "nunchi-tutorial-completed";

export interface UseTutorialReturn {
  isActive: boolean;
  currentStep: TutorialStep | null;
  currentStepIndex: number;
  totalSteps: number;
  startTutorial: () => void;
  nextStep: () => void;
  prevStep: () => void;
  skipTutorial: () => void;
  notifyInteraction: (stepId: string) => void;
}

export function useTutorial(): UseTutorialReturn {
  const [active, setActive] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  // Guard against double-advance from interaction + click
  const advancingRef = useRef(false);

  const currentStep = active ? TUTORIAL_STEPS[stepIndex] ?? null : null;

  const finish = useCallback(() => {
    setActive(false);
    setStepIndex(0);
    try {
      localStorage.setItem(TUTORIAL_COMPLETED_KEY, "1");
    } catch {
      // localStorage unavailable
    }
  }, []);

  const startTutorial = useCallback(() => {
    setStepIndex(0);
    setActive(true);
  }, []);

  const nextStep = useCallback(() => {
    if (advancingRef.current) return;
    advancingRef.current = true;
    setTimeout(() => { advancingRef.current = false; }, 200);

    setStepIndex((prev) => {
      if (prev >= TUTORIAL_STEPS.length - 1) {
        finish();
        return 0;
      }
      return prev + 1;
    });
  }, [finish]);

  const prevStep = useCallback(() => {
    setStepIndex((prev) => Math.max(0, prev - 1));
  }, []);

  const skipTutorial = useCallback(() => {
    finish();
  }, [finish]);

  const notifyInteraction = useCallback(
    (stepId: string) => {
      if (!active) return;
      const step = TUTORIAL_STEPS[stepIndex];
      if (step && step.type === "interact" && step.id === stepId) {
        nextStep();
      }
    },
    [active, stepIndex, nextStep],
  );

  return {
    isActive: active,
    currentStep,
    currentStepIndex: stepIndex,
    totalSteps: TUTORIAL_STEPS.length,
    startTutorial,
    nextStep,
    prevStep,
    skipTutorial,
    notifyInteraction,
  };
}
