/**
 * Cached noise buffer generators.
 *
 * White, pink, and brown noise are used by many effects. Rather than
 * generating a fresh AudioBuffer on every play call, we cache reusable
 * buffers keyed by (context, type, duration).
 */

const cache = new WeakMap<AudioContext, Map<string, AudioBuffer>>();

function getCache(ctx: AudioContext): Map<string, AudioBuffer> {
  let map = cache.get(ctx);
  if (!map) {
    map = new Map();
    cache.set(ctx, map);
  }
  return map;
}

/** White noise: each sample = Math.random() * 2 - 1 */
export function getWhiteNoiseBuffer(ctx: AudioContext, durationSec: number = 2): AudioBuffer {
  const key = `white-${durationSec}`;
  const c = getCache(ctx);
  if (c.has(key)) return c.get(key)!;

  const length = Math.floor(ctx.sampleRate * durationSec);
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  c.set(key, buffer);
  return buffer;
}

/**
 * Pink noise (1/f) via Voss-McCartney algorithm with 16 octave rows.
 * Natural "environment" quality.
 */
export function getPinkNoiseBuffer(ctx: AudioContext, durationSec: number = 2): AudioBuffer {
  const key = `pink-${durationSec}`;
  const c = getCache(ctx);
  if (c.has(key)) return c.get(key)!;

  const length = Math.floor(ctx.sampleRate * durationSec);
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);

  const rows = 16;
  const rowValues = new Float32Array(rows);
  let runningSum = 0;

  for (let i = 0; i < length; i++) {
    // Determine which rows to update (Voss-McCartney)
    let k = i;
    for (let j = 0; j < rows; j++) {
      if ((k & 1) === 0) {
        runningSum -= rowValues[j];
        rowValues[j] = Math.random() * 2 - 1;
        runningSum += rowValues[j];
      }
      k >>= 1;
      if (k === 0) break;
    }
    data[i] = runningSum / rows;
  }

  // Normalize to [-1, 1]
  let max = 0;
  for (let i = 0; i < length; i++) {
    const abs = Math.abs(data[i]);
    if (abs > max) max = abs;
  }
  if (max > 0) {
    for (let i = 0; i < length; i++) data[i] /= max;
  }

  c.set(key, buffer);
  return buffer;
}

/**
 * Brown noise (1/f²): cumulative random walk, clamped to [-1, 1].
 * Deep rumble quality.
 */
export function getBrownNoiseBuffer(ctx: AudioContext, durationSec: number = 2): AudioBuffer {
  const key = `brown-${durationSec}`;
  const c = getCache(ctx);
  if (c.has(key)) return c.get(key)!;

  const length = Math.floor(ctx.sampleRate * durationSec);
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);

  let value = 0;
  for (let i = 0; i < length; i++) {
    value += (Math.random() * 2 - 1) * 0.02;
    value = Math.max(-1, Math.min(1, value));
    data[i] = value;
  }

  // Normalize
  let max = 0;
  for (let i = 0; i < length; i++) {
    const abs = Math.abs(data[i]);
    if (abs > max) max = abs;
  }
  if (max > 0) {
    for (let i = 0; i < length; i++) data[i] /= max;
  }

  c.set(key, buffer);
  return buffer;
}
