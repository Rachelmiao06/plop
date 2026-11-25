"use client";

/**
 * The invite card's background: the real snow scene and the cosy village in the evening (fairy lights, the
 * glowing lamp, gentle snowfall), with a very slow camera drift so it breathes behind the card.
 * Everything comes from the snow-scene and scenery features; nothing of theirs is changed.
 */
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect } from "react";

import { FEEL } from "@/features/bowling";
import { Village } from "@/features/scenery";
import {
  setSnowCameraShot,
  setTimeOfDay,
  SnowCameraView,
  SnowScene,
} from "@/features/snow-scene";

import { INVITE } from "./content";

const reduced = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** The cosy-corner view, or on an upright phone the same corner from further back (two framings, never a blend). */
function View() {
  const aspect = useThree((s) => s.size.width / Math.max(1, s.size.height));
  const v = aspect < INVITE.phoneMaxAspect ? INVITE.phoneView : INVITE.view;
  return <SnowCameraView lookAt={[...v.lookAt]} pathAt={v.pathAt} distance={v.distance} turn={v.turn} />;
}

/** Sways the look-at point and breathes the camera in and out, slowly (a shot on top of the default view). */
function Drift() {
  useEffect(() => () => setSnowCameraShot(null), []);
  useFrame(({ clock }) => {
    if (reduced()) return;
    const d = INVITE.drift;
    const t = clock.getElapsedTime();
    setSnowCameraShot({
      lookShift: [Math.sin((t / d.swaySeconds) * Math.PI * 2) * d.sway, 0, 0],
      closer: d.breathe * (0.5 + 0.5 * Math.sin((t / d.breatheSeconds) * Math.PI * 2)),
      rate: d.rate,
      interruptible: true,
    });
  });
  return null;
}

export function InviteBackdrop() {
  // Always the cosy evening here (the game sets its own time of day when it starts).
  useEffect(() => {
    setTimeOfDay(1);
  }, []);

  return (
    <div className="absolute inset-0">
      <SnowScene>
        <View />
        <Village lane={FEEL.lane} />
        <Drift />
      </SnowScene>
    </div>
  );
}
