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
 * Background music and the two on / off switches (remembered in localStorage):
 *
 *   startMusicOnFirstTouch()       music fades in quietly after the first touch, if it is on
 *   toggleMusic() / setMusicOn(on) music on / off with a fade; call from a tap or click
 *   setEffectsOn(on)               sound effects on / off (music keeps playing)
 *   setMusicVolume(v)              music volume 0..1, separate from the effects
 *   getAudioSettings()             { music, effects, musicPlaying }
 *   subscribeAudioSettings(cb)     called whenever one of those changes
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
    if (engine) {
      recordings = loadRecordings(engine);
      applyEffectsSwitch();
    }
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

// ---------------------------------------------------------------- music and switches

/** Background music. The credit lives in docs/CREDITS.md. Tune here. */
export const MUSIC = {
  src: "/assets/music/japanese-lofi-jazz.mp3",
  /** Music volume, 0..1, separate from the effects (SOUND.master). Quiet, so it sits under the snow. */
  volume: 0.28,
  /** Seconds to fade in when music starts, and to fade out when it is switched off. */
  fadeIn: 3,
  fadeOut: 0.9,
  /** Seconds to fade the effects in or out when their switch flips. */
  effectsFade: 0.15,
} as const;

/** localStorage keys for the two switches. */
const STORAGE = { music: "plop.music", effects: "plop.effects" } as const;

export type AudioSettings = {
  /** The music switch (on = wanted; it may still be waiting for the first touch). */
  music: boolean;
  /** The sound effects switch. */
  effects: boolean;
  /** True while music is actually audible or fading in. */
  musicPlaying: boolean;
};

function readSwitch(key: string): boolean {
  try {
    return window.localStorage.getItem(key) !== "off";
  } catch {
    return true; // private mode or blocked storage: default to on
  }
}

function writeSwitch(key: string, on: boolean) {
  try {
    window.localStorage.setItem(key, on ? "on" : "off");
  } catch {
    // not remembered, still works for this visit
  }
}

const SERVER_SETTINGS: AudioSettings = { music: true, effects: true, musicPlaying: false };
let settings: AudioSettings | null = null;
const listeners = new Set<() => void>();

/** The current switches. Safe to call on the server (returns the defaults). */
export function getAudioSettings(): AudioSettings {
  if (typeof window === "undefined") return SERVER_SETTINGS;
  if (!settings) {
    settings = {
      music: readSwitch(STORAGE.music),
      effects: readSwitch(STORAGE.effects),
      musicPlaying: false,
    };
  }
  return settings;
}

/** Defaults used while rendering on the server. */
export function getServerAudioSettings(): AudioSettings {
  return SERVER_SETTINGS;
}

/** Calls back whenever the switches change. Returns an unsubscribe function. */
export function subscribeAudioSettings(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function update(patch: Partial<AudioSettings>) {
  settings = { ...getAudioSettings(), ...patch };
  listeners.forEach((cb) => cb());
}

// --- effects switch: fades the effects bus (engine.out); music has its own path.

function applyEffectsSwitch() {
  if (!engine) return;
  const now = engine.ctx.currentTime;
  const target = getAudioSettings().effects ? SOUND.master : 0;
  engine.out.gain.cancelScheduledValues(now);
  engine.out.gain.setTargetAtTime(target, now, MUSIC.effectsFade / 3);
}

/** Sound effects on or off. The music is not affected. */
export function setEffectsOn(on: boolean) {
  writeSwitch(STORAGE.effects, on);
  update({ effects: on });
  if (on) unlockAudio();
  applyEffectsSwitch();
}

// --- music: an <audio> element routed through the engine, so fades and volume
// work on iPhone too (where element.volume is read-only).

let musicVolume: number = MUSIC.volume;
let music: { el: HTMLAudioElement; gain: GainNode } | null = null;
let musicStopTimer: ReturnType<typeof setTimeout> | null = null;
let hiddenListener = false;

function musicPath(e: Engine) {
  if (music) return music;
  const el = new Audio(MUSIC.src);
  el.loop = true;
  el.preload = "auto";
  const gain = e.ctx.createGain();
  gain.gain.value = 0;
  e.ctx.createMediaElementSource(el).connect(gain).connect(e.ctx.destination);
  music = { el, gain };
  return music;
}

function fadeMusicTo(target: number, seconds: number) {
  if (!engine || !music) return;
  const g = music.gain.gain;
  const now = engine.ctx.currentTime;
  g.cancelScheduledValues(now);
  g.setValueAtTime(g.value, now);
  g.linearRampToValueAtTime(target, now + seconds);
}

/** Start (or keep) the music with a fade in. Must run inside a user gesture the first time. */
function playMusic() {
  if (!unlockAudio() || !engine) return;
  const m = musicPath(engine);
  if (musicStopTimer) {
    clearTimeout(musicStopTimer);
    musicStopTimer = null;
  }
  if (m.el.paused) {
    m.gain.gain.cancelScheduledValues(engine.ctx.currentTime);
    m.gain.gain.setValueAtTime(0, engine.ctx.currentTime);
    void m.el.play().catch(() => update({ musicPlaying: false }));
  }
  fadeMusicTo(musicVolume, MUSIC.fadeIn);
  update({ musicPlaying: true });
  watchTabVisibility();
}

/** Fade the music out, then pause it so it costs nothing. */
function stopMusic() {
  if (!music) return update({ musicPlaying: false });
  fadeMusicTo(0, MUSIC.fadeOut);
  if (musicStopTimer) clearTimeout(musicStopTimer);
  const el = music.el;
  musicStopTimer = setTimeout(() => {
    el.pause();
    musicStopTimer = null;
  }, MUSIC.fadeOut * 1000 + 50);
  update({ musicPlaying: false });
}

/** Pause the music while the tab is hidden, and bring it back (if it is on) when it returns. */
function watchTabVisibility() {
  if (hiddenListener || typeof document === "undefined") return;
  hiddenListener = true;
  document.addEventListener("visibilitychange", () => {
    if (!music) return;
    if (document.hidden) stopMusic();
    else if (getAudioSettings().music) playMusic();
  });
}

/** Music on or off, remembered for next time. Call from a tap or click. */
export function setMusicOn(on: boolean) {
  writeSwitch(STORAGE.music, on);
  update({ music: on });
  if (on) playMusic();
  else stopMusic();
}

/**
 * What the music button does. If music is on but still waiting for the first
 * touch (silent), a tap starts it instead of switching it off.
 */
export function toggleMusic() {
  const s = getAudioSettings();
  if (s.music && !s.musicPlaying) setMusicOn(true);
  else setMusicOn(!s.music);
}

/** Music volume 0..1. Separate from the sound effects. */
export function setMusicVolume(volume: number) {
  musicVolume = clamp01(volume);
  if (getAudioSettings().musicPlaying) fadeMusicTo(musicVolume, 0.1);
}

/**
 * Wait for the first touch, click or key press anywhere, then turn sound on and,
 * if the music switch is on, fade the music in. Touches on elements marked
 * `data-audio-toggle` are skipped: those buttons handle sound themselves.
 * Returns a function that cancels the wait.
 */
export function startMusicOnFirstTouch(): () => void {
  if (typeof window === "undefined") return () => {};
  const events = ["pointerup", "touchend", "click", "keydown"] as const;
  const remove = () =>
    events.forEach((e) => window.removeEventListener(e, handler, true));
  const handler = (event: Event) => {
    const target = event.target;
    if (target instanceof Element && target.closest("[data-audio-toggle]")) {
      remove();
      return;
    }
    if (!unlockAudio()) return;
    remove();
    if (getAudioSettings().music) playMusic();
  };
  events.forEach((e) => window.addEventListener(e, handler, true));
  return remove;
}

// ================================================================ ambience and cues
//
// Added for the village. Everything below only adds; nothing above changed.
//
//   startAmbience()                quiet village bed: wind with gusts, the cocoa-corner fire,
//                                  now and then distant wind chimes or sleigh bells, a chickadee.
//                                  Call from a tap or click the first time (it unlocks audio).
//   startAmbienceOnFirstTouch()    or let it start with the first touch anywhere
//   stopAmbience()                 fade it out
//   setAmbienceVolume(v)           ambience volume 0..1, separate from music and effects
//   isAmbiencePlaying()
//
// The ambience and the cues run on the effects bus, so the sound-effects switch
// (setEffectsOn) silences them too; the music switch does not touch them.
//
// Named one-shots for game moments (no inputs; all soft and short):
//
//   playRoundStart()   a soft chime
//   playStarHit()      a little sparkle, for the star pin
//   playNearMiss()     a tiny surprised kitten "mew", for a near miss on the cat or a friend
//   playFullClear()    a warm bell flourish
//   playWin()          a short happy jingle for the end card
//   playTie()          a gentle two-note "ding-dong"
//   playTap()          a soft paper tap, for buttons

/** The ambience recordings (credits in public/assets/audio/CREDITS.md). Loaded only when needed. */
const EXTRA_FILES = {
  wind: "/assets/audio/ambience-wind.mp3",
  fire: "/assets/audio/ambience-fire.mp3",
  bird: "/assets/audio/ambience-chickadee.mp3",
  bells: "/assets/audio/ambience-sleigh-bells.mp3",
  mew: "/assets/audio/kitten-mew.mp3",
} as const;

type ExtraName = keyof typeof EXTRA_FILES;

/** Ambience feel numbers. Tune here. Gains are relative to AMBIENCE.volume. */
export const AMBIENCE = {
  /** Ambience volume, 0..1. At 0.65 the bed sits about 14 dB under the music. */
  volume: 0.65,
  /** Seconds to fade in when it starts and out when it stops. */
  fadeIn: 4,
  fadeOut: 1.2,

  wind: {
    /** Exact length of the loop inside the file (seconds); the end is cross-faded into the start. */
    loop: 26,
    gain: 0.55,
    /** Wind is muffled to this pitch (Hz) between gusts, and opens up to gustPitch in a gust. */
    pitch: 900,
    gustPitch: 2200,
    /** A gust swells the wind by up to this much (0.6 = 60% louder). */
    gustDepth: 0.6,
    /** Seconds between gusts, and how long one takes to rise and to fall away. */
    gustEvery: [6, 14],
    gustRise: [1.2, 2.6],
    gustFall: [2, 4.5],
  },

  fire: {
    loop: 13,
    gain: 0.22,
    /** Softened above this pitch (Hz): it is across the square, not in your lap. */
    pitch: 3500,
    /** -1 left .. 1 right. The cocoa corner is back left in the village. */
    pan: -0.35,
  },

  /** Distant wind chimes: a few soft notes from a pentatonic set, now and then. */
  chimes: {
    every: [12, 28],
    notes: [1047, 1175, 1319, 1568, 1760, 2093],
    count: [2, 5],
    /** Seconds between notes in one cluster. */
    stagger: [0.12, 0.55],
    decay: 3.2,
    gain: 0.05,
    pitch: 3200,
  },

  /** Instead of chimes, sometimes distant sleigh bells (share of the chime moments). */
  bells: { share: 0.3, gain: 0.16, pitch: 3800 },

  bird: {
    every: [20, 45],
    gain: 0.16,
    /** Random playback speed either way, so it is not the same chirp every time. */
    speedSpread: 0.06,
    pitch: 7000,
  },

  /** How much of the distant sounds (chimes, bells, bird) goes into the soft room echo. */
  echo: 0.45,
  echoLength: 2.2,
} as const;

/** One-shot cue feel numbers. Tune here. */
export const CUES = {
  /** Overall cue volume, 0..1, on top of the effects bus. At 0.42 every cue peaks well under the thump. */
  volume: 0.42,
  /** Everything above this pitch (Hz) is softened, so no cue is ever sharp. */
  softness: 5200,
  /** How much of each cue goes into the soft echo. */
  echo: 0.25,

  roundStart: { notes: [784, 1175], gap: 0.09, gain: 0.32, decay: 1.4 },
  starHit: { notes: [1568, 1976, 2349, 2637, 3136], gap: 0.045, gain: 0.14, decay: 0.7 },
  nearMiss: { gain: 0.55, speed: [0.98, 1.12], pitch: 4200 },
  fullClear: {
    notes: [523, 659, 784, 1047, 1319, 1568],
    gap: 0.075,
    gain: 0.2,
    decay: 1.3,
    /** The closing chord, after the run. */
    chord: [523, 784, 1047, 1319],
    chordGain: 0.12,
    chordDecay: 2.2,
    /** A little distant sleigh-bell shimmer underneath (0 = none). */
    bells: 0.12,
  },
  win: {
    /** [pitch Hz, start seconds] — a tiny music-box tune. */
    tune: [
      [784, 0],
      [988, 0.13],
      [1175, 0.26],
      [1568, 0.42],
      [1319, 0.6],
      [1568, 0.74],
    ],
    gain: 0.24,
    decay: 0.9,
    chord: [784, 1175, 1568],
    chordAt: 0.9,
    chordGain: 0.1,
    chordDecay: 1.8,
  },
  tie: { notes: [988, 784], gap: 0.32, gain: 0.26, decay: 1.5 },
  tap: { pitch: 1700, length: 0.035, gain: 0.22, thump: 190, thumpGain: 0.18 },
} as const;

type Extras = {
  /** Ambience volume and fade (separate from the cues). */
  bed: GainNode;
  /** Cues gain, softened. */
  cues: GainNode;
  /** A soft room echo shared by ambience and cues. */
  echo: ConvolverNode;
};

let extras: Extras | null = null;
const extraBuffers = new Map<ExtraName, Promise<AudioBuffer | null>>();

const pick = (range: readonly [number, number] | readonly number[]) =>
  lerp(range[0], range[1], Math.random());

/** A gentle room echo: two seconds of softly decaying noise. */
function echoImpulse(ctx: AudioContext, seconds: number): AudioBuffer {
  const length = Math.floor(ctx.sampleRate * seconds);
  const buffer = ctx.createBuffer(2, length, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = buffer.getChannelData(ch);
    for (let i = 0; i < length; i++) {
      const t = i / length;
      d[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, 3) * 0.5;
    }
  }
  return buffer;
}

function extrasFor(e: Engine): Extras {
  if (extras) return extras;
  const echo = e.ctx.createConvolver();
  echo.buffer = echoImpulse(e.ctx, AMBIENCE.echoLength);
  const echoSoft = e.ctx.createBiquadFilter();
  echoSoft.type = "lowpass";
  echoSoft.frequency.value = 3000;
  echo.connect(echoSoft).connect(e.out);

  const bed = e.ctx.createGain();
  bed.gain.value = 0;
  bed.connect(e.out);

  const soften = e.ctx.createBiquadFilter();
  soften.type = "lowpass";
  soften.frequency.value = CUES.softness;
  soften.Q.value = 0.5;
  soften.connect(e.out);
  const cues = e.ctx.createGain();
  cues.gain.value = CUES.volume;
  cues.connect(soften);

  extras = { bed, cues, echo };
  return extras;
}

/** Load one of the extra recordings once; null if it could not be loaded. */
function extraBuffer(e: Engine, name: ExtraName): Promise<AudioBuffer | null> {
  let p = extraBuffers.get(name);
  if (!p) {
    p = fetchSound(e, EXTRA_FILES[name]).catch(() => null);
    extraBuffers.set(name, p);
  }
  return p;
}

/**
 * Where the sound really starts. Some browsers keep the few milliseconds of
 * silence an MP3 encoder adds; skipping it keeps a loop seamless either way.
 */
function soundStart(buffer: AudioBuffer): number {
  const d = buffer.getChannelData(0);
  const limit = Math.min(d.length, Math.floor(buffer.sampleRate * 0.1));
  for (let i = 0; i < limit; i++) if (Math.abs(d[i]) > 1e-4) return i / buffer.sampleRate;
  return 0;
}

/** A soft bell voice: a sine with a quiet overtone, fading out. */
function bell(
  e: Engine,
  dest: AudioNode,
  at: number,
  pitch: number,
  gain: number,
  decay: number,
  overtones: readonly (readonly [number, number])[] = [
    [2, 0.25],
    [3, 0.08],
  ],
) {
  const env = e.ctx.createGain();
  env.gain.setValueAtTime(0, at);
  env.gain.linearRampToValueAtTime(gain, at + 0.006);
  env.gain.exponentialRampToValueAtTime(0.0001, at + decay);
  env.connect(dest);
  const voices: [number, number][] = [[1, 1], ...overtones.map(([r, g]) => [r, g] as [number, number])];
  for (const [ratio, level] of voices) {
    const osc = e.ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.value = pitch * ratio;
    const g = e.ctx.createGain();
    // Overtones die sooner than the note itself, like a real bell.
    g.gain.setValueAtTime(level, at);
    if (ratio !== 1) g.gain.exponentialRampToValueAtTime(0.0001, at + decay * 0.4);
    osc.connect(g).connect(env);
    osc.start(at);
    osc.stop(at + decay + 0.05);
  }
}

/** Send a cue voice both straight out and a little into the echo. */
function cueBus(e: Engine, x: Extras, echoAmount: number = CUES.echo): GainNode {
  const g = e.ctx.createGain();
  g.connect(x.cues);
  const send = e.ctx.createGain();
  send.gain.value = echoAmount;
  g.connect(send).connect(x.echo);
  return g;
}

/** Play a recording once through the given chain. */
function playBuffer(
  e: Engine,
  buffer: AudioBuffer,
  dest: AudioNode,
  at: number,
  opts: { gain: number; speed?: number; pitch?: number; pan?: number },
) {
  const src = e.ctx.createBufferSource();
  src.buffer = buffer;
  src.playbackRate.value = opts.speed ?? 1;
  const soft = e.ctx.createBiquadFilter();
  soft.type = "lowpass";
  soft.frequency.value = opts.pitch ?? 8000;
  const g = e.ctx.createGain();
  g.gain.value = opts.gain;
  let node: AudioNode = src.connect(soft).connect(g);
  if (opts.pan) {
    const p = e.ctx.createStereoPanner();
    p.pan.value = opts.pan;
    node = node.connect(p);
  }
  node.connect(dest);
  src.start(at, soundStart(buffer));
}

// ---------------------------------------------------------------- ambience

type Loop = { src: AudioBufferSourceNode; filter: BiquadFilterNode; gain: GainNode };

let ambienceWanted = false;
let ambienceVolume: number = AMBIENCE.volume;
let ambienceTimer: ReturnType<typeof setInterval> | null = null;
let ambienceStopTimer: ReturnType<typeof setTimeout> | null = null;
let ambienceHiddenListener = false;
let loops: { wind: Loop | null; fire: Loop | null } = { wind: null, fire: null };
const nextAt = { gust: 0, chime: 0, bird: 0 };

function startLoop(
  e: Engine,
  x: Extras,
  buffer: AudioBuffer,
  length: number,
  gain: number,
  pitch: number,
  pan = 0,
): Loop {
  const src = e.ctx.createBufferSource();
  src.buffer = buffer;
  src.loop = true;
  const start = soundStart(buffer);
  src.loopStart = start;
  src.loopEnd = Math.min(buffer.duration, start + length);
  const filter = e.ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = pitch;
  filter.Q.value = 0.4;
  const g = e.ctx.createGain();
  g.gain.value = gain;
  let node: AudioNode = src.connect(filter).connect(g);
  if (pan) {
    const p = e.ctx.createStereoPanner();
    p.pan.value = pan;
    node = node.connect(p);
  }
  node.connect(x.bed);
  // Start somewhere in the loop so two visits never begin the same way.
  src.start(e.ctx.currentTime + 0.02, start + Math.random() * (src.loopEnd - start));
  return { src, filter, gain: g };
}

function fadeBedTo(target: number, seconds: number) {
  if (!engine || !extras) return;
  const g = extras.bed.gain;
  const now = engine.ctx.currentTime;
  g.cancelScheduledValues(now);
  g.setValueAtTime(g.value, now);
  g.linearRampToValueAtTime(target, now + seconds);
}

function gust(at: number) {
  const loop = loops.wind;
  if (!loop) return;
  const w = AMBIENCE.wind;
  const swell = 1 + w.gustDepth * (0.4 + 0.6 * Math.random());
  const rise = pick(w.gustRise);
  const fall = pick(w.gustFall);
  const g = loop.gain.gain;
  const f = loop.filter.frequency;
  g.cancelScheduledValues(at);
  f.cancelScheduledValues(at);
  g.setTargetAtTime(w.gain * swell, at, rise / 3);
  f.setTargetAtTime(lerp(w.pitch, w.gustPitch, swell - 1), at, rise / 3);
  g.setTargetAtTime(w.gain, at + rise, fall / 3);
  f.setTargetAtTime(w.pitch, at + rise, fall / 3);
}

function distantSend(e: Engine, x: Extras): GainNode {
  const g = e.ctx.createGain();
  g.connect(x.bed);
  const send = e.ctx.createGain();
  send.gain.value = AMBIENCE.echo;
  g.connect(send).connect(x.echo);
  return g;
}

function chimes(e: Engine, x: Extras, at: number) {
  const c = AMBIENCE.chimes;
  const dest = distantSend(e, x);
  const soft = e.ctx.createBiquadFilter();
  soft.type = "lowpass";
  soft.frequency.value = c.pitch;
  const pan = e.ctx.createStereoPanner();
  pan.pan.value = (Math.random() * 2 - 1) * 0.6;
  soft.connect(pan).connect(dest);
  const count = Math.round(pick(c.count));
  let t = at;
  for (let i = 0; i < count; i++) {
    const note = c.notes[Math.floor(Math.random() * c.notes.length)];
    // Tube chimes ring with uneven overtones.
    bell(e, soft, t, note, c.gain * (0.6 + 0.4 * Math.random()), c.decay, [
      [2.76, 0.18],
      [5.4, 0.06],
    ]);
    t += pick(c.stagger);
  }
}

function ambienceTick() {
  const e = live();
  if (!e || !extras || !ambienceWanted) return;
  const x = extras;
  const now = e.ctx.currentTime;
  const ahead = now + 0.3;

  if (nextAt.gust < ahead) {
    gust(Math.max(now, nextAt.gust));
    nextAt.gust = now + pick(AMBIENCE.wind.gustEvery);
  }
  if (nextAt.chime < ahead) {
    const at = Math.max(now, nextAt.chime);
    nextAt.chime = now + pick(AMBIENCE.chimes.every);
    if (Math.random() < AMBIENCE.bells.share) {
      void extraBuffer(e, "bells").then((b) => {
        if (b && ambienceWanted)
          playBuffer(e, b, distantSend(e, x), at, {
            gain: AMBIENCE.bells.gain,
            pitch: AMBIENCE.bells.pitch,
            pan: (Math.random() * 2 - 1) * 0.5,
          });
      });
    } else chimes(e, x, at);
  }
  if (nextAt.bird < ahead) {
    const at = Math.max(now, nextAt.bird);
    nextAt.bird = now + pick(AMBIENCE.bird.every);
    void extraBuffer(e, "bird").then((b) => {
      if (b && ambienceWanted)
        playBuffer(e, b, distantSend(e, x), at, {
          gain: AMBIENCE.bird.gain,
          speed: 1 + (Math.random() * 2 - 1) * AMBIENCE.bird.speedSpread,
          pitch: AMBIENCE.bird.pitch,
          pan: (Math.random() * 2 - 1) * 0.7,
        });
    });
  }
}

function resumeAmbience(e: Engine) {
  const x = extrasFor(e);
  if (ambienceStopTimer) {
    clearTimeout(ambienceStopTimer);
    ambienceStopTimer = null;
  }
  fadeBedTo(ambienceVolume, AMBIENCE.fadeIn);
  if (!loops.wind && !loops.fire) {
    void Promise.all([extraBuffer(e, "wind"), extraBuffer(e, "fire")]).then(([wind, fire]) => {
      if (!ambienceWanted || loops.wind || loops.fire) return;
      const w = AMBIENCE.wind;
      const f = AMBIENCE.fire;
      if (wind) loops.wind = startLoop(e, x, wind, w.loop, w.gain, w.pitch);
      if (fire) loops.fire = startLoop(e, x, fire, f.loop, f.gain, f.pitch, f.pan);
    });
  }
  if (!ambienceTimer) {
    const now = e.ctx.currentTime;
    // The first chime and bird come a little while after the bed, never at once.
    nextAt.gust = now + pick(AMBIENCE.wind.gustEvery);
    nextAt.chime = now + pick(AMBIENCE.chimes.every) * 0.5;
    nextAt.bird = now + pick(AMBIENCE.bird.every) * 0.5;
    ambienceTimer = setInterval(ambienceTick, 250);
  }
}

function pauseAmbience() {
  if (ambienceTimer) {
    clearInterval(ambienceTimer);
    ambienceTimer = null;
  }
  fadeBedTo(0, AMBIENCE.fadeOut);
  if (ambienceStopTimer) clearTimeout(ambienceStopTimer);
  ambienceStopTimer = setTimeout(() => {
    loops.wind?.src.stop();
    loops.fire?.src.stop();
    loops = { wind: null, fire: null };
    ambienceStopTimer = null;
  }, AMBIENCE.fadeOut * 1000 + 100);
}

/** Pause the ambience while the tab is hidden, and bring it back when it returns. */
function watchAmbienceVisibility() {
  if (ambienceHiddenListener || typeof document === "undefined") return;
  ambienceHiddenListener = true;
  document.addEventListener("visibilitychange", () => {
    if (!ambienceWanted || !engine) return;
    if (document.hidden) pauseAmbience();
    else resumeAmbience(engine);
  });
}

/**
 * Start the quiet village ambience with a slow fade in. Must run inside a user
 * gesture the first time (it unlocks audio). Follows the sound-effects switch.
 */
export function startAmbience() {
  if (!unlockAudio() || !engine) return;
  ambienceWanted = true;
  resumeAmbience(engine);
  watchAmbienceVisibility();
}

/** Fade the ambience out and stop it. */
export function stopAmbience() {
  ambienceWanted = false;
  pauseAmbience();
}

/** True while the ambience is wanted (playing or fading in). */
export function isAmbiencePlaying(): boolean {
  return ambienceWanted;
}

/** Ambience volume 0..1. Separate from the music and the effects. */
export function setAmbienceVolume(volume: number) {
  ambienceVolume = clamp01(volume);
  if (ambienceWanted && ambienceTimer) fadeBedTo(ambienceVolume, 0.1);
}

/**
 * Wait for the first touch, click or key press anywhere, then start the ambience.
 * Returns a function that cancels the wait.
 */
export function startAmbienceOnFirstTouch(): () => void {
  return unlockAudioOnFirstTouch(() => startAmbience());
}

// ---------------------------------------------------------------- cues

/** The engine and the cue chain, if audio is unlocked. */
function cueEngine(): { e: Engine; x: Extras; at: number } | null {
  const e = live();
  if (!e) return null;
  return { e, x: extrasFor(e), at: e.ctx.currentTime + 0.01 };
}

/** Round start: a soft two-note chime. */
export function playRoundStart() {
  const c = cueEngine();
  if (!c) return;
  const r = CUES.roundStart;
  const dest = cueBus(c.e, c.x);
  r.notes.forEach((note, i) => bell(c.e, dest, c.at + i * r.gap, note, r.gain, r.decay));
}

/** Star pin hit: a tiny rising sparkle. */
export function playStarHit() {
  const c = cueEngine();
  if (!c) return;
  const s = CUES.starHit;
  const dest = cueBus(c.e, c.x, CUES.echo * 1.6);
  s.notes.forEach((note, i) => {
    const wobble = 1 + (Math.random() * 2 - 1) * 0.01;
    bell(c.e, dest, c.at + i * s.gap, note * wobble, s.gain * (1 - i * 0.1), s.decay, [[2, 0.12]]);
  });
}

/** Near miss on the cat or a friend: a tiny surprised kitten mew. */
export function playNearMiss() {
  const c = cueEngine();
  if (!c) return;
  const n = CUES.nearMiss;
  const asked = c.e.ctx.currentTime;
  void extraBuffer(c.e, "mew").then((buffer) => {
    const late = c.e.ctx.currentTime - asked;
    if (late > 0.4) return; // too late to belong to the moment
    if (buffer) {
      playBuffer(c.e, buffer, cueBus(c.e, c.x, 0.1), c.e.ctx.currentTime + 0.01, {
        gain: n.gain,
        speed: pick(n.speed),
        pitch: n.pitch,
      });
      return;
    }
    // Stand-in: a little rising-falling squeak.
    const at = c.e.ctx.currentTime + 0.01;
    const osc = c.e.ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(700, at);
    osc.frequency.exponentialRampToValueAtTime(1150, at + 0.12);
    osc.frequency.exponentialRampToValueAtTime(820, at + 0.32);
    const g = c.e.ctx.createGain();
    g.gain.setValueAtTime(0, at);
    g.gain.linearRampToValueAtTime(0.2, at + 0.04);
    g.gain.exponentialRampToValueAtTime(0.0001, at + 0.36);
    osc.connect(g).connect(cueBus(c.e, c.x, 0.1));
    osc.start(at);
    osc.stop(at + 0.4);
  });
}

/** Full clear: a warm rising bell flourish that settles on a chord. */
export function playFullClear() {
  const c = cueEngine();
  if (!c) return;
  const f = CUES.fullClear;
  const dest = cueBus(c.e, c.x, CUES.echo * 1.4);
  f.notes.forEach((note, i) => bell(c.e, dest, c.at + i * f.gap, note, f.gain, f.decay));
  const chordAt = c.at + f.notes.length * f.gap + 0.05;
  f.chord.forEach((note) => bell(c.e, dest, chordAt, note, f.chordGain, f.chordDecay));
  if (f.bells > 0) {
    void extraBuffer(c.e, "bells").then((b) => {
      if (b) playBuffer(c.e, b, dest, Math.max(c.e.ctx.currentTime, c.at), { gain: f.bells, pitch: 4000 });
    });
  }
}

/** End card win: a short happy music-box jingle. */
export function playWin() {
  const c = cueEngine();
  if (!c) return;
  const w = CUES.win;
  const dest = cueBus(c.e, c.x);
  for (const [note, when] of w.tune) bell(c.e, dest, c.at + when, note, w.gain, w.decay);
  w.chord.forEach((note) => bell(c.e, dest, c.at + w.chordAt, note, w.chordGain, w.chordDecay));
}

/** Tie: a gentle two-note "ding-dong". */
export function playTie() {
  const c = cueEngine();
  if (!c) return;
  const t = CUES.tie;
  const dest = cueBus(c.e, c.x);
  t.notes.forEach((note, i) => bell(c.e, dest, c.at + i * t.gap, note, t.gain, t.decay));
}

/** Button tap: a soft paper tap. */
export function playTap() {
  const c = cueEngine();
  if (!c) return;
  const p = CUES.tap;
  const dest = cueBus(c.e, c.x, 0);
  const src = c.e.ctx.createBufferSource();
  src.buffer = c.e.noise;
  const band = c.e.ctx.createBiquadFilter();
  band.type = "bandpass";
  band.frequency.value = p.pitch * (0.9 + 0.2 * Math.random());
  band.Q.value = 1.2;
  const g = c.e.ctx.createGain();
  g.gain.setValueAtTime(0, c.at);
  g.gain.linearRampToValueAtTime(p.gain, c.at + 0.003);
  g.gain.exponentialRampToValueAtTime(0.0001, c.at + p.length);
  src.connect(band).connect(g).connect(dest);
  src.start(c.at, Math.random() * (c.e.noise.duration - 0.2), p.length + 0.02);

  const osc = c.e.ctx.createOscillator();
  osc.type = "sine";
  osc.frequency.setValueAtTime(p.thump, c.at);
  osc.frequency.exponentialRampToValueAtTime(p.thump * 0.6, c.at + 0.05);
  const tg = c.e.ctx.createGain();
  tg.gain.setValueAtTime(0, c.at);
  tg.gain.linearRampToValueAtTime(p.thumpGain, c.at + 0.003);
  tg.gain.exponentialRampToValueAtTime(0.0001, c.at + 0.06);
  osc.connect(tg).connect(dest);
  osc.start(c.at);
  osc.stop(c.at + 0.08);
}
