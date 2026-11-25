// Public surface of the bowling feature. Import from "@/features/bowling" only.
export { FEEL, LOOK, TEXT, copyFeel, type Feel, type ThrowerLook } from "./content";
export { FRESH_SNOW, ROLL_STEP, movingSpeed, planRoll, snapShare, stepRoll, type Ground, type RollPlan } from "./roll";
export {
  Bowling,
  type BowlEvent,
  type BowlListener,
  type PulledBall,
  type RollingBall,
  type Thrower,
  type ThrowerPhase,
} from "./simulation";
export { createKeyboardInput, type KeyboardInput } from "./keyboard";
export { createPointerInput, type PointerInput, type PointerInputOptions } from "./pointer";
export { connectFeedback, type Feedback } from "./feedback";
export type { Vec2 } from "./vec";
export { BowlingStage, type BowlingStageProps } from "./stage/BowlingStage";
export { throwerLookOf } from "./stage/ThrowerStandee";
export { BowlingHint } from "./stage/BowlingHint";
