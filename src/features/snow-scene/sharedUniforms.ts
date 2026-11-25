import { Color, Vector2, Vector4 } from "three";
import { content } from "./content";

// Values the ground and the backdrop both read, so the snow fades into
// exactly the colour that is behind it.
export const sharedUniforms = {
  uResolution: { value: new Vector2(1, 1) },
  // Screen pixels covered by one scene unit, one unit away from the camera.
  uPixelsPerUnit: { value: 1 },
  // How visible the falling snow is (it thins out when the view flies high).
  uFlakeFade: { value: 1 },
  uFogTop: { value: new Color(content.colors.fogTop) },
  uFogBottom: { value: new Color(content.colors.fogBottom) },
  // Sparkles on the snow: colour, and glint size, share lit, flicker speed, brightness (the time of day changes
  // the colour and brightness).
  uSparkleColor: { value: new Color(content.colors.sparkle) },
  uSparkle: {
    value: new Vector4(
      content.surface.sparkleCell,
      content.surface.sparkleAmount,
      content.surface.sparkleSensitivity,
      content.surface.sparkleStrength,
    ),
  },
};
