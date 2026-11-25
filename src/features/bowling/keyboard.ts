/**
 * Keyboard input for whoever is throwing.
 * A / D or ← / →: slide along the line. Hold Space: pull back (grows while held);
 * while pulling, A / D or ← / → turn the aim. Release Space: throw.
 *
 * Uses `event.code` (the physical key, any layout) and never relies on key repeat:
 * the pull and the slide move in `update()`, from which keys are down.
 */
import type { Bowling } from "./simulation";

/** Which physical keys (`event.code`) slide / turn left and right, and pull. */
export type KeyMap = { left: readonly string[]; right: readonly string[]; pull: readonly string[] };

/** One thrower alone: A / D or ← / → and Space. */
export const SOLO_KEYS: KeyMap = { left: ["KeyA", "ArrowLeft"], right: ["KeyD", "ArrowRight"], pull: ["Space"] };

export type KeyboardInput = {
  /** Call once per frame, before `bowling.step`. */
  update(seconds: number): void;
  /** True while the pull is driven by the keyboard. */
  readonly active: boolean;
  dispose(): void;
};

function isTyping(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  if (target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement) return true;
  return target instanceof HTMLInputElement && target.type !== "range" && target.type !== "button";
}

export function createKeyboardInput(
  game: Bowling,
  target: Window | HTMLElement = window,
  keys: KeyMap = SOLO_KEYS,
): KeyboardInput {
  const LEFT = new Set(keys.left);
  const RIGHT = new Set(keys.right);
  const PULLS = new Set(keys.pull);
  const held = new Set<string>();
  let active = false;
  /** Space is down but did not start a pull: wait for it to come up. */
  let dead = false;
  /** Aim angle in degrees, positive = to the right (+x). */
  let aim = 0;
  let pulled = 0;

  const ours = (code: string) => PULLS.has(code) || LEFT.has(code) || RIGHT.has(code);

  const onKeyDown = (event: Event) => {
    const e = event as KeyboardEvent;
    if (!ours(e.code) || e.metaKey || e.ctrlKey || e.altKey || isTyping(e.target)) return;
    e.preventDefault(); // Space and arrows would scroll the page or press a focused button
    if (e.repeat) return;
    held.add(e.code);
    if (!PULLS.has(e.code) || active || dead) return;
    if (game.press()) {
      active = true;
      aim = 0;
      pulled = 0;
    } else {
      dead = true;
    }
  };

  const onKeyUp = (event: Event) => {
    const e = event as KeyboardEvent;
    if (!held.delete(e.code)) return;
    e.preventDefault();
    if (!PULLS.has(e.code)) return;
    // Two pull keys (Space or W): the pull ends when the last one comes up.
    if ([...held].some((c) => PULLS.has(c))) return;
    if (active) game.release();
    active = false;
    dead = false;
  };

  /** Lost focus: keyups will never arrive, so drop everything without throwing. */
  const onBlur = () => {
    if (active) game.cancel("interrupted");
    held.clear();
    active = false;
    dead = false;
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
      const feel = game.feel;
      const left = [...held].some((c) => LEFT.has(c));
      const right = [...held].some((c) => RIGHT.has(c));
      const sideways = (right ? 1 : 0) - (left ? 1 : 0);

      if (active && game.thrower.phase !== "pulling") active = false; // ended elsewhere

      if (!active) {
        if (sideways !== 0 && game.isReady) game.slideBy(sideways * feel.thrower.slideSpeed * seconds);
        return;
      }

      const most = feel.pull.maxAimDegrees;
      aim = Math.min(most, Math.max(-most, aim + sideways * feel.keyboard.aimSpeed * seconds));
      const limit = feel.pull.max + feel.pull.rubberBand * feel.keyboard.pushPastFull;
      pulled = Math.min(limit, pulled + feel.keyboard.pullSpeed * seconds);
      // The pull goes the opposite way to the aim: back toward the camera and to the other side.
      const angle = (-aim * Math.PI) / 180;
      const foot = game.thrower.foot;
      game.setTarget({ x: foot.x + Math.sin(angle) * pulled, z: foot.z + Math.cos(angle) * pulled });
    },
    get active() {
      return active;
    },
    dispose() {
      target.removeEventListener("keydown", onKeyDown);
      target.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
      document.removeEventListener("visibilitychange", onVisibility);
    },
  };
}
