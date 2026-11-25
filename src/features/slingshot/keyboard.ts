/**
 * Keyboard input: left player W A S D, right player arrow keys.
 * Holding a direction pulls that way, farther the longer it is held; changing keys
 * steers smoothly; letting go of all of a player's keys throws.
 *
 * - Uses `event.code` (the physical key), so it works on any keyboard layout.
 * - Never relies on key repeat: repeats are ignored and the pull grows in `update()`.
 * - Each player needs at most two keys at once (a diagonal). WASD and the arrows sit far
 *   apart on the key matrix, so four keys at once work on Mac keyboards; very cheap
 *   keyboards may drop a third key on one side ("ghosting"), which only blocks diagonals.
 */
import type { PlayerId, Slingshot } from "./simulation";
import { PLAYER_IDS } from "./simulation";
import { type Vec2, ease } from "./vec";

/** Key → player and pull direction. Up the screen is toward the back of the scene (-z). */
export const KEYS: Record<string, { player: PlayerId; direction: Vec2 }> = {
  KeyW: { player: "left", direction: { x: 0, z: -1 } },
  KeyA: { player: "left", direction: { x: -1, z: 0 } },
  KeyS: { player: "left", direction: { x: 0, z: 1 } },
  KeyD: { player: "left", direction: { x: 1, z: 0 } },
  ArrowUp: { player: "right", direction: { x: 0, z: -1 } },
  ArrowLeft: { player: "right", direction: { x: -1, z: 0 } },
  ArrowDown: { player: "right", direction: { x: 0, z: 1 } },
  ArrowRight: { player: "right", direction: { x: 1, z: 0 } },
};

type PadState = {
  held: Set<string>;
  /** This keyboard owns the player's current pull. */
  active: boolean;
  /** Keys are down but did not start a pull (or the pull was ended by a hit): wait for all keys up. */
  dead: boolean;
  /** Current aim angle (radians), null until a direction is known. */
  angle: number | null;
  pulled: number;
  /** Aim is frozen until this time, so lifting two keys a moment apart does not swing the shot. */
  frozenUntil: number;
};

export type KeyboardInput = {
  /** Call once per frame, before `sim.step`. */
  update(seconds: number): void;
  /** True while this player's pull is driven by the keyboard. */
  isActive(player: PlayerId): boolean;
  dispose(): void;
};

function isTyping(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  if (target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement) return true;
  return target instanceof HTMLInputElement && target.type !== "range" && target.type !== "button";
}

export function createKeyboardInput(
  sim: Slingshot,
  target: Window | HTMLElement = window,
): KeyboardInput {
  const pads: Record<PlayerId, PadState> = {
    left: { held: new Set(), active: false, dead: false, angle: null, pulled: 0, frozenUntil: 0 },
    right: { held: new Set(), active: false, dead: false, angle: null, pulled: 0, frozenUntil: 0 },
  };
  let clock = 0;

  const wanted = (pad: PadState): Vec2 | null => {
    let x = 0;
    let z = 0;
    for (const code of pad.held) {
      x += KEYS[code].direction.x;
      z += KEYS[code].direction.z;
    }
    return x === 0 && z === 0 ? null : { x, z };
  };

  const onKeyDown = (event: Event) => {
    const e = event as KeyboardEvent;
    const key = KEYS[e.code];
    if (!key || e.metaKey || e.ctrlKey || e.altKey || isTyping(e.target)) return;
    e.preventDefault(); // arrows would scroll the page; a focused slider would move
    if (e.repeat) return;
    const pad = pads[key.player];
    pad.held.add(e.code);
    if (pad.active || pad.dead) return;
    if (sim.press(key.player)) {
      pad.active = true;
      pad.pulled = 0;
      const w = wanted(pad);
      pad.angle = w ? Math.atan2(w.z, w.x) : null;
      pad.frozenUntil = 0;
    } else {
      pad.dead = true;
    }
  };

  const onKeyUp = (event: Event) => {
    const e = event as KeyboardEvent;
    const key = KEYS[e.code];
    if (!key) return;
    const pad = pads[key.player];
    if (!pad.held.delete(e.code)) return;
    e.preventDefault();
    if (pad.held.size > 0) {
      pad.frozenUntil = clock + sim.feel.keyboard.letGoWindow;
      return;
    }
    if (pad.active) sim.release(key.player);
    pad.active = false;
    pad.dead = false;
  };

  /** Lost focus: keyups will never arrive, so drop everything without throwing. */
  const onBlur = () => {
    for (const id of PLAYER_IDS) {
      const pad = pads[id];
      if (pad.active) sim.cancel(id, "interrupted");
      pad.held.clear();
      pad.active = false;
      pad.dead = false;
    }
  };
  const onVisibility = () => {
    if (document.visibilityState === "hidden") onBlur();
  };

  target.addEventListener("keydown", onKeyDown);
  target.addEventListener("keyup", onKeyUp);
  window.addEventListener("blur", onBlur);
  document.addEventListener("visibilitychange", onVisibility);

  return {
    update(seconds) {
      clock += seconds;
      const feel = sim.feel;
      for (const id of PLAYER_IDS) {
        const pad = pads[id];
        if (!pad.active) continue;
        const player = sim.players[id];
        if (player.phase !== "pulling") {
          // The pull ended without us (a hit knocked them over): wait for all keys up.
          pad.active = false;
          pad.dead = pad.held.size > 0;
          continue;
        }
        const w = wanted(pad);
        if (w) {
          const goal = Math.atan2(w.z, w.x);
          if (pad.angle === null) pad.angle = goal;
          else if (clock >= pad.frozenUntil) {
            let delta = goal - pad.angle;
            delta = Math.atan2(Math.sin(delta), Math.cos(delta)); // shortest way round
            pad.angle += delta * ease(feel.keyboard.steerRate, seconds);
          }
          pad.pulled = Math.min(feel.pull.max, pad.pulled + feel.keyboard.pullSpeed * seconds);
        }
        const a = pad.angle ?? 0;
        const pulled = pad.angle === null ? 0 : pad.pulled;
        sim.setTarget(id, {
          x: player.home.x + Math.cos(a) * pulled,
          z: player.home.z + Math.sin(a) * pulled,
        });
      }
    },
    isActive: (player) => pads[player].active,
    dispose() {
      target.removeEventListener("keydown", onKeyDown);
      target.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
      document.removeEventListener("visibilitychange", onVisibility);
    },
  };
}
