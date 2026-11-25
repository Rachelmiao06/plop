/**
 * Plop sound engine.
 *
 * Snow rolling and landing are real recordings (public/assets/audio, see CREDITS.md
 * there), cut into small slices and re-pitched live. The launch whoosh is synthesized.
 * If a recording fails to load, a synthesized stand-in plays instead. No packages.
 * All inputs are 0..1 (0 = slowest / smallest / weakest, 1 = fastest / biggest / strongest).
 *
 *   unlockAudio()                  call inside a tap/click handler; nothing plays before this
 *   unlockAudioOnFirstTouch(cb)    or let the engine wait for the first touch anywhere
 *   setCrunch(speed, size)         rolling snow; call as often as you like, speed 0 = silent
 *   stopCrunch()                   stop rolling
 *   playWhoosh(power)              launch
 *   playThump(size)                impact
 *
 * Browsers only allow sound after a user gesture, so every play function is a
 * silent no-op until audio has been unlocked.
 */

/** The recordings the engine plays. */
const FILES = {
  crunch: "/assets/audio/snow-crunch.mp3",
  thump: "/assets/audio/snow-thump.mp3",
} as const;

/** Feel numbers. Tune here; the logic below never hard-codes one. */
export const SOUND = {
  /** Overall volume, 0..1. */
  master: 0.9,

  /** Rolling snow, made of overlapping slices of the real footsteps-in-powder recording. */
  roll: {
    /** Slices per second at the slowest and fastest roll. */
    rateSlow: 2.5,
    rateFast: 13,
    /** Slice length in seconds for the smallest and biggest ball. */
    lengthSmall: 0.2,
    lengthBig: 0.36,
    /** Fade in and out of each slice, as a share of its length. Higher = smoother, fluffier. */
    fade: 0.35,
    /** Playback speed for the smallest and biggest ball. Below 1 = slower and deeper. */
    speedSmall: 1.2,
    speedBig: 0.62,
    /** Random speed change per slice, so no two sound the same. */
    speedSpread: 0.08,
    /** Loudness at the slowest and fastest roll. */
    gainSlow: 0.5,
    gainFast: 1.0,
  },

  /** Landing, from the real snowball recording, with a soft synthesized boom underneath. */
  land: {
    /** Playback speed for the smallest and biggest ball. Below 1 = slower and deeper. */
    speedSmall: 1.25,
    speedBig: 0.7,
    gainSmall: 0.8,
    gainBig: 1.5,
    /** How much of the synthesized boom to mix under the recording (0 = none). */
    boom: 0.4,
  },

  // Everything below is synthesized: the whoosh always, crunch and thump only
  // as stand-ins when a recording has not loaded.

  crunch: {
    /** Grains per second at the slowest and fastest roll. */
    rateSlow: 5,
    rateFast: 34,
    /** Centre pitch of a grain (Hz) for the smallest and biggest ball. */
    pitchSmall: 1000,
    pitchBig: 300,
    /** Random pitch spread per grain, in octaves either way. */
    pitchSpread: 0.5,
    /** How ringy each grain is. Higher = more "squeak", lower = softer and airier. */
    q: 0.8,
    /** Fade-in of each grain in seconds. Longer = softer and fluffier, shorter = papery. */
    attack: 0.014,
    /** Everything above this pitch (Hz) is muffled away. Lower = softer, like a thick blanket of snow. */
    muffle: 1500,
    /** Grain length in seconds for the smallest and biggest ball. */
    lengthSmall: 0.07,
    lengthBig: 0.16,
    /** Loudness of the grains. */
    gain: 1.1,
    /** Extra loudness for the biggest ball, so deep grains are not quieter than bright ones. */
    bigBoost: 2.4,
    /** Loudness of the soft rolling hiss underneath the grains. */
    bedGain: 0.3,
  },

  whoosh: {
    /** Length in seconds at the weakest and strongest launch. */
    lengthWeak: 0.22,
    lengthStrong: 0.5,
    /** Where the sweep starts, and how high it peaks (Hz) for weak / strong. */
    pitchStart: 180,
    pitchPeakWeak: 450,
    pitchPeakStrong: 1300,
    q: 0.8,
    gainWeak: 0.35,
    gainStrong: 1.3,
  },

  thump: {
    /** Starting pitch of the "boom" (Hz) for the smallest and biggest ball. */
    pitchSmall: 210,
    pitchBig: 115,
    /** The boom falls to this fraction of its starting pitch. */
    pitchDrop: 0.32,
    /** Length in seconds for the smallest and biggest ball. */
    lengthSmall: 0.16,
    lengthBig: 0.42,
    gainSmall: 0.55,
    gainBig: 1.0,
    /** The soft "puff" of snow on top of the boom: brightness (Hz) and loudness. */
    puffPitchSmall: 1100,
    puffPitchBig: 450,
    puffGain: 0.7,
    /** Snow bits scattering after the hit: how many, and over how long (seconds). */
    scatterSmall: 5,
    scatterBig: 16,
    scatterTime: 0.3,
  },
} as const;

type Engine = {
  ctx: AudioContext;
  out: GainNode;
  /** Muffled path for snow: grains and rolling hiss go through here. */
  soft: BiquadFilterNode;
  noise: AudioBuffer;
  /** The footsteps recording and the moments in it where snow is actually crunching. */
  roll: { buffer: AudioBuffer; loud: number[] } | null;
  land: AudioBuffer | null;
};

let recordings: Promise<boolean> | null = null;

let engine: Engine | null = null;

const clamp01 = (x: number) =>
  Number.isFinite(x) ? Math.min(1, Math.max(0, x)) : 0;
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
/** Like lerp, but even steps in pitch rather than in Hz. */
const pitchLerp = (a: number, b: number, t: number) => a * Math.pow(b / a, t);

function build(): Engine | null {
  if (typeof window === "undefined" || !("AudioContext" in window)) return null;

  const ctx = new AudioContext();

  // A limiter keeps stacked sounds (thump on top of crunch) from clipping.
  const limiter = ctx.createDynamicsCompressor();
  limiter.threshold.value = -10;
  limiter.knee.value = 12;
  limiter.ratio.value = 8;
  limiter.attack.value = 0.002;
  limiter.release.value = 0.15;
  limiter.connect(ctx.destination);

  const out = ctx.createGain();
  out.gain.value = SOUND.master;
  out.connect(limiter);

  // Two seconds of white noise: the raw material for snow.
  const noise = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
  const data = noise.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;

  const soft = ctx.createBiquadFilter();
  soft.type = "lowpass";
  soft.frequency.value = SOUND.crunch.muffle;
  soft.Q.value = 0.5;
  soft.connect(out);

  return { ctx, out, soft, noise, roll: null, land: null };
}

/** Find the moments (in seconds) where the recording is loud, i.e. a foot is in the snow. */
function loudMoments(buffer: AudioBuffer, sliceLength: number): number[] {
  const data = buffer.getChannelData(0);
  const win = Math.floor(buffer.sampleRate * 0.02);
  const rms: number[] = [];
  for (let i = 0; i + win <= data.length; i += win) {
    let sum = 0;
    for (let j = i; j < i + win; j++) sum += data[j] * data[j];
    rms.push(Math.sqrt(sum / win));
  }
  const sorted = [...rms].sort((a, b) => a - b);
  const threshold = sorted[Math.floor(sorted.length * 0.9)] * 0.3;
  const lastStart = buffer.duration - sliceLength;
  const moments: number[] = [];
  rms.forEach((level, i) => {
    const t = i * 0.02;
    if (level > threshold && t < lastStart) moments.push(t);
  });
  return moments;
}

async function fetchSound(e: Engine, url: string): Promise<AudioBuffer> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${url}: ${response.status}`);
  return e.ctx.decodeAudioData(await response.arrayBuffer());
}

async function loadRecordings(e: Engine): Promise<boolean> {
  try {
    const [roll, land] = await Promise.all([
      fetchSound(e, FILES.crunch),
      fetchSound(e, FILES.thump),
    ]);
    // Slices are read up to speedSmall times faster than real time.
    const longest = SOUND.roll.lengthBig * (SOUND.roll.speedSmall + SOUND.roll.speedSpread);
    const loud = loudMoments(roll, longest);
    if (loud.length === 0) return false;
    e.roll = { buffer: roll, loud };
    e.land = land;
    return true;
  } catch {
    return false; // the synthesized stand-ins keep working
  }
}

/** The engine if audio has been unlocked, otherwise null. */
function live(): Engine | null {
  if (!engine) return null;
  // Phones suspend audio when the tab goes to the background; wake it up.
  if (engine.ctx.state !== "running") void engine.ctx.resume();
  return engine;
}

/**
 * Turn sound on. Must be called from inside a user gesture (tap, click, key press).
 * Safe to call many times. Returns true once audio exists.
 */
export function unlockAudio(): boolean {
  if (!engine) {
    engine = build();
    if (engine) recordings = loadRecordings(engine);
  }
  if (!engine) return false;
  if (engine.ctx.state !== "running") void engine.ctx.resume();
  return true;
}

/** True once unlockAudio has succeeded. */
export function isAudioUnlocked(): boolean {
  return engine !== null;
}

/**
 * Resolves true once the real recordings are loaded, false if they could not be
 * (the synthesized stand-ins play instead). Call after audio is unlocked.
 */
export function whenRecordingsLoaded(): Promise<boolean> {
  return recordings ?? Promise.resolve(false);
}

/**
 * Wait for the first touch, click or key press anywhere on the page, then turn
 * sound on. Returns a function that cancels the wait.
 */
export function unlockAudioOnFirstTouch(onUnlocked?: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const events = ["pointerup", "touchend", "click", "keydown"] as const;
  const remove = () =>
    events.forEach((e) => window.removeEventListener(e, handler, true));
  const handler = () => {
    if (!unlockAudio()) return;
    remove();
    onUnlocked?.();
  };
  events.forEach((e) => window.addEventListener(e, handler, true));
  return remove;
}

/** One tiny burst of filtered noise: a single snow crystal giving way. */
function grain(e: Engine, at: number, size: number, level: number) {
  const c = SOUND.crunch;
  const length =
    lerp(c.lengthSmall, c.lengthBig, size) * (0.6 + 0.8 * Math.random());

  const src = e.ctx.createBufferSource();
  src.buffer = e.noise;

  const band = e.ctx.createBiquadFilter();
  band.type = "bandpass";
  band.frequency.value =
    pitchLerp(c.pitchSmall, c.pitchBig, size) *
    Math.pow(2, (Math.random() * 2 - 1) * c.pitchSpread);
  band.Q.value = c.q;

  const env = e.ctx.createGain();
  env.gain.setValueAtTime(0, at);
  env.gain.linearRampToValueAtTime(level * lerp(1, c.bigBoost, size), at + Math.min(c.attack, length * 0.4));
  env.gain.exponentialRampToValueAtTime(0.0001, at + length);

  src.connect(band).connect(env).connect(e.soft);
  src.start(at, Math.random() * (e.noise.duration - 0.2), length + 0.02);
}

/** One soft-edged slice of the real snow recording, slowed down for a bigger ball. */
function slice(e: Engine, at: number, size: number, speed: number) {
  if (!e.roll) return;
  const r = SOUND.roll;
  const length = lerp(r.lengthSmall, r.lengthBig, size) * (0.8 + 0.4 * Math.random());
  const rate =
    lerp(r.speedSmall, r.speedBig, size) + (Math.random() * 2 - 1) * r.speedSpread;
  const level = lerp(r.gainSlow, r.gainFast, speed) * (0.7 + 0.3 * Math.random());
  const fade = length * r.fade;

  const src = e.ctx.createBufferSource();
  src.buffer = e.roll.buffer;
  src.playbackRate.value = rate;

  const env = e.ctx.createGain();
  env.gain.setValueAtTime(0, at);
  env.gain.linearRampToValueAtTime(level, at + fade);
  env.gain.setValueAtTime(level, at + length - fade);
  env.gain.linearRampToValueAtTime(0, at + length);

  src.connect(env).connect(e.out);
  const from = e.roll.loud[Math.floor(Math.random() * e.roll.loud.length)];
  src.start(at, from, length * rate + 0.02);
}

// ---------------------------------------------------------------- crunch

const LOOKAHEAD = 0.1; // seconds of grains scheduled ahead of time
const TICK_MS = 30;

let crunchSpeed = 0;
let crunchSize = 0;
let crunchTimer: ReturnType<typeof setInterval> | null = null;
let nextGrainAt = 0;
let bed: { src: AudioBufferSourceNode; band: BiquadFilterNode; gain: GainNode } | null =
  null;

function crunchTick() {
  const e = live();
  if (!e) return;
  const c = SOUND.crunch;
  const now = e.ctx.currentTime;
  const rate = e.roll
    ? lerp(SOUND.roll.rateSlow, SOUND.roll.rateFast, crunchSpeed)
    : lerp(c.rateSlow, c.rateFast, crunchSpeed);

  if (nextGrainAt < now) nextGrainAt = now;
  while (nextGrainAt < now + LOOKAHEAD) {
    if (e.roll) {
      slice(e, nextGrainAt, crunchSize, crunchSpeed);
    } else {
      const level = c.gain * lerp(0.45, 1, crunchSpeed) * (0.35 + 0.65 * Math.random());
      grain(e, nextGrainAt, crunchSize, level);
    }
    // Uneven gaps, so it sounds like snow and not like a motor.
    nextGrainAt += (0.3 + 1.4 * Math.random()) / rate;
  }

  // The synthesized hiss is only needed while the stand-in is playing.
  if (bed && e.roll) bed.gain.gain.setTargetAtTime(0, now, 0.05);
  else if (bed) {
    bed.band.frequency.setTargetAtTime(
      pitchLerp(c.pitchSmall, c.pitchBig, crunchSize) * 0.6,
      now,
      0.05,
    );
    bed.gain.gain.setTargetAtTime(
      c.bedGain * crunchSpeed * lerp(1, c.bigBoost, crunchSize),
      now,
      0.05,
    );
  }
}

/**
 * Rolling snow. Call whenever speed or ball size changes (every frame is fine).
 * Faster = denser grains; bigger ball = lower, longer grains. Speed 0 stops it.
 */
export function setCrunch(speed: number, size: number) {
  crunchSpeed = clamp01(speed);
  crunchSize = clamp01(size);
  if (crunchSpeed === 0) return stopCrunch();

  const e = live();
  if (!e || crunchTimer) return;

  const src = e.ctx.createBufferSource();
  src.buffer = e.noise;
  src.loop = true;
  const band = e.ctx.createBiquadFilter();
  band.type = "bandpass";
  band.Q.value = 0.7;
  band.frequency.value = pitchLerp(SOUND.crunch.pitchSmall, SOUND.crunch.pitchBig, crunchSize) * 0.6;
  const gain = e.ctx.createGain();
  gain.gain.value = 0;
  src.connect(band).connect(gain).connect(e.soft);
  src.start();
  bed = { src, band, gain };

  nextGrainAt = e.ctx.currentTime + 0.01;
  crunchTimer = setInterval(crunchTick, TICK_MS);
  crunchTick();
}

/** Stop the rolling sound. Grains already in the air finish naturally. */
export function stopCrunch() {
  crunchSpeed = 0;
  if (crunchTimer) {
    clearInterval(crunchTimer);
    crunchTimer = null;
  }
  if (bed && engine) {
    const now = engine.ctx.currentTime;
    bed.gain.gain.setTargetAtTime(0, now, 0.03);
    bed.src.stop(now + 0.2);
  }
  bed = null;
}

// ---------------------------------------------------------------- whoosh

/** Launch: a rush of air that sweeps up and away. More power = longer, brighter, louder. */
export function playWhoosh(power: number) {
  const e = live();
  if (!e) return;
  const w = SOUND.whoosh;
  const p = clamp01(power);
  const at = e.ctx.currentTime + 0.005;
  const length = lerp(w.lengthWeak, w.lengthStrong, p);
  const peakAt = at + length * 0.3;
  const peakPitch = pitchLerp(w.pitchPeakWeak, w.pitchPeakStrong, p);
  const level = lerp(w.gainWeak, w.gainStrong, p);

  const src = e.ctx.createBufferSource();
  src.buffer = e.noise;
  src.loop = true;

  const band = e.ctx.createBiquadFilter();
  band.type = "bandpass";
  band.Q.value = w.q;
  band.frequency.setValueAtTime(w.pitchStart, at);
  band.frequency.exponentialRampToValueAtTime(peakPitch, peakAt);
  band.frequency.exponentialRampToValueAtTime(peakPitch * 0.35, at + length);

  const env = e.ctx.createGain();
  env.gain.setValueAtTime(0.0001, at);
  env.gain.exponentialRampToValueAtTime(level, peakAt);
  env.gain.exponentialRampToValueAtTime(0.0001, at + length);

  src.connect(band).connect(env).connect(e.soft);
  src.start(at, Math.random() * e.noise.duration);
  src.stop(at + length + 0.05);
}

// ---------------------------------------------------------------- thump

/** Impact: the recorded snowball over a soft boom. Bigger ball = deeper, longer, louder. */
export function playThump(size: number) {
  const e = live();
  if (!e) return;
  const t = SOUND.thump;
  const s = clamp01(size);
  const at = e.ctx.currentTime + 0.005;
  const length = lerp(t.lengthSmall, t.lengthBig, s);
  const level = lerp(t.gainSmall, t.gainBig, s);

  // The boom. A triangle wave (not a pure sine) so small phone speakers,
  // which cannot play deep bass, still have something to reproduce.
  const pitch = pitchLerp(t.pitchSmall, t.pitchBig, s);
  const osc = e.ctx.createOscillator();
  osc.type = "triangle";
  osc.frequency.setValueAtTime(pitch, at);
  osc.frequency.exponentialRampToValueAtTime(pitch * t.pitchDrop, at + length * 0.6);
  const soften = e.ctx.createBiquadFilter();
  soften.type = "lowpass";
  soften.frequency.value = 700;
  const boom = e.ctx.createGain();
  boom.gain.setValueAtTime(0, at);
  boom.gain.linearRampToValueAtTime(e.land ? level * SOUND.land.boom : level, at + 0.004);
  boom.gain.exponentialRampToValueAtTime(0.0001, at + length);
  osc.connect(soften).connect(boom).connect(e.out);
  osc.start(at);
  osc.stop(at + length + 0.05);

  // The real snowball, slowed down for a bigger ball.
  if (e.land) {
    const l = SOUND.land;
    const hit = e.ctx.createBufferSource();
    hit.buffer = e.land;
    hit.playbackRate.value = lerp(l.speedSmall, l.speedBig, s);
    const hitGain = e.ctx.createGain();
    hitGain.gain.value = lerp(l.gainSmall, l.gainBig, s);
    hit.connect(hitGain).connect(e.out);
    hit.start(at);
    return;
  }

  // Stand-in puff: muffled noise that dies quickly.
  const puffLength = length * 0.7;
  const src = e.ctx.createBufferSource();
  src.buffer = e.noise;
  const muffle = e.ctx.createBiquadFilter();
  muffle.type = "lowpass";
  const puffPitch = pitchLerp(t.puffPitchSmall, t.puffPitchBig, s);
  muffle.frequency.setValueAtTime(puffPitch, at);
  muffle.frequency.exponentialRampToValueAtTime(puffPitch * 0.3, at + puffLength);
  const puff = e.ctx.createGain();
  puff.gain.setValueAtTime(0, at);
  puff.gain.linearRampToValueAtTime(level * t.puffGain, at + 0.003);
  puff.gain.exponentialRampToValueAtTime(0.0001, at + puffLength);
  src.connect(muffle).connect(puff).connect(e.out);
  src.start(at, Math.random() * (e.noise.duration - 1), puffLength + 0.05);

  // The scatter: crunch grains thinning out and fading.
  const bits = Math.round(lerp(t.scatterSmall, t.scatterBig, s));
  for (let i = 0; i < bits; i++) {
    const when = Math.pow(Math.random(), 1.6) * t.scatterTime;
    const fade = 1 - when / t.scatterTime;
    grain(e, at + 0.015 + when, s * 0.7, SOUND.crunch.gain * level * 0.7 * fade);
  }
}
