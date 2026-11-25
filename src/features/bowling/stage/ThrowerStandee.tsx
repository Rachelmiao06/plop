"use client";

/**
 * The thrower as Rachel's paper snowman: the scenery feature's thick standee look (traced silhouette
 * extruded into card, the art exactly as drawn on the front, paper sides shaded toward --snow-shadow,
 * a faint --ink edge), with hand-drawn motion on top: idle wobble and breath, a shuffle when it slides,
 * lean back and crouch while pulling, a strain shiver at full charge, a stretchy hop on release and a
 * happy bounce after landing. Every number is in `LOOK.thrower` (content.ts).
 *
 * Built from scenery's geometry and shader functions, the same way the pins feature's `PinCard` is:
 * scenery's `ThickStandee` also sinks into a fake mound and owns its own sway, so the look is rebuilt
 * here without those parts. Scenery could export a `StandeeBody` (geometry + materials only) for both.
 *
 * Driven by the stage each frame through the ref (`update`), right after the rules step, so the
 * snowman and the ball never drift a frame apart.
 */
import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef } from "react";
import { useTexture } from "@react-three/drei";
import { type Camera, type Group, type Raycaster, SRGBColorSpace, type Texture, Vector3 } from "three";

import { propSettings, propSrc, propWidth, type PropId } from "@/features/scenery";
import { standee3d } from "@/features/scenery/content";
import { artMaterial, toonMaterial } from "@/features/scenery/three/materials";
import { artGeometry, bodyGeometry } from "@/features/scenery/three/standeeGeometry";

import { FEEL, LOOK, type ThrowerLook } from "../content";
import type { Bowling } from "../simulation";
import { motionShare } from "./motion";

const DEG = Math.PI / 180;
const drawingLight = new Vector3(...standee3d.shading.from).normalize();

export type PaperColors = { paper: string; shade: string; ink: string };

export type ThrowerHandle = {
  /** Move and animate for this frame. Call after `game.step`. */
  update: (game: Bowling, ground: number, camera: Camera, time: number, dt: number) => void;
  /** True if the ray hits the snowman that is showing. */
  hits: (raycaster: Raycaster) => boolean;
};

/** Which drawing a thrower name shows: "two" is the red-hat snowman, anything else the bucket snowman. */
export const throwerLookOf = (id: string): ThrowerLook => (id === "two" ? "two" : "one");

const LOOKS: ThrowerLook[] = ["one", "two"];

/** One snowman's card: body, sides and art. Origin at the bottom centre, facing +z. */
function Card({ id, art, paper }: { id: PropId; art: Texture; paper: PaperColors }) {
  const settings = propSettings(id)!;
  const height = settings.height;
  const width = propWidth(id);
  const depth = height * standee3d.thicknessShare;
  const body = useMemo(() => bodyGeometry(id, width, height, depth), [id, width, height, depth]);
  const card = useMemo(() => artGeometry(width, height), [width, height]);
  const materials = useMemo(() => {
    const band = standee3d.shading.band;
    return {
      cap: toonMaterial({ base: paper.paper, shade: paper.shade, light: drawingLight, band, card: standee3d.card }),
      side: toonMaterial({
        base: paper.paper,
        shade: paper.shade,
        light: drawingLight,
        band,
        edge: { color: paper.ink, halfDepth: depth / 2 },
        card: standee3d.card,
      }),
      // Pillow shading is off in the approved look, so the art stands in for the unused normal map.
      art: artMaterial({
        map: art,
        normalMap: art,
        pillow: 0,
        shade: paper.shade,
        light: drawingLight,
        band: standee3d.pillow.band,
        doubleSided: !body,
      }),
    };
  }, [paper, depth, art, body]);

  useEffect(
    () => () => {
      body?.dispose();
      card.dispose();
      materials.cap.dispose();
      materials.side.dispose();
      materials.art.dispose();
    },
    [body, card, materials],
  );

  return (
    <>
      {body && <mesh geometry={body} material={[materials.cap, materials.side]} castShadow />}
      <mesh geometry={card} material={materials.art} position-z={body ? depth / 2 + 0.002 : 0} castShadow={!body} />
    </>
  );
}

/** A value that follows its goal on a soft spring (overshoots a little, then settles). */
class Spring {
  value = 0;
  speed = 0;
  step(goal: number, dt: number, stiffness: number, damping: number) {
    this.speed += ((goal - this.value) * stiffness - this.speed * damping) * dt;
    this.value += this.speed * dt;
  }
}

export const ThrowerStandee = forwardRef<ThrowerHandle, { paper: PaperColors }>(function ThrowerStandee({ paper }, ref) {
  const ids = LOOK.thrower.art;
  const textures = useTexture({ one: propSrc(ids.one), two: propSrc(ids.two) }) as Record<ThrowerLook, Texture>;
  useMemo(() => {
    for (const t of Object.values(textures)) {
      t.colorSpace = SRGBColorSpace;
      t.anisotropy = 4;
      t.needsUpdate = true;
    }
  }, [textures]);

  const root = useRef<Group>(null); // position on the line, hop
  const turn = useRef<Group>(null); // half-turn toward the camera
  const rollPivot = useRef<Group>(null); // rolling on its round bottom (pivot at that bottom's centre)
  const rollInner = useRef<Group>(null); // puts the feet back under the pivot
  const body = useRef<Group>(null); // lean, rock, squash (pivot at the feet)
  const cards = useRef<Record<ThrowerLook, Group | null>>({ one: null, two: null });

  const state = useRef({
    yaw: new Spring(),
    tiltX: new Spring(),
    tiltZ: new Spring(),
    squash: new Spring(),
    roll: new Spring(),
    lunge: new Spring(),
    pullX: 0,
    lastX: 0,
    step: 0,
    moving: 0,
    phase: "ready" as string,
    look: "" as ThrowerLook | "",
    wasAirborne: false,
    charged: false,
    landedAt: -100,
  });

  useImperativeHandle(
    ref,
    () => ({
      update(game, ground, camera, time, dt) {
        const g = root.current;
        const y = turn.current;
        const b = body.current;
        const rp = rollPivot.current;
        const ri = rollInner.current;
        if (!g || !y || !b || !rp || !ri) return;
        const s = state.current;
        const L = LOOK.thrower;
        const t = game.thrower;
        const feel = game.feel;

        // Which snowman shows; a little pop when it changes.
        const look = throwerLookOf(t.id);
        if (look !== s.look) {
          if (s.look) s.squash.speed -= L.swapSquash * 12;
          s.look = look;
          for (const l of LOOKS) {
            const c = cards.current[l];
            if (c) c.visible = l === look;
          }
        }

        // Shuffle: step phase advances with distance slid, so the feet keep pace with the slide.
        const dx = t.x - s.lastX;
        s.lastX = t.x;
        const speed = dt > 0 ? dx / dt : 0;
        const movingGoal = Math.min(1, Math.abs(speed) / L.shuffle.fullSpeed);
        s.moving += (movingGoal - s.moving) * Math.min(1, dt * 10);
        s.step += Math.abs(dx) * L.shuffle.stepsPerUnit * Math.PI;
        const shuffleLift = Math.abs(Math.sin(s.step)) * L.shuffle.lift * s.moving;

        // Press: a tiny squash, like a soft toy under a finger. Full charge: a quick puff-up.
        if (t.phase === "pulling" && s.phase !== "pulling") s.squash.speed += L.pressSquash * 14;
        const charged = !!t.ball?.charged;
        if (charged && !s.charged) s.squash.speed -= L.chargePop * 14;
        s.charged = charged;

        // Release: stretch up and snap forward. Landing: squash, then the happy bounce.
        if (t.phase === "thrown" && s.phase !== "thrown") {
          // A stronger pull gives a bigger, snappier lunge (never less than `minShare` of it).
          const power = game.balls[game.balls.length - 1]?.plan.power ?? 1;
          const p = L.lunge.minShare + (1 - L.lunge.minShare) * power;
          // The kick that peaks at about `distance` on a spring this stiff (14 was tuned at stiffness 60).
          const kick = 14 * Math.sqrt(L.lunge.stiffness / 60) * p;
          s.squash.speed -= L.hop.stretch * 14 * p;
          s.tiltX.speed -= 3 * p;
          // Lunge after the ball, lean into it, a little roll of follow-through toward where it went.
          s.lunge.speed -= L.lunge.distance * kick;
          s.tiltX.speed -= L.lunge.lean * kick;
          const side = Math.abs(s.pullX) > 0.05 ? Math.sign(s.pullX) : Math.sin(time * 7.1) >= 0 ? 1 : -1;
          s.roll.speed += side * L.lunge.roll * kick;
        }
        if (t.phase === "pulling") s.pullX = t.pull.x;
        s.phase = t.phase;
        const airborne = t.hopHeight > 0.002;
        if (s.wasAirborne && !airborne) {
          s.squash.speed += L.hop.landSquash * 14;
          s.landedAt = time;
        }
        s.wasAirborne = airborne;
        const since = time - s.landedAt;
        let bounce = 0;
        if (since >= 0 && since < L.bounce.time) {
          const u = since / L.bounce.time;
          bounce = Math.abs(Math.sin(Math.PI * L.bounce.count * u)) * L.bounce.height * (1 - u) * (1 - u);
        }

        // Goals for lean (x), side tilt (z) and squash.
        const ball = t.ball;
        const tremble = ball ? ball.tremble : 0;
        const idle = t.phase === "ready" ? 1 - s.moving : 0;
        const tiltXGoal = t.lean * feel.thrower.leanAtFull;
        let tiltZGoal =
          Math.sin(time * feel.thrower.wobbleSpeed * Math.PI * 2) * feel.thrower.wobble * idle +
          Math.sin(s.step) * L.shuffle.rock * s.moving -
          Math.sign(speed) * L.shuffle.leanInto * s.moving;
        if (t.phase === "pulling") tiltZGoal -= t.pull.x * L.leanToBall;
        const squashGoal =
          t.lean * L.crouch + Math.sin(time * L.breatheSpeed * Math.PI * 2) * L.breathe * idle;

        const { stiffness, damping } = L.spring;
        s.tiltX.step(tiltXGoal, dt, stiffness, damping);
        s.tiltZ.step(tiltZGoal, dt, stiffness, damping);
        s.squash.step(squashGoal, dt, stiffness * 1.4, damping);

        // Rolling on its round bottom: sliding rolls it like a ball (into the slide), a little idle roll
        // by itself, and it wobbles back upright on its own spring.
        const R = L.roll;
        let rollGoal = Math.max(-R.max, Math.min(R.max, -speed * R.perSpeed));
        rollGoal += Math.sin(time * L.idleRoll.speed * Math.PI * 2) * L.idleRoll.angle * idle;
        s.roll.step(rollGoal, dt, R.stiffness, R.damping);
        s.lunge.step(0, dt, L.lunge.stiffness, L.lunge.damping);

        // Strain at full charge: a quick shiver on top, not on the spring.
        const w = time * L.strain.speed * Math.PI * 2;
        const shiverZ = Math.sin(w) * L.strain.angle * tremble;
        const shiverX = Math.sin(w * 1.31 + 1.7) * L.strain.shift * tremble;

        // Half-turn toward the camera, like the village cut-outs.
        const yawGoal = Math.max(
          -L.turn.capDegrees * DEG,
          Math.min(L.turn.capDegrees * DEG, Math.atan2(camera.position.x - t.x, camera.position.z - t.foot.z) * L.turn.fraction),
        );
        // ...and turns a little toward where it slides.
        const slideTurn = Math.max(-1, Math.min(1, speed / L.shuffle.fullSpeed)) * L.roll.turnDegrees * DEG;
        s.yaw.step(yawGoal + slideTurn, dt, L.turn.stiffness, L.turn.damping);

        // "Reduce motion": hops, bounces and squash keep only a share; leaning still shows the pull.
        const m = motionShare();
        const sink = propSettings(LOOK.thrower.art[look])!.sink;
        g.position.set(t.x + shiverX, ground - sink + (t.hopHeight + bounce + shuffleLift) * m, t.foot.z + s.lunge.value * m);
        // Roll about the centre of the round bottom; rolling (not sliding) also shifts it along the ground.
        const height = propSettings(LOOK.thrower.art[look])!.height;
        const pivot = R.radius * height;
        const roll = Math.max(-R.max * 1.6, Math.min(R.max * 1.6, s.roll.value)) * m;
        rp.position.set(-roll * pivot * 0.5, pivot, 0);
        rp.rotation.z = roll;
        ri.position.y = -pivot;
        y.rotation.y = s.yaw.value;
        b.rotation.set(s.tiltX.value, 0, s.tiltZ.value + shiverZ);
        const q = Math.max(-0.3, Math.min(0.3, s.squash.value)) * m;
        b.scale.set(1 + q * 0.5, 1 - q, 1 + q * 0.5);
      },
      hits(raycaster) {
        const c = cards.current[state.current.look || "one"];
        return !!c && raycaster.intersectObject(c, true).length > 0;
      },
    }),
    [],
  );

  return (
    <group ref={root} position={[0, 0, FEEL.lane.lineZ]}>
      <group ref={turn}>
        <group ref={rollPivot}>
          <group ref={rollInner}>
            <group ref={body}>
              {LOOKS.map((l) => (
                <group
                  key={l}
                  ref={(g) => {
                    cards.current[l] = g;
                  }}
                  visible={l === "one"}
                >
                  <Card id={ids[l] as PropId} art={textures[l]} paper={paper} />
                </group>
              ))}
            </group>
          </group>
        </group>
      </group>
    </group>
  );
});
