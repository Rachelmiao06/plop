"use client";

/**
 * The throwing view, framed for the screen's shape. Wide screens use the scenery's `throwingView` as it is.
 * A phone held upright (narrower than `GAME.phoneView.maxAspect`) gets its own framing from
 * `GAME.phoneView`, so the pins and the village sit lower and the empty snow below the thrower shrinks
 * (#46). Only two framings, never a blend, so turning a phone switches once and resizing a window never
 * makes the camera jump on every pixel.
 */
import { useThree } from "@react-three/fiber";

import { FEEL } from "@/features/bowling";
import { throwingView } from "@/features/scenery";
import { SnowCameraView, type SnowViewSettings } from "@/features/snow-scene";

import { GAME } from "./content";

export function phoneThrowingView(): SnowViewSettings {
  const lane = FEEL.lane;
  const base = throwingView(lane);
  const p = GAME.phoneView;
  return {
    ...base,
    lookAt: [
      base.lookAt[0],
      p.lookAtHeight,
      lane.lineZ + (lane.pinSpot.z - lane.lineZ) * p.lookAtShare,
    ],
    pathAt: p.pathAt,
    distance: p.distance,
  };
}

export function ThrowingView() {
  const aspect = useThree((s) => s.size.width / Math.max(1, s.size.height));
  const phone = aspect < GAME.phoneView.maxAspect;
  return <SnowCameraView {...(phone ? phoneThrowingView() : throwingView(FEEL.lane))} />;
}
