/**
 * Singleton AudioContext manager.
 *
 * All sound modules import from here rather than creating their own context.
 * Handles lazy initialization, suspend/resume lifecycle, and Safari quirks.
 */

let ctx: AudioContext | null = null;
let masterGain: GainNode | null = null;

/** Get (or lazily create) the shared AudioContext. */
export function getAudioContext(): AudioContext {
  if (!ctx) {
    ctx = new AudioContext();
    masterGain = ctx.createGain();
    masterGain.connect(ctx.destination);
  }
  // Resume if suspended (Safari requires user-gesture resume)
  if (ctx.state === "suspended") {
    ctx.resume().catch(() => {});
  }
  return ctx;
}

/** Master gain node sitting between all output and ctx.destination. */
export function getMasterGain(): GainNode {
  if (!masterGain) getAudioContext(); // ensure init
  return masterGain!;
}

/**
 * Mute/unmute by ramping master gain over 50ms to avoid click artifacts.
 * When muted, gain → 0.0001 (not 0, to avoid exponentialRamp errors).
 */
export function setMasterMuted(muted: boolean): void {
  const audioCtx = getAudioContext();
  const gain = getMasterGain();
  const now = audioCtx.currentTime;
  gain.gain.cancelScheduledValues(now);
  gain.gain.setValueAtTime(gain.gain.value, now);
  gain.gain.exponentialRampToValueAtTime(muted ? 0.0001 : 1.0, now + 0.05);
}

/**
 * Set master gain from volume (0-100) and muted state.
 * When muted, gain ramps to near-zero regardless of volume.
 */
export function setMasterVolume(volume: number, muted: boolean): void {
  const audioCtx = getAudioContext();
  const gain = getMasterGain();
  const now = audioCtx.currentTime;
  const target = muted ? 0.0001 : Math.max(volume / 100, 0.0001);
  gain.gain.cancelScheduledValues(now);
  gain.gain.setValueAtTime(gain.gain.value, now);
  gain.gain.exponentialRampToValueAtTime(target, now + 0.05);
}

/** Tear down the context (e.g. on component unmount). */
export function disposeAudioContext(): void {
  if (ctx) {
    ctx.close().catch(() => {});
    ctx = null;
    masterGain = null;
  }
}
