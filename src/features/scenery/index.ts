// What other features and pages may import from the scenery feature.
export { Village } from "./three/Village";
export {
  drawnGameLane,
  throwingView,
  villageBlockers,
  villageLayout,
  villageProblems,
  type Blocker,
  type GameLane,
  type VillageProp,
} from "./village";
export { props, propSrc, propWidth, propSettings, effects, effectSrc, type PropId } from "./content";
// The match's time of day (afternoon 0 → sunset 0.5 → evening 1). Shared with the snow and light; see timeOfDay.ts.
export { getTimeOfDay, setTimeOfDay, subscribeTimeOfDay } from "./timeOfDay";
export { SkyPanel } from "./SkyPanel";
