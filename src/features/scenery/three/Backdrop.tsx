"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { useTexture } from "@react-three/drei";
import {
  BackSide,
  Color,
  CylinderGeometry,
  DoubleSide,
  type Group,
  type Mesh,
  PlaneGeometry,
  RepeatWrapping,
  ShaderMaterial,
  SRGBColorSpace,
  type Texture,
  Vector3,
} from "three";

import { useSnow } from "@/features/snow-scene";

import { backdrop, propPx, propSettings, propSrc } from "../content";
import { useReducedMotion } from "./motion";
import { usePaper } from "./treatment";

const DEG = Math.PI / 180;

// Changed every frame (the fade as the view rises), so it lives outside the component, shared by every layer.
const fade = { uOpacity: { value: 1 } };

/** A flat drawing shown exactly as drawn (no light, no tone mapping), fading with the backdrop. */
/**
 * `tile` lays the drawing along the band `repeat` times: every other copy mirrored so each joint meets its own
 * mirror image (the panorama's two ends do not match), using only `crop` (share of the width that has art,
 * without the empty margin), shifted by `phase` copies.
 */
type Tile = { repeat: number; crop: [number, number]; phase: number };

function artPlaneMaterial(map: Texture, paper: Color, haze: number, tile: Tile | null = null, mirror = false) {
  return new ShaderMaterial({
    side: mirror ? BackSide : DoubleSide,
    transparent: true,
    depthWrite: false,
    toneMapped: false,
    uniforms: {
      uMap: { value: map },
      uRepeat: { value: tile?.repeat ?? 1 },
      uCrop: { value: tile?.crop ?? [0, 1] },
      uPhase: { value: tile?.phase ?? 0 },
      uPaper: { value: paper }, uHaze: { value: haze }, ...fade },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform sampler2D uMap;
      uniform float uRepeat;
      uniform vec2 uCrop;
      uniform float uPhase;
      uniform vec3 uPaper;
      uniform float uHaze;
      uniform float uOpacity;
      varying vec2 vUv;
      void main() {
        // Seen from inside the curve, the drawing runs the other way round (so it is not mirrored).
        float u = ${mirror ? "1.0 - vUv.x" : "vUv.x"};
        ${tile ? `float t = u * uRepeat + uPhase;
        float f = fract(t);
        if (mod(floor(t), 2.0) >= 1.0) f = 1.0 - f;
        u = mix(uCrop.x, uCrop.y, f);` : ""}
        vec4 art = texture2D(uMap, vec2(u, vUv.y));
        if (art.a < 0.02) discard;
        gl_FragColor = vec4(mix(art.rgb, uPaper, uHaze), art.a * uOpacity);
        #include <colorspace_fragment>
      }
    `,
  });
}

type Props = {
  /** The point the backdrop curves round (the throwing view's look-at point). */
  center: [number, number, number];
  /** Extra distance to the wall (scene units), so it stays as far behind the pins on a longer lane. */
  reach?: number;
};

/**
 * The back of the paper theatre: a curved paper sky standing behind the village, Rachel's far hills along its
 * foot, and a few flat sky doodles drifting slowly. Fades out as the camera rises (see `backdrop` in content.ts).
 * Nothing here is lit: the sky is a blend of two tokens, the art is drawn exactly as drawn.
 */
const look = new Vector3();

export function Backdrop({ center, reach = 0 }: Props) {
  // On a phone held upright the backdrop comes a little closer and the hills grow (see `backdrop.portrait`).
  const aspect = useThree((s) => s.size.width / Math.max(s.size.height, 1));
  const narrow = Math.min(Math.max((1 - aspect) / (1 - backdrop.portrait.aspect), 0), 1);
  const b = useMemo(() => {
    const p = backdrop.portrait;
    const grow = 1 + (p.hillsGrow - 1) * narrow;
    const lift = backdrop.hillsHeight * (grow - 1);
    return {
      ...backdrop,
      radius: backdrop.radius + (p.radius - backdrop.radius) * narrow + reach,
      hillsHeight: backdrop.hillsHeight * grow,
      tintFrom: backdrop.tintFrom + lift,
      sky: backdrop.sky.map((s) => ({ ...s, y: s.y + lift })),
      bird: { ...backdrop.bird, y: backdrop.bird.y + lift },
    };
  }, [narrow, reach]);
  const paper = usePaper();
  const snow = useSnow();
  const reduced = useReducedMotion();
  const root = useRef<Group>(null);
  const [cx, , cz] = center;

  const skyIds = useMemo(() => [...b.sky.map((s) => s.prop), b.bird.prop], [b]);
  const urls = useMemo(
    () => Object.fromEntries(["far-hills", ...skyIds].map((id) => [id, propSrc(id)])),
    [skyIds],
  );
  const textures = useTexture(urls, (loaded) => {
    for (const tex of Object.values(loaded as Record<string, Texture>)) {
      tex.colorSpace = SRGBColorSpace;
      tex.anisotropy = 8;
      tex.wrapS = RepeatWrapping;
      tex.needsUpdate = true;
    }
  }) as Record<string, Texture>;

  // The foot of the wall: the average snow height along the arc, so the hills sit in the snow, not on a drift.
  const arc = b.arc * DEG;
  const foot = useMemo(() => {
    let sum = 0;
    const n = 24;
    for (let i = 0; i < n; i++) {
      const a = Math.PI - arc / 2 + (arc * i) / (n - 1);
      sum += snow.heightAt(cx + b.radius * Math.sin(a), cz + b.radius * Math.cos(a));
    }
    return sum / n;
  }, [snow, arc, cx, cz, b.radius]);

  // Paper sky wall (seen from inside the curve).
  const below = 1; // reaches this far under the snow so no gap ever shows at its foot
  const wall = useMemo(
    () => new CylinderGeometry(b.radius, b.radius, b.height + below, 72, 1, true, Math.PI - arc / 2, arc),
    [b.radius, b.height, arc],
  );
  const wallMaterial = useMemo(
    () =>
      new ShaderMaterial({
        side: BackSide,
        // Opaque, drawn before the snow, so the snow hidden behind it is never painted (cheaper than drawing over it).
        transparent: false,
        depthWrite: true,
        toneMapped: false,
        uniforms: {
          uPaper: { value: new Color(paper.paper) },
          uTint: { value: new Color(paper.shade) },
          uBand: { value: [b.tintFrom, b.tintTo, b.tintShare] },
          uFoot: { value: foot },
          ...fade,
        },
        vertexShader: /* glsl */ `
          varying float vHeight;
          void main() {
            vec4 world = modelMatrix * vec4(position, 1.0);
            vHeight = world.y;
            gl_Position = projectionMatrix * viewMatrix * world;
          }
        `,
        fragmentShader: /* glsl */ `
          uniform vec3 uPaper;
          uniform vec3 uTint;
          uniform vec3 uBand;
          uniform float uFoot;
          uniform float uOpacity;
          varying float vHeight;
          void main() {
            // While the view rises the wall thins out in a fine paper-grain pattern instead of turning see-through.
            if (uOpacity < 1.0 && fract(sin(dot(floor(gl_FragCoord.xy), vec2(12.9898, 78.233))) * 43758.5453) > uOpacity) discard;
            float t = smoothstep(uBand.x, uBand.y, vHeight - uFoot) * uBand.z;
            gl_FragColor = vec4(mix(uPaper, uTint, t), 1.0);
            #include <colorspace_fragment>
          }
        `,
      }),
    [paper, b, foot],
  );

  // Far hills band: the panorama repeated along the arc, just inside the wall.
  const hillsTex = textures["far-hills"];
  const px = propPx("far-hills");
  const crop = b.hillsCrop;
  const copyWidth = (px ? (b.hillsHeight * px.w) / px.h : b.hillsHeight * 14) * (crop[1] - crop[0]);
  const hillsRadius = b.radius - 0.05;
  // A whole number of copies (never stretched much), mirrored at every joint, with a copy's middle straight back.
  const repeats = Math.max(1, Math.round((hillsRadius * arc) / copyWidth));
  const phase = 0.5 - ((repeats * 0.5) % 1);
  const hills = useMemo(
    () => new CylinderGeometry(hillsRadius, hillsRadius, b.hillsHeight, 96, 1, true, Math.PI - arc / 2, arc),
    [hillsRadius, b.hillsHeight, arc],
  );
  const hillsMaterial = useMemo(
    () => artPlaneMaterial(hillsTex, new Color(paper.shade), b.haze, { repeat: repeats, crop, phase }, true),
    [hillsTex, repeats, crop, phase, paper, b.haze],
  );

  // Sky doodles: small flat planes on the wall, facing the middle.
  const plane = useMemo(() => new PlaneGeometry(1, 1), []);
  const skyMaterials = useMemo(
    () =>
      Object.fromEntries(
        skyIds.map((id) => [
          id,
          artPlaneMaterial(textures[id], new Color(paper.paper), 0),
        ]),
      ),
    [skyIds, textures, paper],
  );
  const skyRefs = useRef<(Mesh | null)[]>([]);
  const birdRef = useRef<Mesh>(null);

  useEffect(
    () => () => {
      wall.dispose();
      wallMaterial.dispose();
      hills.dispose();
      hillsMaterial.dispose();
      plane.dispose();
      for (const m of Object.values(skyMaterials)) m.dispose();
    },
    [wall, wallMaterial, hills, hillsMaterial, plane, skyMaterials],
  );

  const skyRadius = b.radius - 0.12;
  /** Put a doodle on the wall at this angle (0 = straight back) and height above the foot. */
  const placeOnWall = (mesh: Mesh, angleDeg: number, y: number) => {
    const a = Math.PI + angleDeg * DEG;
    mesh.position.set(cx + skyRadius * Math.sin(a), foot + y, cz + skyRadius * Math.cos(a));
    mesh.rotation.set(0, a + Math.PI, 0);
  };
  const sizeOf = (id: string) => {
    const h = propSettings(id)?.height ?? 0.4;
    const p = propPx(id);
    return [p ? (h * p.w) / p.h : h, h] as const;
  };

  useFrame(({ camera, clock }) => {
    const g = root.current;
    if (!g) return;
    // Fade with how steeply the camera looks down at the snow (from the throwing view that is its height
    // seen from the middle of the scene; a camera riding low behind the ball looks nearly level and keeps it).
    camera.getWorldDirection(look);
    const pitch = Math.asin(Math.min(Math.max(-look.y, -1), 1)) / DEG;
    const opacity = 1 - Math.min(Math.max((pitch - b.fadeFrom) / (b.fadeTo - b.fadeFrom), 0), 1);
    g.visible = opacity > 0.001;
    fade.uOpacity.value = opacity;
    if (!g.visible) return;

    const t = reduced ? 0 : clock.elapsedTime;
    b.sky.forEach((s, i) => {
      const mesh = skyRefs.current[i];
      if (!mesh) return;
      const drift = s.drift * Math.sin((t / s.period) * Math.PI * 2 + i * 1.7);
      placeOnWall(mesh, s.angle + drift, s.y);
    });
    const bird = birdRef.current;
    if (bird) {
      const k = b.bird;
      const loop = k.crossSeconds + k.restSeconds;
      // Crosses slowly from left to right, rests out of sight, then comes again. Still: perched mid-sky.
      const u = reduced ? 0.62 : ((t + 6) % loop) / k.crossSeconds;
      bird.visible = u <= 1;
      if (u <= 1) {
        const angle = k.fromAngle + (k.toAngle - k.fromAngle) * u;
        placeOnWall(bird, angle, k.y + k.bob * Math.sin(t * 2.4));
      }
    }
  });

  return (
    <group ref={root}>
      <mesh
        geometry={wall}
        material={wallMaterial}
        position={[cx, foot + (b.height - below) / 2, cz]}
        renderOrder={-10}
        raycast={() => null}
      />
      <mesh
        geometry={hills}
        material={hillsMaterial}
        position={[cx, foot - b.hillsSink + b.hillsHeight / 2, cz]}
        renderOrder={-9}
        raycast={() => null}
      />
      {b.sky.map((s, i) => {
        const [w, h] = sizeOf(s.prop);
        return (
          <mesh
            key={`${s.prop}-${i}`}
            ref={(m) => {
              skyRefs.current[i] = m;
            }}
            geometry={plane}
            material={skyMaterials[s.prop]}
            scale={[w, h, 1]}
            renderOrder={-8}
            raycast={() => null}
          />
        );
      })}
      <mesh
        ref={birdRef}
        geometry={plane}
        material={skyMaterials[b.bird.prop]}
        scale={[sizeOf(b.bird.prop)[0], sizeOf(b.bird.prop)[1], 1]}
        renderOrder={-8}
        raycast={() => null}
      />
    </group>
  );
}
