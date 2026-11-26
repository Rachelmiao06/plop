/** Which of Rachel's two snowmen a nickname gets: the same name always gets the same one. Plain TypeScript. */
import type { SnowmanLook } from "@/features/hud/content";
import { nameKey } from "./rules";

/** A small steady number from a nickname. */
export function nameHash(name: string) {
  return Array.from(nameKey(name)).reduce((h, c) => (h * 31 + c.codePointAt(0)!) >>> 0, 7);
}

/** The same nickname always gets the same snowman (a team gets the bucket one, player one's). */
export const lookFor = (name: string, team = false): SnowmanLook => (team || nameHash(name) % 2 === 0 ? "bucket" : "redHat");
