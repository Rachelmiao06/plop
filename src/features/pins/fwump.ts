/**
 * A soft paper "fwump" when a card flops into the snow: a puff of low-passed noise with a gentle low
 * thump under it. Synthesized here for now; a shared recording in `src/lib/audio.ts` later.
 * Respects the sound-effects switch from `src/lib/audio.ts`.
 */
import { getAudioSettings } from "@/lib/audio";

import { PINS } from "./content";

let ctx: AudioContext | null = null;
let noise: AudioBuffer | null = null;
let master: GainNode | null = null;
const recent: number[] = [];

function build(): boolean {
  if (ctx) return true;
  const Ctor =
    typeof window === "undefined"
      ? undefined
      : (window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext);
  if (!Ctor) return false;
  ctx = new Ctor();
  master = ctx.createGain();
  master.gain.value = PINS.sound.volume;
  master.connect(ctx.destination);
  // Half a second of soft (pinkish) noise, reused by every flop.
  const length = Math.floor(ctx.sampleRate * 0.5);
  noise = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = noise.getChannelData(0);
  let last = 0;
  for (let i = 0; i < length; i++) {
    last = last * 0.86 + (Math.random() * 2 - 1) * 0.14;
    data[i] = last * 3;
  }
  return true;
}

/**
 * Wait for the first touch, click or key press, then make the sound engine (browsers only allow sound
 * after a gesture). Returns a function that stops waiting.
 */
export function unlockFwumpOnFirstTouch(): () => void {
  if (typeof window === "undefined") return () => {};
  const events = ["pointerdown", "keydown", "touchend"] as const;
  const remove = () => events.forEach((e) => window.removeEventListener(e, handler, true));
  const handler = () => {
    if (!build() || !ctx) return;
    if (ctx.state !== "running") void ctx.resume();
    remove();
  };
  events.forEach((e) => window.addEventListener(e, handler, true));
  return remove;
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/**
 * Play one flop. `strength` 0..1 (how hard it landed), `size` 0..1 (small card .. big card).
 * Skipped when sound is off, not unlocked yet, or too many flops are already playing at once.
 */
export function playFwump(strength: number, size: number): void {
  if (!ctx || !noise || !master || !getAudioSettings().effects) return;
  if (ctx.state !== "running") void ctx.resume();
  const s = PINS.sound;
  const now = ctx.currentTime;
  while (recent.length && now - recent[0] > s.burstWindow) recent.shift();
  if (recent.length >= s.burstMax) return;
  recent.push(now);

  const level = 0.35 + 0.65 * Math.max(0, Math.min(1, strength));
  const length = lerp(s.lengthSmall, s.lengthBig, size) * (0.85 + Math.random() * 0.3);

  const src = ctx.createBufferSource();
  src.buffer = noise;
  src.playbackRate.value = 0.9 + Math.random() * 0.2;
  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.Q.value = 0.6;
  filter.frequency.setValueAtTime(lerp(s.filterSmall, s.filterBig, size) * 1.4, now);
  filter.frequency.exponentialRampToValueAtTime(lerp(s.filterSmall, s.filterBig, size) * 0.5, now + length);
  const env = ctx.createGain();
  env.gain.setValueAtTime(0.0001, now);
  env.gain.exponentialRampToValueAtTime(level, now + 0.012);
  env.gain.exponentialRampToValueAtTime(0.0001, now + length);
  src.connect(filter).connect(env).connect(master);
  src.start(now, Math.random() * 0.2, length + 0.05);

  const thump = ctx.createOscillator();
  thump.type = "sine";
  thump.frequency.setValueAtTime(s.thumpFrom * (1 - size * 0.25), now);
  thump.frequency.exponentialRampToValueAtTime(s.thumpTo, now + length * 0.8);
  const thumpEnv = ctx.createGain();
  thumpEnv.gain.setValueAtTime(0.0001, now);
  thumpEnv.gain.exponentialRampToValueAtTime(level * s.thumpLevel, now + 0.01);
  thumpEnv.gain.exponentialRampToValueAtTime(0.0001, now + length * 0.9);
  thump.connect(thumpEnv).connect(master);
  thump.start(now);
  thump.stop(now + length + 0.05);
}
