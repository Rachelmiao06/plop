// Public surface of the slingshot feature. Import from "@/features/slingshot" only.
export { FEEL, copyFeel, type Feel } from "./content";
export { type Arc, arcPoint, computeArc } from "./arc";
export {
  createSlingshot,
  PLAYER_IDS,
  Slingshot,
  type FlyingBall,
  type Phase,
  type PlayerId,
  type PlayerState,
  type PulledBall,
  type SlingEvent,
  type SlingListener,
} from "./simulation";
export { createKeyboardInput, KEYS, type KeyboardInput } from "./keyboard";
export { createPointerInput, type PointerInput, type PointerInputOptions } from "./pointer";
export { connectFeedback, type Feedback } from "./feedback";
export type { Vec2 } from "./vec";
export { FlatSlingshot } from "./flat/FlatSlingshot";
