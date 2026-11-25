import { Color, Vector2 } from "three";
import { content } from "./content";

// Values the ground and the backdrop both read, so the snow fades into
// exactly the colour that is behind it.
export const sharedUniforms = {
  uResolution: { value: new Vector2(1, 1) },
  // Screen pixels covered by one scene unit, one unit away from the camera.
  uPixelsPerUnit: { value: 1 },
  uFogTop: { value: new Color(content.colors.fogTop) },
  uFogBottom: { value: new Color(content.colors.fogBottom) },
};
