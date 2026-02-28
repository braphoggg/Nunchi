/**
 * Reusable synthesis primitives for the Room 203 sound engine.
 */

export interface ADSROptions {
  attack: number;   // seconds
  decay: number;    // seconds
  sustain: number;  // 0–1 level
  release: number;  // seconds
}

/**
 * Apply an ADSR envelope to a GainNode's gain AudioParam.
 * Returns a noteOff function to trigger the release phase.
 */
export function applyEnvelope(
  param: AudioParam,
  ctx: AudioContext,
  adsr: ADSROptions,
  peakLevel: number = 1,
  startTime?: number,
): { noteOff: (time?: number) => void } {
  const t = startTime ?? ctx.currentTime;

  param.cancelScheduledValues(t);
  param.setValueAtTime(0.0001, t);
  // Attack
  param.exponentialRampToValueAtTime(Math.max(peakLevel, 0.0001), t + adsr.attack);
  // Decay → Sustain
  const sustainLevel = Math.max(adsr.sustain * peakLevel, 0.0001);
  param.exponentialRampToValueAtTime(sustainLevel, t + adsr.attack + adsr.decay);

  return {
    noteOff(time?: number) {
      const offTime = time ?? ctx.currentTime;
      param.cancelScheduledValues(offTime);
      param.setValueAtTime(param.value || sustainLevel, offTime);
      param.exponentialRampToValueAtTime(0.0001, offTime + adsr.release);
    },
  };
}

/**
 * Frequency sweep on an AudioParam (oscillator frequency or filter cutoff).
 */
export function applySweep(
  param: AudioParam,
  ctx: AudioContext,
  fromHz: number,
  toHz: number,
  duration: number,
  curve: "linear" | "exponential" = "exponential",
  startTime?: number,
): void {
  const t = startTime ?? ctx.currentTime;
  param.setValueAtTime(Math.max(fromHz, 0.01), t);
  if (curve === "exponential") {
    param.exponentialRampToValueAtTime(Math.max(toHz, 0.01), t + duration);
  } else {
    param.linearRampToValueAtTime(toHz, t + duration);
  }
}

/**
 * Create a noise burst with configurable filter and envelope.
 * Returns the output gain node (connect it to your destination).
 */
export function createFilteredNoiseBurst(
  ctx: AudioContext,
  noiseBuffer: AudioBuffer,
  options: {
    duration: number;
    filterType: BiquadFilterType;
    filterFreq: number;
    filterQ?: number;
    volume: number;
    adsr?: ADSROptions;
  },
): { output: GainNode; start: (time?: number) => void } {
  const source = ctx.createBufferSource();
  source.buffer = noiseBuffer;

  const filter = ctx.createBiquadFilter();
  filter.type = options.filterType;
  filter.frequency.value = options.filterFreq;
  if (options.filterQ !== undefined) filter.Q.value = options.filterQ;

  const gain = ctx.createGain();

  if (options.adsr) {
    gain.gain.value = 0.0001;
  } else {
    gain.gain.value = options.volume;
  }

  source.connect(filter).connect(gain);

  // Auto-cleanup via onended
  source.onended = () => {
    source.disconnect();
    filter.disconnect();
    gain.disconnect();
  };

  return {
    output: gain,
    start(time?: number) {
      const t = time ?? ctx.currentTime;
      if (options.adsr) {
        applyEnvelope(gain.gain, ctx, options.adsr, options.volume, t);
      }
      source.start(t);
      source.stop(t + options.duration);
    },
  };
}

/**
 * Schedule disconnection of a node graph after a given time.
 * Use for complex graphs where onended alone isn't sufficient.
 */
export function scheduleCleanup(
  nodes: AudioNode[],
  afterMs: number,
): void {
  setTimeout(() => {
    for (const node of nodes) {
      try { node.disconnect(); } catch { /* already disconnected */ }
    }
  }, afterMs);
}
