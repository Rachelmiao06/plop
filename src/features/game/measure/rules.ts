/**
 * The rules the measure scores with: the game's points (`GAME.score`), the pins' count (`countThrow`: stars,
 * the friend, full clear), where each set stands and its soft mounds, and the bowling sweet spot's wobble.
 * All read from the features themselves, so the measure follows any tuning.
 */
import { FEEL, FRESH_SNOW, pastSweet, type Ground } from "@/features/bowling";
import type { Formation } from "@/features/pins";
import { softSnowFor } from "@/features/pins/layout";
import { countThrow } from "@/features/pins/scoring";

import { GAME } from "../content";

export function scoreThrow(f: Formation, downs: boolean[]): number {
  const r = countThrow(f, downs);
  return r.down * GAME.score.perCard + (r.fullClear ? GAME.score.fullClearBonus : 0) + r.bonus;
}
export const setShift = (f: Formation) => f.shift ?? 0;
export function setGround(f: Formation): Ground {
  const softAt = softSnowFor(f);
  return softAt ? { packedAt: () => 0, softAt } : FRESH_SNOW;
}
/** How far the aim may sway at this power (degrees either way). */
export const wobbleDegrees = (power: number) => pastSweet(power, FEEL) * FEEL.pull.sweet.wobbleDegrees;
