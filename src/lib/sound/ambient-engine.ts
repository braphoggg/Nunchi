/**
 * Ambient Engine — Continuous layered goshiwon soundscape.
 *
 * 5 layers that evolve with night stage (0-3) and mood level:
 *   1. Fluorescent hum (always on)
 *   2. Pipe ambience (stage 1+)
 *   3. Muffled wall sounds (stage 2+)
 *   4. Electrical interference (stage 3 only)
 *   5. Deep subharmonic (mood "impressed" only)
 */

import { getBrownNoiseBuffer, getPinkNoiseBuffer } from "./noise-generator";

export type MoodLevel = "cold" | "neutral" | "warm" | "impressed";

// Target volumes per layer per night stage
const FLUORO_VOL = [0.012, 0.016, 0.020, 0.015]; // stage 3 lower (failing tube)
const PIPE_VOL   = [0.0, 0.010, 0.016, 0.022];
const WALL_VOL   = [0.0, 0.0, 0.008, 0.014];
const ELEC_VOL   = [0.0, 0.0, 0.0, 0.003];
const SUB_VOL    = 0.008;

const CROSSFADE_SEC = 3;

export class AmbientEngine {
  private ctx: AudioContext;
  private output: GainNode;
  private running = false;
  private nightStage = 0;
  private mood: MoodLevel = "neutral";

  // Layer 1: Fluorescent hum
  private fluoroOscs: OscillatorNode[] = [];
  private fluoroGains: GainNode[] = [];
  private fluoroMaster: GainNode | null = null;
  private fluoroLFO: OscillatorNode | null = null;
  private fluoroLFOGain: GainNode | null = null;
  private flickerTimer: ReturnType<typeof setInterval> | null = null;

  // Layer 2: Pipes
  private pipeSource: AudioBufferSourceNode | null = null;
  private pipeFilter: BiquadFilterNode | null = null;
  private pipeMaster: GainNode | null = null;
  private pipeLFO: OscillatorNode | null = null;
  private pipeLFOGain: GainNode | null = null;
  private pipeWhineTimer: ReturnType<typeof setTimeout> | null = null;

  // Layer 3: Muffled walls
  private wallSource: AudioBufferSourceNode | null = null;
  private wallFilter: BiquadFilterNode | null = null;
  private wallBandpass: BiquadFilterNode | null = null;
  private wallMaster: GainNode | null = null;
  private wallAmpLFO: OscillatorNode | null = null;
  private wallAmpGain: GainNode | null = null;

  // Layer 4: Electrical interference
  private elecOsc: OscillatorNode | null = null;
  private elecFilter: BiquadFilterNode | null = null;
  private elecMaster: GainNode | null = null;
  private elecBurstTimer: ReturnType<typeof setTimeout> | null = null;

  // Layer 5: Deep subharmonic
  private subOsc: OscillatorNode | null = null;
  private subMaster: GainNode | null = null;

  constructor(ctx: AudioContext, output: GainNode) {
    this.ctx = ctx;
    this.output = output;
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.startLayer1();
    this.startLayer2();
    this.startLayer3();
    this.startLayer4();
    // Layer 5 starts only on mood "impressed"
    this.applyNightStage();
    this.applyMood();
  }

  stop(): void {
    if (!this.running) return;
    this.running = false;
    this.stopAllLayers();
  }

  setNightStage(stage: number): void {
    this.nightStage = Math.max(0, Math.min(3, stage));
    if (this.running) this.applyNightStage();
  }

  setMoodLevel(mood: MoodLevel): void {
    this.mood = mood;
    if (this.running) this.applyMood();
  }

  /** Trigger fluorescent flicker effect (used by goshiwon events). */
  triggerFlicker(): void {
    if (!this.fluoroMaster) return;
    const now = this.ctx.currentTime;
    const gain = this.fluoroMaster.gain;
    const base = gain.value || FLUORO_VOL[this.nightStage];
    // Three rapid flutter cycles
    gain.setValueAtTime(base, now);
    gain.setValueAtTime(0.001, now + 0.05);
    gain.setValueAtTime(base, now + 0.15);
    gain.setValueAtTime(0.001, now + 0.20);
    gain.setValueAtTime(base, now + 0.25);
    gain.setValueAtTime(0.001, now + 0.30);
    gain.setValueAtTime(base, now + 0.40);
  }

  dispose(): void {
    this.stop();
  }

  // ─── Layer 1: Fluorescent Hum ────────────────────────────────────

  private startLayer1(): void {
    const ctx = this.ctx;

    this.fluoroMaster = ctx.createGain();
    this.fluoroMaster.gain.value = FLUORO_VOL[this.nightStage];
    this.fluoroMaster.connect(this.output);

    // Fundamental + harmonics: 60Hz, 120Hz, 180Hz, 240Hz
    const freqs = [60, 120, 180, 240];
    const levels = [1.0, 0.25, 0.125, 0.0625]; // -0, -12, -18, -24 dB relative

    for (let i = 0; i < freqs.length; i++) {
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.value = freqs[i];
      const gain = ctx.createGain();
      gain.gain.value = levels[i];
      osc.connect(gain).connect(this.fluoroMaster);
      osc.start();
      this.fluoroOscs.push(osc);
      this.fluoroGains.push(gain);
    }

    // Flutter LFO modulating the master gain
    this.fluoroLFO = ctx.createOscillator();
    this.fluoroLFO.type = "sine";
    this.fluoroLFO.frequency.value = 0.15;
    this.fluoroLFOGain = ctx.createGain();
    this.fluoroLFOGain.gain.value = FLUORO_VOL[this.nightStage] * 0.1;
    this.fluoroLFO.connect(this.fluoroLFOGain).connect(this.fluoroMaster.gain);
    this.fluoroLFO.start();
  }

  // ─── Layer 2: Pipe Ambience ──────────────────────────────────────

  private startLayer2(): void {
    const ctx = this.ctx;

    this.pipeMaster = ctx.createGain();
    this.pipeMaster.gain.value = PIPE_VOL[this.nightStage];
    this.pipeMaster.connect(this.output);

    const noiseBuffer = getBrownNoiseBuffer(ctx, 2);
    this.pipeSource = ctx.createBufferSource();
    this.pipeSource.buffer = noiseBuffer;
    this.pipeSource.loop = true;

    this.pipeFilter = ctx.createBiquadFilter();
    this.pipeFilter.type = "bandpass";
    this.pipeFilter.frequency.value = 80;
    this.pipeFilter.Q.value = 2.0;

    // Slow LFO modulating filter center 40-120Hz
    this.pipeLFO = ctx.createOscillator();
    this.pipeLFO.type = "sine";
    this.pipeLFO.frequency.value = 0.05;
    this.pipeLFOGain = ctx.createGain();
    this.pipeLFOGain.gain.value = 40; // ±40Hz around center 80
    this.pipeLFO.connect(this.pipeLFOGain).connect(this.pipeFilter.frequency);
    this.pipeLFO.start();

    this.pipeSource.connect(this.pipeFilter).connect(this.pipeMaster);
    this.pipeSource.start();

    // Schedule occasional pipe whine
    this.schedulePipeWhine();
  }

  private schedulePipeWhine(): void {
    if (!this.running) return;
    const delay = (15 + Math.random() * 15) * 1000;
    this.pipeWhineTimer = setTimeout(() => {
      if (!this.running || !this.pipeMaster) return;
      // Only play if pipes are audible
      if (PIPE_VOL[this.nightStage] > 0) {
        this.playPipeWhine();
      }
      this.schedulePipeWhine();
    }, delay);
  }

  private playPipeWhine(): void {
    const ctx = this.ctx;
    const osc = ctx.createOscillator();
    osc.type = "sine";
    const gain = ctx.createGain();
    gain.gain.value = 0.005;

    const now = ctx.currentTime;
    osc.frequency.setValueAtTime(200, now);
    osc.frequency.exponentialRampToValueAtTime(800, now + 2);
    gain.gain.setValueAtTime(0.005, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 2);

    osc.connect(gain).connect(this.output);
    osc.start(now);
    osc.stop(now + 2);
    osc.onended = () => { osc.disconnect(); gain.disconnect(); };
  }

  // ─── Layer 3: Muffled Wall Sounds ────────────────────────────────

  private startLayer3(): void {
    const ctx = this.ctx;

    this.wallMaster = ctx.createGain();
    this.wallMaster.gain.value = WALL_VOL[this.nightStage];
    this.wallMaster.connect(this.output);

    const noiseBuffer = getPinkNoiseBuffer(ctx, 2);
    this.wallSource = ctx.createBufferSource();
    this.wallSource.buffer = noiseBuffer;
    this.wallSource.loop = true;

    this.wallFilter = ctx.createBiquadFilter();
    this.wallFilter.type = "lowpass";
    this.wallFilter.frequency.value = 300;

    this.wallBandpass = ctx.createBiquadFilter();
    this.wallBandpass.type = "bandpass";
    this.wallBandpass.frequency.value = 300;
    this.wallBandpass.Q.value = 5;

    // Amplitude modulation at 0.2Hz for speech rhythm
    this.wallAmpLFO = ctx.createOscillator();
    this.wallAmpLFO.type = "sine";
    this.wallAmpLFO.frequency.value = 0.2;
    this.wallAmpGain = ctx.createGain();
    this.wallAmpGain.gain.value = 0.5; // 50% depth

    const wallOutputGain = ctx.createGain();
    wallOutputGain.gain.value = 1;

    this.wallAmpLFO.connect(this.wallAmpGain).connect(wallOutputGain.gain);
    this.wallAmpLFO.start();

    this.wallSource.connect(this.wallFilter)
      .connect(this.wallBandpass)
      .connect(wallOutputGain)
      .connect(this.wallMaster);

    this.wallSource.start();
  }

  // ─── Layer 4: Electrical Interference ────────────────────────────

  private startLayer4(): void {
    const ctx = this.ctx;

    this.elecMaster = ctx.createGain();
    this.elecMaster.gain.value = 0; // starts silent, enabled by night stage
    this.elecMaster.connect(this.output);

    this.elecOsc = ctx.createOscillator();
    this.elecOsc.type = "square";
    this.elecOsc.frequency.value = 4000;

    this.elecFilter = ctx.createBiquadFilter();
    this.elecFilter.type = "lowpass";
    this.elecFilter.frequency.value = 2000;

    this.elecOsc.connect(this.elecFilter).connect(this.elecMaster);
    this.elecOsc.start();

    this.scheduleElecBurst();
  }

  private scheduleElecBurst(): void {
    if (!this.running) return;
    const delay = (5 + Math.random() * 10) * 1000;
    this.elecBurstTimer = setTimeout(() => {
      if (!this.running || !this.elecMaster) return;
      if (this.nightStage === 3) {
        const now = this.ctx.currentTime;
        const burstDur = 0.5 + Math.random() * 1.5;
        this.elecMaster.gain.setValueAtTime(ELEC_VOL[3], now);
        this.elecMaster.gain.setValueAtTime(0, now + burstDur);
      }
      this.scheduleElecBurst();
    }, delay);
  }

  // ─── Layer 5: Deep Subharmonic ───────────────────────────────────

  private startLayer5(): void {
    if (this.subOsc) return; // already running
    const ctx = this.ctx;

    this.subMaster = ctx.createGain();
    this.subMaster.gain.value = 0.0001;
    this.subMaster.connect(this.output);

    this.subOsc = ctx.createOscillator();
    this.subOsc.type = "sine";
    this.subOsc.frequency.value = 30;
    this.subOsc.connect(this.subMaster);
    this.subOsc.start();

    // 5s fade in
    const now = ctx.currentTime;
    this.subMaster.gain.exponentialRampToValueAtTime(SUB_VOL, now + 5);
  }

  private stopLayer5(): void {
    if (!this.subOsc || !this.subMaster) return;
    const now = this.ctx.currentTime;
    this.subMaster.gain.cancelScheduledValues(now);
    this.subMaster.gain.setValueAtTime(this.subMaster.gain.value || SUB_VOL, now);
    this.subMaster.gain.exponentialRampToValueAtTime(0.0001, now + 5);
    // Clean up after fade
    const osc = this.subOsc;
    const gain = this.subMaster;
    setTimeout(() => {
      try { osc.stop(); osc.disconnect(); gain.disconnect(); } catch { /* ok */ }
    }, 5500);
    this.subOsc = null;
    this.subMaster = null;
  }

  // ─── Stage & Mood Application ────────────────────────────────────

  private applyNightStage(): void {
    const now = this.ctx.currentTime;
    const t = now + CROSSFADE_SEC;

    // Layer 1: Fluorescent
    if (this.fluoroMaster) {
      this.fluoroMaster.gain.cancelScheduledValues(now);
      this.fluoroMaster.gain.setValueAtTime(
        Math.max(this.fluoroMaster.gain.value, 0.0001), now
      );
      this.fluoroMaster.gain.linearRampToValueAtTime(FLUORO_VOL[this.nightStage], t);

      // Adjust LFO speed: stage 3 gets faster flutter
      if (this.fluoroLFO) {
        this.fluoroLFO.frequency.setValueAtTime(
          this.nightStage === 3 ? 0.5 : 0.15, now
        );
      }
      if (this.fluoroLFOGain) {
        this.fluoroLFOGain.gain.setValueAtTime(
          FLUORO_VOL[this.nightStage] * (this.nightStage === 3 ? 0.3 : 0.1), now
        );
      }

      // Stage 3: random gain drops
      if (this.flickerTimer) clearInterval(this.flickerTimer);
      if (this.nightStage === 3) {
        this.flickerTimer = setInterval(() => {
          if (!this.running || !this.fluoroMaster) return;
          if (Math.random() < 0.3) this.triggerFlicker();
        }, 8000);
      }
    }

    // Layer 2: Pipes
    if (this.pipeMaster) {
      this.rampGain(this.pipeMaster.gain, PIPE_VOL[this.nightStage], now, t);
    }

    // Layer 3: Walls
    if (this.wallMaster) {
      this.rampGain(this.wallMaster.gain, WALL_VOL[this.nightStage], now, t);
    }

    // Layer 4: Electrical
    if (this.elecMaster && this.nightStage < 3) {
      // Silence layer 4 when not stage 3
      this.rampGain(this.elecMaster.gain, 0, now, t);
    }
  }

  private applyMood(): void {
    // Layer 3 filter adjustment: "impressed" makes wall sounds clearer
    if (this.wallFilter) {
      this.wallFilter.frequency.value = this.mood === "impressed" ? 500 : 300;
    }

    // Layer 5: activate on "impressed" only
    if (this.mood === "impressed") {
      this.startLayer5();
    } else {
      this.stopLayer5();
    }
  }

  private rampGain(param: AudioParam, target: number, now: number, endTime: number): void {
    param.cancelScheduledValues(now);
    param.setValueAtTime(Math.max(param.value, 0), now);
    param.linearRampToValueAtTime(Math.max(target, 0), endTime);
  }

  // ─── Teardown ────────────────────────────────────────────────────

  private stopAllLayers(): void {
    // Timers
    if (this.flickerTimer) { clearInterval(this.flickerTimer); this.flickerTimer = null; }
    if (this.pipeWhineTimer) { clearTimeout(this.pipeWhineTimer); this.pipeWhineTimer = null; }
    if (this.elecBurstTimer) { clearTimeout(this.elecBurstTimer); this.elecBurstTimer = null; }

    // Layer 1
    for (const osc of this.fluoroOscs) { try { osc.stop(); osc.disconnect(); } catch { /* ok */ } }
    this.fluoroOscs = [];
    for (const g of this.fluoroGains) { try { g.disconnect(); } catch { /* ok */ } }
    this.fluoroGains = [];
    if (this.fluoroLFO) { try { this.fluoroLFO.stop(); this.fluoroLFO.disconnect(); } catch { /* ok */ } this.fluoroLFO = null; }
    if (this.fluoroLFOGain) { try { this.fluoroLFOGain.disconnect(); } catch { /* ok */ } this.fluoroLFOGain = null; }
    if (this.fluoroMaster) { try { this.fluoroMaster.disconnect(); } catch { /* ok */ } this.fluoroMaster = null; }

    // Layer 2
    if (this.pipeSource) { try { this.pipeSource.stop(); this.pipeSource.disconnect(); } catch { /* ok */ } this.pipeSource = null; }
    if (this.pipeFilter) { try { this.pipeFilter.disconnect(); } catch { /* ok */ } this.pipeFilter = null; }
    if (this.pipeLFO) { try { this.pipeLFO.stop(); this.pipeLFO.disconnect(); } catch { /* ok */ } this.pipeLFO = null; }
    if (this.pipeLFOGain) { try { this.pipeLFOGain.disconnect(); } catch { /* ok */ } this.pipeLFOGain = null; }
    if (this.pipeMaster) { try { this.pipeMaster.disconnect(); } catch { /* ok */ } this.pipeMaster = null; }

    // Layer 3
    if (this.wallSource) { try { this.wallSource.stop(); this.wallSource.disconnect(); } catch { /* ok */ } this.wallSource = null; }
    if (this.wallFilter) { try { this.wallFilter.disconnect(); } catch { /* ok */ } this.wallFilter = null; }
    if (this.wallBandpass) { try { this.wallBandpass.disconnect(); } catch { /* ok */ } this.wallBandpass = null; }
    if (this.wallAmpLFO) { try { this.wallAmpLFO.stop(); this.wallAmpLFO.disconnect(); } catch { /* ok */ } this.wallAmpLFO = null; }
    if (this.wallAmpGain) { try { this.wallAmpGain.disconnect(); } catch { /* ok */ } this.wallAmpGain = null; }
    if (this.wallMaster) { try { this.wallMaster.disconnect(); } catch { /* ok */ } this.wallMaster = null; }

    // Layer 4
    if (this.elecOsc) { try { this.elecOsc.stop(); this.elecOsc.disconnect(); } catch { /* ok */ } this.elecOsc = null; }
    if (this.elecFilter) { try { this.elecFilter.disconnect(); } catch { /* ok */ } this.elecFilter = null; }
    if (this.elecMaster) { try { this.elecMaster.disconnect(); } catch { /* ok */ } this.elecMaster = null; }

    // Layer 5
    this.stopLayer5();
  }
}
