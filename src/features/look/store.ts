/**
 * Which finishing layers are on. One tiny store so the `/dev/look` page can switch them while the real
 * game runs; the home page simply uses the defaults from `content.ts`.
 */
import { LOOK, type LookSettings } from "./content";

let state: LookSettings = { grain: LOOK.grain.on, edge: LOOK.edge.on };
const listeners = new Set<() => void>();

export const lookStore = {
  get: () => state,
  set(next: Partial<LookSettings>) {
    state = { ...state, ...next };
    listeners.forEach((l) => l());
  },
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};
