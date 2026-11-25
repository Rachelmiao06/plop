// What other features may import from the snow scene.
export { SnowScene } from "./SnowScene";
export { useSnow, useSnowLayout, useSnowPoint } from "./snowContext";
export { claimSnowPointer, type SnowViewSettings } from "./pointers";
export { SnowCameraView, useSnowCameraView } from "./cameraView";
export {
  kickSnowCamera,
  resumeSnowCamera,
  setSnowCameraShot,
  snowCameraTaken,
  type SnowCameraKick,
  type SnowCameraShot,
} from "./cameraShot";
export { freshSnowfall, freshSnowfallAt, snowTileCount } from "./freshSnow";
export type { FreshSnowfallOptions, KickUpOptions, PressOptions, SnowApi } from "./snowField";
export type { SnowLayout, Spot } from "./layout";
export { snowShadow } from "./content";
