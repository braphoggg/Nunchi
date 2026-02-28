/**
 * SFX Library — All one-shot procedurally generated sound effects.
 *
 * Every function creates a short-lived audio graph, schedules it,
 * and arranges automatic cleanup via onended callbacks.
 * All volumes are deliberately low — atmosphere, not assault.
 */

import { getWhiteNoiseBuffer, getBrownNoiseBuffer, getPinkNoiseBuffer } from "./noise-generator";
import { applySweep, scheduleCleanup } from "./synthesis-utils";

// ─── Moon-jo Typing Sequence ───────────────────────────────────────

export interface TypingSequence {
  stop: () => void;
}

export function startTypingSequence(
  ctx: AudioContext,
  output: GainNode,
): TypingSequence {
  let running = true;
  let timeout: ReturnType<typeof setTimeout> | null = null;
  let strokeCount = 0;

  // Background hum (Moon-jo's lamp)
  const lampOsc = ctx.createOscillator();
  lampOsc.type = "sine";
  lampOsc.frequency.value = 60;
  const lampGain = ctx.createGain();
  lampGain.gain.value = 0.0001;
  lampOsc.connect(lampGain).connect(output);
  lampOsc.start();
  // Fade in over 1s
  lampGain.gain.exponentialRampToValueAtTime(0.02, ctx.currentTime + 1);

  function playStroke(): void {
    if (!running) return;
    strokeCount++;

    const now = ctx.currentTime;
    const noise = getWhiteNoiseBuffer(ctx, 0.1);
    const source = ctx.createBufferSource();
    source.buffer = noise;
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 500 + Math.random() * 200; // 500-700Hz randomized
    const gain = ctx.createGain();
    gain.gain.value = 0.025;
    gain.gain.setValueAtTime(0.025, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.03);

    source.connect(filter).connect(gain).connect(output);
    source.start(now);
    source.stop(now + 0.03);
    source.onended = () => { source.disconnect(); filter.disconnect(); gain.disconnect(); };

    // Every 4-6th stroke: thock
    if (strokeCount % (4 + Math.floor(Math.random() * 3)) === 0) {
      const thock = ctx.createOscillator();
      thock.type = "sine";
      thock.frequency.value = 150;
      const tGain = ctx.createGain();
      tGain.gain.value = 0.015;
      tGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.005);
      thock.connect(tGain).connect(output);
      thock.start(now);
      thock.stop(now + 0.005);
      thock.onended = () => { thock.disconnect(); tGain.disconnect(); };
    }

    // Schedule next stroke
    const interval = 250 + Math.random() * 200;
    timeout = setTimeout(playStroke, interval);
  }

  playStroke();

  return {
    stop() {
      running = false;
      if (timeout) clearTimeout(timeout);
      // Fade out lamp over 2s
      const now = ctx.currentTime;
      lampGain.gain.cancelScheduledValues(now);
      lampGain.gain.setValueAtTime(Math.max(lampGain.gain.value, 0.0001), now);
      lampGain.gain.exponentialRampToValueAtTime(0.0001, now + 2);
      setTimeout(() => {
        try { lampOsc.stop(); lampOsc.disconnect(); lampGain.disconnect(); } catch { /* ok */ }
      }, 2200);
    },
  };
}

// ─── Chat Sounds ───────────────────────────────────────────────────

export function playMessageSend(ctx: AudioContext, output: GainNode): void {
  const now = ctx.currentTime;

  // Two ascending sines: 440Hz 40ms → 523Hz 60ms
  const osc1 = ctx.createOscillator();
  osc1.type = "sine";
  osc1.frequency.value = 440;
  const g1 = ctx.createGain();
  g1.gain.value = 0.03;
  g1.gain.setValueAtTime(0.0001, now);
  g1.gain.exponentialRampToValueAtTime(0.03, now + 0.005);
  g1.gain.exponentialRampToValueAtTime(0.0001, now + 0.04);

  const osc2 = ctx.createOscillator();
  osc2.type = "sine";
  osc2.frequency.value = 523;
  const g2 = ctx.createGain();
  g2.gain.value = 0;
  g2.gain.setValueAtTime(0.0001, now + 0.04);
  g2.gain.exponentialRampToValueAtTime(0.03, now + 0.045);
  g2.gain.exponentialRampToValueAtTime(0.0001, now + 0.1);

  const lpf = ctx.createBiquadFilter();
  lpf.type = "lowpass";
  lpf.frequency.value = 1500;

  osc1.connect(g1).connect(lpf).connect(output);
  osc2.connect(g2).connect(lpf);

  osc1.start(now); osc1.stop(now + 0.04);
  osc2.start(now + 0.04); osc2.stop(now + 0.1);

  osc1.onended = () => { osc1.disconnect(); g1.disconnect(); };
  osc2.onended = () => { osc2.disconnect(); g2.disconnect(); lpf.disconnect(); };
}

export function playMessageReceive(ctx: AudioContext, output: GainNode): void {
  const now = ctx.currentTime;

  // Descending 392→330Hz sine 80ms
  const osc = ctx.createOscillator();
  osc.type = "sine";
  applySweep(osc.frequency, ctx, 392, 330, 0.08, "exponential", now);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, now);
  g.gain.exponentialRampToValueAtTime(0.025, now + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, now + 0.08);

  osc.connect(g).connect(output);
  osc.start(now); osc.stop(now + 0.08);

  // Noise whisper
  const noise = getWhiteNoiseBuffer(ctx, 0.1);
  const nSrc = ctx.createBufferSource();
  nSrc.buffer = noise;
  const nBp = ctx.createBiquadFilter();
  nBp.type = "bandpass";
  nBp.frequency.value = 1000;
  nBp.Q.value = 1;
  const nG = ctx.createGain();
  nG.gain.value = 0.01;
  nSrc.connect(nBp).connect(nG).connect(output);
  nSrc.start(now + 0.08); nSrc.stop(now + 0.1);

  osc.onended = () => { osc.disconnect(); g.disconnect(); };
  nSrc.onended = () => { nSrc.disconnect(); nBp.disconnect(); nG.disconnect(); };
}

// ─── Hangul Keyboard ───────────────────────────────────────────────

export function playJamoPress(ctx: AudioContext, output: GainNode): void {
  const now = ctx.currentTime;

  // Noise click
  const noise = getWhiteNoiseBuffer(ctx, 0.1);
  const src = ctx.createBufferSource();
  src.buffer = noise;
  const bp = ctx.createBiquadFilter();
  bp.type = "bandpass";
  bp.frequency.value = 1000 + Math.random() * 400; // 1000-1400Hz
  bp.Q.value = 3;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.035, now);
  g.gain.exponentialRampToValueAtTime(0.0001, now + 0.02);
  src.connect(bp).connect(g).connect(output);
  src.start(now); src.stop(now + 0.02);

  // Sine transient
  const osc = ctx.createOscillator();
  osc.type = "sine";
  osc.frequency.value = 800;
  const og = ctx.createGain();
  og.gain.setValueAtTime(0.02, now);
  og.gain.exponentialRampToValueAtTime(0.0001, now + 0.005);
  osc.connect(og).connect(output);
  osc.start(now); osc.stop(now + 0.005);

  src.onended = () => { src.disconnect(); bp.disconnect(); g.disconnect(); };
  osc.onended = () => { osc.disconnect(); og.disconnect(); };
}

export function playSpecialKey(
  ctx: AudioContext,
  output: GainNode,
  type: "space" | "enter" | "backspace" | "shift",
): void {
  const now = ctx.currentTime;
  const noise = getWhiteNoiseBuffer(ctx, 0.1);

  if (type === "space") {
    const src = ctx.createBufferSource();
    src.buffer = noise;
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass"; lp.frequency.value = 800;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.03, now);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.04);
    src.connect(lp).connect(g).connect(output);
    src.start(now); src.stop(now + 0.04);
    src.onended = () => { src.disconnect(); lp.disconnect(); g.disconnect(); };
  } else if (type === "enter") {
    // Noise burst
    const src = ctx.createBufferSource();
    src.buffer = noise;
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass"; bp.frequency.value = 1000; bp.Q.value = 2;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.035, now);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.03);
    src.connect(bp).connect(g).connect(output);
    src.start(now); src.stop(now + 0.03);
    // Sine tail
    const osc = ctx.createOscillator();
    osc.type = "sine"; osc.frequency.value = 220;
    const og = ctx.createGain();
    og.gain.setValueAtTime(0.025, now + 0.03);
    og.gain.exponentialRampToValueAtTime(0.0001, now + 0.09);
    osc.connect(og).connect(output);
    osc.start(now + 0.03); osc.stop(now + 0.09);
    src.onended = () => { src.disconnect(); bp.disconnect(); g.disconnect(); };
    osc.onended = () => { osc.disconnect(); og.disconnect(); };
  } else if (type === "backspace") {
    const src = ctx.createBufferSource();
    src.buffer = noise;
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass"; bp.Q.value = 2;
    applySweep(bp.frequency, ctx, 1500, 600, 0.03, "exponential", now);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.025, now);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.03);
    src.connect(bp).connect(g).connect(output);
    src.start(now); src.stop(now + 0.03);
    src.onended = () => { src.disconnect(); bp.disconnect(); g.disconnect(); };
  } else {
    // shift: tick
    const src = ctx.createBufferSource();
    src.buffer = noise;
    const hp = ctx.createBiquadFilter();
    hp.type = "highpass"; hp.frequency.value = 2000;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.02, now);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.015);
    src.connect(hp).connect(g).connect(output);
    src.start(now); src.stop(now + 0.015);
    src.onended = () => { src.disconnect(); hp.disconnect(); g.disconnect(); };
  }
}

// ─── Flashcard Sounds ──────────────────────────────────────────────

export function playCardFlip(ctx: AudioContext, output: GainNode): void {
  const now = ctx.currentTime;
  const noise = getWhiteNoiseBuffer(ctx, 0.1);

  // Part 1: lift (bandpass 1-3kHz)
  const s1 = ctx.createBufferSource(); s1.buffer = noise;
  const bp1 = ctx.createBiquadFilter();
  bp1.type = "bandpass"; bp1.frequency.value = 2000; bp1.Q.value = 0.8;
  const g1 = ctx.createGain();
  g1.gain.setValueAtTime(0.0001, now);
  g1.gain.exponentialRampToValueAtTime(0.03, now + 0.01);
  g1.gain.exponentialRampToValueAtTime(0.0001, now + 0.04);
  s1.connect(bp1).connect(g1).connect(output);
  s1.start(now); s1.stop(now + 0.04);

  // Part 2: land (lowpass 500Hz, heavier)
  const s2 = ctx.createBufferSource(); s2.buffer = noise;
  const lp = ctx.createBiquadFilter();
  lp.type = "lowpass"; lp.frequency.value = 500;
  const g2 = ctx.createGain();
  g2.gain.setValueAtTime(0.025, now + 0.07);
  g2.gain.exponentialRampToValueAtTime(0.0001, now + 0.13);
  s2.connect(lp).connect(g2).connect(output);
  s2.start(now + 0.07); s2.stop(now + 0.13);

  s1.onended = () => { s1.disconnect(); bp1.disconnect(); g1.disconnect(); };
  s2.onended = () => { s2.disconnect(); lp.disconnect(); g2.disconnect(); };
}

export function playFlashcardGrade(
  ctx: AudioContext,
  output: GainNode,
  grade: "again" | "good" | "easy",
): void {
  const now = ctx.currentTime;

  if (grade === "again") {
    // Unsettling: 200Hz + 203Hz (3Hz beat frequency)
    const o1 = ctx.createOscillator(); o1.type = "sine"; o1.frequency.value = 200;
    const o2 = ctx.createOscillator(); o2.type = "sine"; o2.frequency.value = 203;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(0.03, now + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.15);
    o1.connect(g).connect(output);
    o2.connect(g);
    o1.start(now); o1.stop(now + 0.15);
    o2.start(now); o2.stop(now + 0.15);
    o1.onended = () => { o1.disconnect(); };
    o2.onended = () => { o2.disconnect(); g.disconnect(); };
  } else if (grade === "good") {
    const o = ctx.createOscillator(); o.type = "sine"; o.frequency.value = 330;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(0.025, now + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.1);
    o.connect(g).connect(output);
    o.start(now); o.stop(now + 0.1);
    o.onended = () => { o.disconnect(); g.disconnect(); };
  } else {
    // Easy: ascending + chorus
    const o1 = ctx.createOscillator(); o1.type = "sine"; o1.frequency.value = 440;
    const o2 = ctx.createOscillator(); o2.type = "sine"; o2.frequency.value = 441;
    const g1 = ctx.createGain();
    g1.gain.setValueAtTime(0.0001, now);
    g1.gain.exponentialRampToValueAtTime(0.03, now + 0.005);
    g1.gain.exponentialRampToValueAtTime(0.0001, now + 0.06);
    o1.connect(g1).connect(output);
    o2.connect(g1);
    o1.start(now); o1.stop(now + 0.06);
    o2.start(now); o2.stop(now + 0.06);

    const o3 = ctx.createOscillator(); o3.type = "sine"; o3.frequency.value = 523;
    const o4 = ctx.createOscillator(); o4.type = "sine"; o4.frequency.value = 524;
    const g2 = ctx.createGain();
    g2.gain.setValueAtTime(0.0001, now + 0.06);
    g2.gain.exponentialRampToValueAtTime(0.03, now + 0.065);
    g2.gain.exponentialRampToValueAtTime(0.0001, now + 0.14);
    o3.connect(g2).connect(output);
    o4.connect(g2);
    o3.start(now + 0.06); o3.stop(now + 0.14);
    o4.start(now + 0.06); o4.stop(now + 0.14);

    o1.onended = () => { o1.disconnect(); };
    o2.onended = () => { o2.disconnect(); g1.disconnect(); };
    o3.onended = () => { o3.disconnect(); };
    o4.onended = () => { o4.disconnect(); g2.disconnect(); };
  }
}

export function playSessionComplete(ctx: AudioContext, output: GainNode): void {
  const now = ctx.currentTime;
  const notes = [330, 392, 523];
  const durations = [0.1, 0.1, 0.15];
  const gap = 0.02;

  // Bandpass to simulate cheap speaker feel
  const bp = ctx.createBiquadFilter();
  bp.type = "bandpass"; bp.frequency.value = 1500; bp.Q.value = 0.5;
  bp.connect(output);

  let t = now;
  const allNodes: AudioNode[] = [bp];

  for (let i = 0; i < notes.length; i++) {
    const osc = ctx.createOscillator(); osc.type = "sine"; osc.frequency.value = notes[i];
    const tri = ctx.createOscillator(); tri.type = "triangle"; tri.frequency.value = notes[i];
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.035, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + durations[i]);
    osc.connect(g).connect(bp);
    tri.connect(g);
    osc.start(t); osc.stop(t + durations[i]);
    tri.start(t); tri.stop(t + durations[i]);
    allNodes.push(osc, tri, g);
    t += durations[i] + gap;
  }

  scheduleCleanup(allNodes, 600);
}

// ─── Gamification Sounds ───────────────────────────────────────────

export function playXPDing(ctx: AudioContext, output: GainNode): void {
  const now = ctx.currentTime;

  const osc = ctx.createOscillator(); osc.type = "sine"; osc.frequency.value = 880;
  const harm = ctx.createOscillator(); harm.type = "sine"; harm.frequency.value = 1760;
  const harmG = ctx.createGain(); harmG.gain.value = 0.25; // -12dB

  const hp = ctx.createBiquadFilter();
  hp.type = "highpass"; hp.frequency.value = 400;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, now);
  g.gain.exponentialRampToValueAtTime(0.025, now + 0.003);
  g.gain.exponentialRampToValueAtTime(0.0001, now + 0.06);

  osc.connect(hp).connect(g).connect(output);
  harm.connect(harmG).connect(hp);

  osc.start(now); osc.stop(now + 0.06);
  harm.start(now); harm.stop(now + 0.06);

  osc.onended = () => { osc.disconnect(); hp.disconnect(); g.disconnect(); };
  harm.onended = () => { harm.disconnect(); harmG.disconnect(); };
}

export function playRankUp(ctx: AudioContext, output: GainNode): void {
  const now = ctx.currentTime;
  const allNodes: AudioNode[] = [];

  // Phase 1 (0-0.5s): Low rumble build
  const rumbleOsc = ctx.createOscillator(); rumbleOsc.type = "sine"; rumbleOsc.frequency.value = 80;
  const rumbleNoise = ctx.createBufferSource(); rumbleNoise.buffer = getBrownNoiseBuffer(ctx, 1);
  const rumbleLp = ctx.createBiquadFilter(); rumbleLp.type = "lowpass"; rumbleLp.frequency.value = 100;
  const rumbleG = ctx.createGain();
  rumbleG.gain.setValueAtTime(0.0001, now);
  rumbleG.gain.exponentialRampToValueAtTime(0.03, now + 0.5);
  rumbleG.gain.exponentialRampToValueAtTime(0.0001, now + 1.2);
  rumbleOsc.connect(rumbleG).connect(output);
  rumbleNoise.connect(rumbleLp).connect(rumbleG);
  rumbleOsc.start(now); rumbleOsc.stop(now + 1.2);
  rumbleNoise.start(now); rumbleNoise.stop(now + 1.2);
  allNodes.push(rumbleOsc, rumbleNoise, rumbleLp, rumbleG);

  // Phase 2 (0.5-1.2s): Rising sweep
  const sweepOsc = ctx.createOscillator(); sweepOsc.type = "sine";
  applySweep(sweepOsc.frequency, ctx, 200, 600, 0.7, "exponential", now + 0.5);
  const sweepG = ctx.createGain();
  sweepG.gain.setValueAtTime(0.0001, now + 0.5);
  sweepG.gain.exponentialRampToValueAtTime(0.04, now + 0.9);
  sweepG.gain.exponentialRampToValueAtTime(0.0001, now + 1.2);
  sweepOsc.connect(sweepG).connect(output);
  sweepOsc.start(now + 0.5); sweepOsc.stop(now + 1.2);
  allNodes.push(sweepOsc, sweepG);

  // Phase 3 (1.2-2.0s): Three DESCENDING tones (unsettling — you've gone deeper)
  const descNotes = [523, 440, 392];
  let t = now + 1.2;
  for (const freq of descNotes) {
    const o = ctx.createOscillator(); o.type = "sine"; o.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.035, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.15);
    o.connect(g).connect(output);
    o.start(t); o.stop(t + 0.15);
    allNodes.push(o, g);
    t += 0.2; // 150ms note + 50ms gap
  }

  scheduleCleanup(allNodes, 2500);
}

export function playWordSaved(ctx: AudioContext, output: GainNode): void {
  const now = ctx.currentTime;

  const o1 = ctx.createOscillator(); o1.type = "sine"; o1.frequency.value = 523;
  const g1 = ctx.createGain();
  g1.gain.setValueAtTime(0.0001, now);
  g1.gain.exponentialRampToValueAtTime(0.02, now + 0.005);
  g1.gain.exponentialRampToValueAtTime(0.0001, now + 0.03);
  o1.connect(g1).connect(output);
  o1.start(now); o1.stop(now + 0.03);

  const o2 = ctx.createOscillator(); o2.type = "sine"; o2.frequency.value = 659;
  const g2 = ctx.createGain();
  g2.gain.setValueAtTime(0.0001, now + 0.03);
  g2.gain.exponentialRampToValueAtTime(0.02, now + 0.035);
  g2.gain.exponentialRampToValueAtTime(0.0001, now + 0.08);
  o2.connect(g2).connect(output);
  o2.start(now + 0.03); o2.stop(now + 0.08);

  o1.onended = () => { o1.disconnect(); g1.disconnect(); };
  o2.onended = () => { o2.disconnect(); g2.disconnect(); };
}

// ─── UI Feedback Sounds ────────────────────────────────────────────

export function playTranslationToggle(ctx: AudioContext, output: GainNode): void {
  const now = ctx.currentTime;
  const noise = getWhiteNoiseBuffer(ctx, 0.1);
  const src = ctx.createBufferSource(); src.buffer = noise;
  const bp = ctx.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = 2250; bp.Q.value = 2;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.02, now);
  g.gain.exponentialRampToValueAtTime(0.0001, now + 0.01);
  src.connect(bp).connect(g).connect(output);
  src.start(now); src.stop(now + 0.01);
  src.onended = () => { src.disconnect(); bp.disconnect(); g.disconnect(); };
}

export function playCopyConfirm(ctx: AudioContext, output: GainNode): void {
  const now = ctx.currentTime;
  const noise = getWhiteNoiseBuffer(ctx, 0.1);

  // Double-click
  for (const offset of [0, 0.015]) {
    const src = ctx.createBufferSource(); src.buffer = noise;
    const bp = ctx.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = 2250; bp.Q.value = 2;
    const g = ctx.createGain();
    g.gain.setValueAtTime(offset === 0 ? 0.02 : 0.01, now + offset);
    g.gain.exponentialRampToValueAtTime(0.0001, now + offset + 0.01);
    src.connect(bp).connect(g).connect(output);
    src.start(now + offset); src.stop(now + offset + 0.01);
    src.onended = () => { src.disconnect(); bp.disconnect(); g.disconnect(); };
  }
}

export function playTopicSelect(ctx: AudioContext, output: GainNode): void {
  const now = ctx.currentTime;

  // Chord: 330Hz + 440Hz (perfect fourth — tension)
  const o1 = ctx.createOscillator(); o1.type = "sine"; o1.frequency.value = 330;
  const o2 = ctx.createOscillator(); o2.type = "sine"; o2.frequency.value = 440;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, now);
  g.gain.exponentialRampToValueAtTime(0.03, now + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, now + 0.08);
  o1.connect(g).connect(output);
  o2.connect(g);
  o1.start(now); o1.stop(now + 0.08);
  o2.start(now); o2.stop(now + 0.08);
  o1.onended = () => { o1.disconnect(); };
  o2.onended = () => { o2.disconnect(); g.disconnect(); };
}

export function playPanelTransition(
  ctx: AudioContext,
  output: GainNode,
  direction: "open" | "close",
): void {
  const now = ctx.currentTime;
  const noise = getWhiteNoiseBuffer(ctx, 0.5);
  const src = ctx.createBufferSource(); src.buffer = noise;
  const bp = ctx.createBiquadFilter(); bp.type = "bandpass"; bp.Q.value = 1;
  const fromHz = direction === "open" ? 200 : 1500;
  const toHz = direction === "open" ? 1500 : 200;
  applySweep(bp.frequency, ctx, fromHz, toHz, 0.15, "exponential", now);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.02, now);
  g.gain.exponentialRampToValueAtTime(0.0001, now + 0.15);
  src.connect(bp).connect(g).connect(output);
  src.start(now); src.stop(now + 0.15);
  src.onended = () => { src.disconnect(); bp.disconnect(); g.disconnect(); };
}

export function playKeyboardToggle(
  ctx: AudioContext,
  output: GainNode,
  opening: boolean,
): void {
  const now = ctx.currentTime;
  const noise = getWhiteNoiseBuffer(ctx, 0.5);
  const src = ctx.createBufferSource(); src.buffer = noise;
  const bp = ctx.createBiquadFilter(); bp.type = "bandpass"; bp.Q.value = 1;
  applySweep(bp.frequency, ctx, opening ? 300 : 1200, opening ? 1200 : 300, 0.1, "exponential", now);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.02, now);
  g.gain.exponentialRampToValueAtTime(0.0001, now + 0.1);
  src.connect(bp).connect(g).connect(output);
  src.start(now); src.stop(now + 0.1);
  src.onended = () => { src.disconnect(); bp.disconnect(); g.disconnect(); };
}

export function playTutorialStep(ctx: AudioContext, output: GainNode): void {
  const now = ctx.currentTime;
  const o = ctx.createOscillator(); o.type = "sine"; o.frequency.value = 660;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, now);
  g.gain.exponentialRampToValueAtTime(0.015, now + 0.005);
  g.gain.exponentialRampToValueAtTime(0.0001, now + 0.05);
  o.connect(g).connect(output);
  o.start(now); o.stop(now + 0.05);
  o.onended = () => { o.disconnect(); g.disconnect(); };
}

// ─── Special Event Sounds ──────────────────────────────────────────

export function playFarewell(ctx: AudioContext, output: GainNode): void {
  const now = ctx.currentTime;
  const notes = [440, 392, 330];
  const durations = [0.2, 0.2, 0.3];
  const allNodes: AudioNode[] = [];

  let t = now;
  for (let i = 0; i < notes.length; i++) {
    const o = ctx.createOscillator(); o.type = "sine"; o.frequency.value = notes[i];
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.03, t + 0.03);
    if (i < notes.length - 1) {
      g.gain.exponentialRampToValueAtTime(0.0001, t + durations[i]);
    } else {
      // Final note: slow decay with reverb tail
      g.gain.exponentialRampToValueAtTime(0.0001, t + 1.0);
    }
    o.connect(g).connect(output);
    o.start(t); o.stop(t + (i < notes.length - 1 ? durations[i] : 1.0));
    allNodes.push(o, g);
    t += durations[i];
  }

  scheduleCleanup(allNodes, 2500);
}

/**
 * Mute acknowledge — bypasses master gain, connects directly to ctx.destination.
 */
export function playMuteAcknowledge(ctx: AudioContext, muting: boolean): void {
  const now = ctx.currentTime;
  const o = ctx.createOscillator(); o.type = "sine";
  const from = muting ? 440 : 220;
  const to = muting ? 220 : 440;
  applySweep(o.frequency, ctx, from, to, 0.1, "exponential", now);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, now);
  g.gain.exponentialRampToValueAtTime(0.03, now + 0.005);
  g.gain.exponentialRampToValueAtTime(0.0001, now + 0.1);
  // Direct to destination, bypassing master gain
  o.connect(g).connect(ctx.destination);
  o.start(now); o.stop(now + 0.1);
  o.onended = () => { o.disconnect(); g.disconnect(); };
}

// ─── Goshiwon Atmospheric Event Sounds ─────────────────────────────

export function playGoshiwonEvent(
  ctx: AudioContext,
  output: GainNode,
  eventEnglish: string,
  ambientEngine?: { triggerFlicker: () => void },
): void {
  const text = eventEnglish.toLowerCase();

  if (text.includes("knock")) {
    playKnocks(ctx, output);
  } else if (text.includes("footstep") || text.includes("stairs") || text.includes("rooftop")) {
    playFootsteps(ctx, output);
  } else if (text.includes("flicker") || text.includes("power outage")) {
    ambientEngine?.triggerFlicker();
    playFlicker(ctx, output);
  } else if (text.includes("shadow")) {
    playShadow(ctx, output);
  } else if (text.includes("elevator")) {
    playElevator(ctx, output);
  } else if (text.includes("cockroach")) {
    playCockroach(ctx, output);
  } else if (text.includes("water") || text.includes("bathroom")) {
    playWater(ctx, output);
  } else if (text.includes("laughter") || text.includes("whisper") || text.includes("twin")) {
    playMuffledVoices(ctx, output);
  } else if (text.includes("rain")) {
    playRain(ctx, output);
  } else if (text.includes("ramyeon") || text.includes("smell")) {
    // Olfactory — no sound
  } else if (text.includes("fluorescent") || text.includes("hum")) {
    // Already covered by ambient layer 1
  } else if (text.includes("room 313") || text.includes("313")) {
    playWallImpact(ctx, output);
  } else {
    playGenericCreak(ctx, output);
  }
}

function playKnocks(ctx: AudioContext, output: GainNode): void {
  const now = ctx.currentTime;
  const noise = getWhiteNoiseBuffer(ctx, 0.1);
  const vols = [0.04, 0.03, 0.02];
  const allNodes: AudioNode[] = [];
  for (let i = 0; i < 3; i++) {
    const t = now + i * 0.2;
    const src = ctx.createBufferSource(); src.buffer = noise;
    const bp = ctx.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = 300; bp.Q.value = 2;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vols[i], t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.01);
    src.connect(bp).connect(g).connect(output);
    src.start(t); src.stop(t + 0.01);
    allNodes.push(src, bp, g);
  }
  scheduleCleanup(allNodes, 800);
}

function playFootsteps(ctx: AudioContext, output: GainNode): void {
  const now = ctx.currentTime;
  const noise = getBrownNoiseBuffer(ctx, 0.5);
  const count = 4 + Math.floor(Math.random() * 3);
  const allNodes: AudioNode[] = [];
  let t = now;
  for (let i = 0; i < count; i++) {
    const src = ctx.createBufferSource(); src.buffer = noise;
    const lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 250 + (i % 2) * 100;
    const g = ctx.createGain();
    const vol = 0.02 * (1 - i / (count + 2)); // fade away
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.02);
    src.connect(lp).connect(g).connect(output);
    src.start(t); src.stop(t + 0.02);
    allNodes.push(src, lp, g);
    t += 0.3 + Math.random() * 0.2;
  }
  scheduleCleanup(allNodes, 3000);
}

function playFlicker(ctx: AudioContext, output: GainNode): void {
  const now = ctx.currentTime;
  // Electrical snap sound
  const noise = getWhiteNoiseBuffer(ctx, 0.1);
  const src = ctx.createBufferSource(); src.buffer = noise;
  const hp = ctx.createBiquadFilter(); hp.type = "highpass"; hp.frequency.value = 3000;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.015, now + 0.05);
  g.gain.exponentialRampToValueAtTime(0.0001, now + 0.06);
  src.connect(hp).connect(g).connect(output);
  src.start(now + 0.05); src.stop(now + 0.06);
  src.onended = () => { src.disconnect(); hp.disconnect(); g.disconnect(); };
}

function playShadow(ctx: AudioContext, output: GainNode): void {
  const now = ctx.currentTime;
  const noise = getBrownNoiseBuffer(ctx, 0.5);
  const src = ctx.createBufferSource(); src.buffer = noise;
  const lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 200;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, now);
  g.gain.exponentialRampToValueAtTime(0.015, now + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, now + 0.06);
  src.connect(lp).connect(g).connect(output);
  src.start(now); src.stop(now + 0.06);
  src.onended = () => { src.disconnect(); lp.disconnect(); g.disconnect(); };
}

function playElevator(ctx: AudioContext, output: GainNode): void {
  const now = ctx.currentTime;
  const osc = ctx.createOscillator(); osc.type = "sawtooth"; osc.frequency.value = 50;
  const lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 200;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, now);
  g.gain.exponentialRampToValueAtTime(0.015, now + 0.5);
  g.gain.setValueAtTime(0.015, now + 1.5);
  g.gain.exponentialRampToValueAtTime(0.0001, now + 2.0);
  osc.connect(lp).connect(g).connect(output);
  osc.start(now); osc.stop(now + 2.0);
  osc.onended = () => { osc.disconnect(); lp.disconnect(); g.disconnect(); };
}

function playCockroach(ctx: AudioContext, output: GainNode): void {
  const now = ctx.currentTime;
  const noise = getWhiteNoiseBuffer(ctx, 0.5);
  const src = ctx.createBufferSource(); src.buffer = noise;
  const hp = ctx.createBiquadFilter(); hp.type = "highpass"; hp.frequency.value = 4000;

  // Amplitude modulation at 30Hz for rapid scittering
  const lfo = ctx.createOscillator(); lfo.type = "square"; lfo.frequency.value = 30;
  const lfoG = ctx.createGain(); lfoG.gain.value = 0.5;
  const ampG = ctx.createGain(); ampG.gain.value = 0.5;
  lfo.connect(lfoG).connect(ampG.gain);
  lfo.start(now);

  const g = ctx.createGain();
  g.gain.setValueAtTime(0.02, now);
  g.gain.exponentialRampToValueAtTime(0.0001, now + 0.2);

  src.connect(hp).connect(ampG).connect(g).connect(output);
  src.start(now); src.stop(now + 0.2);

  src.onended = () => {
    lfo.stop(); lfo.disconnect(); lfoG.disconnect();
    src.disconnect(); hp.disconnect(); ampG.disconnect(); g.disconnect();
  };
}

function playWater(ctx: AudioContext, output: GainNode): void {
  const now = ctx.currentTime;
  const noise = getPinkNoiseBuffer(ctx, 2);
  const src = ctx.createBufferSource(); src.buffer = noise;
  const bp = ctx.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = 550; bp.Q.value = 1;

  // Slow LFO on filter
  const lfo = ctx.createOscillator(); lfo.type = "sine"; lfo.frequency.value = 2;
  const lfoG = ctx.createGain(); lfoG.gain.value = 250;
  lfo.connect(lfoG).connect(bp.frequency);
  lfo.start(now);

  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, now);
  g.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
  g.gain.setValueAtTime(0.01, now + 1.5);
  g.gain.exponentialRampToValueAtTime(0.0001, now + 2.0);
  src.connect(bp).connect(g).connect(output);
  src.start(now); src.stop(now + 2.0);

  src.onended = () => {
    lfo.stop(); lfo.disconnect(); lfoG.disconnect();
    src.disconnect(); bp.disconnect(); g.disconnect();
  };
}

function playMuffledVoices(ctx: AudioContext, output: GainNode): void {
  const now = ctx.currentTime;
  const noise = getPinkNoiseBuffer(ctx, 2);
  const src = ctx.createBufferSource(); src.buffer = noise;
  const bp = ctx.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = 400; bp.Q.value = 8;

  // Speech rhythm modulation
  const lfo = ctx.createOscillator(); lfo.type = "sine"; lfo.frequency.value = 3 + Math.random() * 2;
  const lfoG = ctx.createGain(); lfoG.gain.value = 0.5;
  const ampG = ctx.createGain(); ampG.gain.value = 0.5;
  lfo.connect(lfoG).connect(ampG.gain);
  lfo.start(now);

  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, now);
  g.gain.exponentialRampToValueAtTime(0.008, now + 0.5);
  g.gain.setValueAtTime(0.008, now + 1.5);
  g.gain.exponentialRampToValueAtTime(0.0001, now + 2.0);
  src.connect(bp).connect(ampG).connect(g).connect(output);
  src.start(now); src.stop(now + 2.0);

  src.onended = () => {
    lfo.stop(); lfo.disconnect(); lfoG.disconnect();
    src.disconnect(); bp.disconnect(); ampG.disconnect(); g.disconnect();
  };
}

function playRain(ctx: AudioContext, output: GainNode): void {
  const now = ctx.currentTime;
  const noise = getWhiteNoiseBuffer(ctx, 2);
  const src = ctx.createBufferSource(); src.buffer = noise; src.loop = true;
  const lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 2000;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, now);
  g.gain.exponentialRampToValueAtTime(0.012, now + 0.5);
  g.gain.setValueAtTime(0.012, now + 2.5);
  g.gain.exponentialRampToValueAtTime(0.0001, now + 3.0);
  src.connect(lp).connect(g).connect(output);
  src.start(now); src.stop(now + 3.0);
  src.onended = () => { src.disconnect(); lp.disconnect(); g.disconnect(); };
}

function playWallImpact(ctx: AudioContext, output: GainNode): void {
  const now = ctx.currentTime;
  const noise = getBrownNoiseBuffer(ctx, 0.5);
  const src = ctx.createBufferSource(); src.buffer = noise;
  const lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 150;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.02, now);
  g.gain.exponentialRampToValueAtTime(0.0001, now + 0.05);
  src.connect(lp).connect(g).connect(output);
  src.start(now); src.stop(now + 0.05);
  src.onended = () => { src.disconnect(); lp.disconnect(); g.disconnect(); };
}

function playGenericCreak(ctx: AudioContext, output: GainNode): void {
  const now = ctx.currentTime;
  const osc = ctx.createOscillator(); osc.type = "sine";
  applySweep(osc.frequency, ctx, 300, 800, 0.2, "exponential", now);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, now);
  g.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
  g.gain.exponentialRampToValueAtTime(0.0001, now + 0.2);
  osc.connect(g).connect(output);
  osc.start(now); osc.stop(now + 0.2);
  osc.onended = () => { osc.disconnect(); g.disconnect(); };
}
