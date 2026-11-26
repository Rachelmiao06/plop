/**
 * The "deal with it" jingle for #1's sunglasses: an original little riff, synthesized here (no recording, not based
 * on any song): three punchy low "dun"s while the glasses fall, a "dun-dun" as they land, and a bright "ting" on the
 * glint, about 1.5 s in all. Plays only when sound effects are on (`src/lib/audio.ts` switch) and the page has had a
 * tap or key press (browsers allow sound only after one); otherwise it stays quiet.
 */
import { getAudioSettings } from "@/lib/audio";
import { CHAMP } from "./content";

let ctx: AudioContext | null = null;

function context(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const activated = (navigator as Navigator & { userActivation?: { hasBeenActive: boolean } }).userActivation;
  if (activated && !activated.hasBeenActive) return null;
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  ctx ??= new Ctor();
  if (ctx.state !== "running") void ctx.resume();
  return ctx;
}

/** One low, punchy note: a square wave through a closing low-pass, with a little thump under it. */
function dun(c: AudioContext, out: AudioNode, at: number, freq: number, length: number) {
  const osc = c.createOscillator();
  osc.type = "square";
  osc.frequency.setValueAtTime(freq, at);
  const lp = c.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.setValueAtTime(1400, at);
  lp.frequency.exponentialRampToValueAtTime(260, at + length);
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, at);
  g.gain.exponentialRampToValueAtTime(0.55, at + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, at + length);
  osc.connect(lp).connect(g).connect(out);
  osc.start(at);
  osc.stop(at + length + 0.02);

  const kick = c.createOscillator();
  kick.type = "sine";
  kick.frequency.setValueAtTime(150, at);
  kick.frequency.exponentialRampToValueAtTime(48, at + 0.12);
  const kg = c.createGain();
  kg.gain.setValueAtTime(0.7, at);
  kg.gain.exponentialRampToValueAtTime(0.0001, at + 0.14);
  kick.connect(kg).connect(out);
  kick.start(at);
  kick.stop(at + 0.16);
}

/** A bright bell-like "ting": two sine partials with a fast fade. */
function ting(c: AudioContext, out: AudioNode, at: number) {
  for (const [freq, level] of [
    [1567.98, 0.32],
    [3135.96, 0.12],
  ] as const) {
    const osc = c.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, at);
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, at);
    g.gain.exponentialRampToValueAtTime(level, at + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, at + 0.45);
    osc.connect(g).connect(out);
    osc.start(at);
    osc.stop(at + 0.5);
  }
}

/** Play the jingle in step with the drop (`CHAMP.drop`), starting now. */
export function playChampJingle() {
  if (!getAudioSettings().effects) return;
  const c = context();
  if (!c) return;
  const t = c.currentTime + 0.02;
  const out = c.createGain();
  out.gain.value = CHAMP.jingle.volume;
  out.connect(c.destination);
  const { delay, fall, glintAt } = CHAMP.drop;
  const land = delay + fall;
  // "dun dun dun" while the glasses fall, then "dun-dun" as they land (G2, G2, G2, B♭2, C3), then the ting.
  [0, 0.19, 0.38].forEach((d) => dun(c, out, t + delay + d * (fall / 0.62) * 0.9, 98, 0.15));
  dun(c, out, t + land, 116.54, 0.12);
  dun(c, out, t + land + 0.14, 130.81, 0.3);
  ting(c, out, t + glintAt);
}
