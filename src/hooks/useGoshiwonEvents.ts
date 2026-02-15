"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { getRandomEvent, type GoshiwonEvent } from "@/lib/goshiwon-events";

/**
 * Hook that triggers random atmospheric goshiwon events
 * based on the number of assistant messages in the conversation.
 *
 * Events have a 40% chance of triggering every 3-7 assistant messages.
 * Active events auto-dismiss after 6 seconds or can be manually dismissed.
 */
export function useGoshiwonEvents(assistantMessageCount: number) {
  const [activeEvent, setActiveEvent] = useState<GoshiwonEvent | null>(null);
  const lastTriggerCountRef = useRef(0);
  const nextThresholdRef = useRef(3 + Math.floor(Math.random() * 5)); // 3-7
  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dismissEvent = useCallback(() => {
    setActiveEvent(null);
    if (dismissTimerRef.current) {
      clearTimeout(dismissTimerRef.current);
      dismissTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    // Only check when assistant message count increases
    if (assistantMessageCount <= lastTriggerCountRef.current) return;
    if (assistantMessageCount < nextThresholdRef.current) {
      lastTriggerCountRef.current = assistantMessageCount;
      return;
    }

    lastTriggerCountRef.current = assistantMessageCount;

    // 40% chance to trigger
    if (Math.random() > 0.4) {
      // Set next threshold even if we skip
      nextThresholdRef.current =
        assistantMessageCount + 3 + Math.floor(Math.random() * 5);
      return;
    }

    // Trigger event
    const event = getRandomEvent();
    setActiveEvent(event);

    // Set next threshold
    nextThresholdRef.current =
      assistantMessageCount + 3 + Math.floor(Math.random() * 5);

    // Auto-dismiss after 6 seconds
    if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
    dismissTimerRef.current = setTimeout(() => {
      setActiveEvent(null);
      dismissTimerRef.current = null;
    }, 6000);
  }, [assistantMessageCount]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
    };
  }, []);

  return { activeEvent, dismissEvent };
}
