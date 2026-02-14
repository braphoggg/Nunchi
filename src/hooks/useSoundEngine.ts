"use client";

import { useRef, useState, useCallback, useEffect } from "react";

export function useSoundEngine() {
  const ctxRef = useRef<AudioContext | null>(null);
  const [muted, setMuted] = useState(false);

  const getCtx = useCallback(() => {
    if (!ctxRef.current) {
      ctxRef.current = new AudioContext();
    }
    return ctxRef.current;
  }, []);

  const playKeyClick = useCallback(() => {
    if (muted) return;
    try {
      const ctx = getCtx();
      const duration = 0.04;
      const bufferSize = Math.floor(ctx.sampleRate * duration);
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * 0.03;
      }
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      const filter = ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = 800;
      source.connect(filter).connect(ctx.destination);
      source.start();
    } catch {
      // Silently fail if audio context isn't available
    }
  }, [muted, getCtx]);

  const playAmbientHum = useCallback(() => {
    if (muted) return;
    try {
      const ctx = getCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = 60;
      gain.gain.value = 0.015;
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 2);
      osc.connect(gain).connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 2);
    } catch {
      // Silently fail if audio context isn't available
    }
  }, [muted, getCtx]);

  const toggleMute = useCallback(() => setMuted((m) => !m), []);

  useEffect(() => {
    return () => {
      ctxRef.current?.close();
    };
  }, []);

  return { playKeyClick, playAmbientHum, muted, toggleMute };
}
