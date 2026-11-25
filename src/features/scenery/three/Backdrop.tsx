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

// The match's time of day is one shared value, owned by the snow scene (the game eases it between rounds).
import { getTimeOfDay, useSnow } from "@/features/snow-scene";

import { backdrop, effectPx, effectSrc, propPx, propSettings, propSrc, type TokenMix } from "../content";
import { useReducedMotion } from "./motion";
import { usePaper } from "./treatment";

const DEG = Math.PI / 180;

// Changed every frame (the fade as the view rises), so it lives outside the component, shared by every layer.
const fade = { uOpacity: { value: 1 } };

/** A flat drawing shown exactly as drawn (no light, no tone mapping), fading with the backdrop. */
/**
 * `tile` lays the drawing along the band `repeat` times, side by side (Rachel's panorama is drawn to tile: its
 * right end meets its left), using only `crop` (share of the width that has art, without the empty margin),
 * shifted by `phase` copies.
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
      uPaper: { value: paper }, uHaze: { value: haze }, ...fade,
      // Evening: a dusk tint over the drawing, lit windows kept bright (hills only), and its own fade (sun, moon, stars).
      uDusk: { value: new Color() }, uDuskAmt: { value: 0 },
      uGlow: { value: new Color() }, uGlowAmt: { value: 0 },
      uAlpha: { value: 1 } },
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
      uniform vec3 uDusk;
      uniform float uDuskAmt;
      uniform vec3 uGlow;
      uniform float uGlowAmt;
      uniform float uAlpha;
      varying vec2 vUv;
      void main() {
        // Seen from inside the curve, the drawing runs the other way round (so it is not mirrored).
        float u = ${mirror ? "1.0 - vUv.x" : "vUv.x"};
        ${tile ? `float t = u * uRepeat + uPhase;
        u = mix(uCrop.x, uCrop.y, fract(t));
        // Pick the texture detail from the unbroken coordinate, so the jump back at each joint draws no line.
        vec2 steady = vec2(t * (uCrop.y - uCrop.x), vUv.y);
        vec4 art = textureGrad(uMap, vec2(u, vUv.y), dFdx(steady), dFdy(steady));` : `vec4 art = texture2D(uMap, vec2(u, vUv.y));`}
        if (art.a * uAlpha < 0.02) discard;
        vec3 col = mix(mix(art.rgb, uPaper, uHaze), uDusk, uDuskAmt);
        // Lit windows: the strong yellow of the drawn panes (doors and chimneys are more orange), linear colour.
        float r = max(art.r, 0.001);
        float pane = step(0.55, art.r) * step(0.47, art.g / r) * (1.0 - smoothstep(0.06, 0.1, art.b / r));
        col = mix(col, uGlow, pane * uGlowAmt);
        gl_FragColor = vec4(col, art.a * uOpacity * uAlpha);
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

/** 0 before `from`, 1 after `to`, eased in between. */
function ramp(from: number, to: number, x: number) {
  const k = Math.min(Math.max((x - from) / (to - from), 0), 1);
  return k * k * (3 - 2 * k);
}

/* ---- Time of day (see `backdrop.evening`) ---- */

const tokenCache = new Map<string, Color>();
/** A design token's colour (read from globals.css once). */
function token(name: string) {
  let c = tokenCache.get(name);
  if (!c) {
    c = new Color(getComputedStyle(document.documentElement).getPropertyValue(name).trim() || "#ffffff");
    tokenCache.set(name, c);
  }
  return c;
}
const mixed = (m: TokenMix, out: Color) => out.copy(token(m[0])).lerp(token(m[1]), m[2]);
const tmpA = new Color();
const tmpB = new Color();

type SkyMats = { wall: ShaderMaterial; hills: ShaderMaterial; sky: Record<string, ShaderMaterial>; stars: ShaderMaterial[] };

/** Colour the sky, hills and doodles for this time of day (run only when it changes). */
function paintSky(m: SkyMats, day: number, skyProps: string[], birdProp: string) {
  const ev = backdrop.evening;
  const keys = ev.keys;
  let i = 0;
  while (i < keys.length - 2 && day > keys[i + 1].t) i++;
  const k0 = keys[i];
  const k1 = keys[i + 1];
  const f = Math.min(Math.max((day - k0.t) / (k1.t - k0.t), 0), 1);
  const u = m.wall.uniforms;
  for (const [band, uni] of [["low", u.uLow], ["mid", u.uMid], ["high", u.uHigh]] as const) {
    (uni.value as Color).copy(mixed(k0[band], tmpA)).lerp(mixed(k1[band], tmpB), f);
  }
  // The far hills take on the light like the fog on the far snow, their windows lit; the clouds take the sky's colour.
  const h = m.hills.uniforms;
  const hk = ev.hills;
  let j = 0;
  while (j < hk.length - 2 && day > hk[j + 1].t) j++;
  const g = Math.min(Math.max((day - hk[j].t) / (hk[j + 1].t - hk[j].t), 0), 1);
  (h.uDusk.value as Color).copy(mixed(hk[j].tint, tmpA)).lerp(mixed(hk[j + 1].tint, tmpB), g);
  h.uDuskAmt.value = hk[j].share + (hk[j + 1].share - hk[j].share) * g;
  (h.uGlow.value as Color).copy(token("--butter")).lerp(token("--paper"), 0.25);
  h.uGlowAmt.value = ev.windowGlow * ramp(0.55, 0.9, day);
  for (const id of skyProps) {
    const mat = m.sky[id];
    if (!mat || id === birdProp) continue;
    if (id === "sky-sun") {
      mat.uniforms.uAlpha.value = 1 - ramp(ev.sun.to - 0.12, ev.sun.to, day);
    } else {
      (mat.uniforms.uDusk.value as Color).copy(u.uMid.value as Color);
      mat.uniforms.uDuskAmt.value = ev.cloudTint * Math.min(day * 1.4, 1);
    }
  }
  m.sky[birdProp].uniforms.uAlpha.value = 1 - ramp(ev.birdHome[0], ev.birdHome[1], day);
  m.sky[ev.moon.prop].uniforms.uAlpha.value = ramp(ev.moon.from, ev.moon.from + 0.15, day);
}

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
      lift,
    };
  }, [narrow, reach]);
  const paper = usePaper();
  const snow = useSnow();
  const reduced = useReducedMotion();
  const root = useRef<Group>(null);
  const [cx, , cz] = center;

  const ev = backdrop.evening;
  const skyIds = useMemo(() => [...b.sky.map((s) => s.prop), b.bird.prop, ev.moon.prop], [b, ev.moon.prop]);
  const urls = useMemo(
    () => ({ ...Object.fromEntries(["far-hills", ...skyIds].map((id) => [id, propSrc(id)])), "fx-star": effectSrc("star") }),
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
          uLow: { value: new Color(paper.paper) },
          uMid: { value: new Color(paper.paper) },
          uHigh: { value: new Color(paper.shade) },
          // bands, from, to (heights above the foot), edge wobble
          uBands: { value: [ev.bands, ev.from + b.lift, ev.to + b.lift, ev.wobble] },
          uGrain: { value: ev.grain },
          uFoot: { value: foot },
          ...fade,
        },
        vertexShader: /* glsl */ `
          varying float vHeight;
          varying float vAngle;
          void main() {
            vec4 world = modelMatrix * vec4(position, 1.0);
            vHeight = world.y;
            vAngle = atan(position.x, position.z);
            gl_Position = projectionMatrix * viewMatrix * world;
          }
        `,
        fragmentShader: /* glsl */ `
          uniform vec3 uLow;
          uniform vec3 uMid;
          uniform vec3 uHigh;
          uniform vec4 uBands;
          uniform float uGrain;
          uniform float uFoot;
          uniform float uOpacity;
          varying float vHeight;
          varying float vAngle;
          void main() {
            float grain = fract(sin(dot(floor(gl_FragCoord.xy), vec2(12.9898, 78.233))) * 43758.5453);
            // While the view rises the wall thins out in a fine paper-grain pattern instead of turning see-through.
            if (uOpacity < 1.0 && grain > uOpacity) discard;
            // Flat bands of colour with gently waving, crayon-grainy edges (never a smooth gradient).
            float s = (vHeight - uFoot - uBands.y) / (uBands.z - uBands.y);
            s += uBands.w * (0.6 * sin(vAngle * 9.0 + 1.3) + 0.4 * sin(vAngle * 23.0 + 0.4));
            float k = clamp(floor(clamp(s, 0.0, 1.0) * uBands.x + (grain - 0.5) * uGrain) / uBands.x, 0.0, 1.0);
            vec3 col = k < 0.5 ? mix(uLow, uMid, k * 2.0) : mix(uMid, uHigh, k * 2.0 - 1.0);
            gl_FragColor = vec4(col, 1.0);
            #include <colorspace_fragment>
          }
        `,
      }),
    [paper, b, foot, ev],
  );

  // Far hills band: the panorama repeated along the arc, just inside the wall.
  const hillsTex = textures["far-hills"];
  const px = propPx("far-hills");
  const crop = b.hillsCrop;
  const copyWidth = (px ? (b.hillsHeight * px.w) / px.h : b.hillsHeight * 14) * (crop[1] - crop[0]);
  const hillsRadius = b.radius - 0.05;
  // A whole number of copies (never stretched much), side by side, with a copy's middle straight back.
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
  const moonRef = useRef<Mesh>(null);
  // One material per star, so each can appear at its own time.
  const starMaterials = useMemo(
    () => ev.stars.list.map(() => artPlaneMaterial(textures["fx-star"], new Color(paper.paper), 0)),
    [ev.stars.list, textures, paper],
  );
  const starRefs = useRef<(Mesh | null)[]>([]);
  const starPx = effectPx("star");
  const starAspect = starPx ? starPx.w / starPx.h : 1;

  // The live materials, for colouring the sky when the time of day changes (outside render).
  const mats = useRef<SkyMats | null>(null);
  const lastDay = useRef(-1);
  useEffect(() => {
    mats.current = { wall: wallMaterial, hills: hillsMaterial, sky: skyMaterials, stars: starMaterials };
    lastDay.current = -1;
  }, [wallMaterial, hillsMaterial, skyMaterials, starMaterials]);

  useEffect(
    () => () => {
      wall.dispose();
      wallMaterial.dispose();
      hills.dispose();
      hillsMaterial.dispose();
      plane.dispose();
      for (const m of Object.values(skyMaterials)) m.dispose();
      for (const m of starMaterials) m.dispose();
    },
    [wall, wallMaterial, hills, hillsMaterial, plane, skyMaterials, starMaterials],
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
    const day = getTimeOfDay();
    const live = mats.current;
    if (live && day !== lastDay.current) {
      lastDay.current = day;
      paintSky(live, day, b.sky.map((s) => s.prop), b.bird.prop);
    }
    const sunSet = ramp(ev.sun.from, ev.sun.to, day);
    b.sky.forEach((s, i) => {
      const mesh = skyRefs.current[i];
      if (!mesh) return;
      const drift = s.drift * Math.sin((t / s.period) * Math.PI * 2 + i * 1.7);
      const isSun = s.prop === "sky-sun";
      if (isSun) placeOnWall(mesh, s.angle + (ev.sun.toAngle - s.angle) * sunSet, s.y + (ev.sun.toY + b.lift - s.y) * sunSet);
      else placeOnWall(mesh, s.angle + drift, s.y);
    });
    const moon = moonRef.current;
    if (moon) {
      const rise = ramp(ev.moon.from, ev.moon.to, day);
      moon.visible = rise > 0;
      placeOnWall(moon, ev.moon.angle, ev.moon.fromY + (ev.moon.toY - ev.moon.fromY) * rise + b.lift);
    }
    ev.stars.list.forEach((s, i) => {
      const mesh = starRefs.current[i];
      if (!mesh) return;
      const shown = ramp(s.at, s.at + 0.08, day);
      mesh.visible = shown > 0;
      if (!mesh.visible) return;
      if (live) live.stars[i].uniforms.uAlpha.value = shown;
      const size = ev.stars.size * s.scale * (1 + (reduced ? 0 : ev.stars.twinkle * Math.sin(t * 1.7 + i * 2.3)));
      mesh.scale.set(size * starAspect, size, 1);
      placeOnWall(mesh, s.angle, s.y + b.lift);
    });
    const bird = birdRef.current;
    if (bird) {
      const k = b.bird;
      const loop = k.crossSeconds + k.restSeconds;
      // Crosses slowly from left to right, rests out of sight, then comes again. Still: perched mid-sky.
      const u = reduced ? 0.62 : ((t + 6) % loop) / k.crossSeconds;
      bird.visible = u <= 1 && day < ev.birdHome[1];
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
            // The sun is drawn before the hills, so it sinks behind them at sunset.
            renderOrder={s.prop === "sky-sun" ? -9.5 : -8}
            raycast={() => null}
          />
        );
      })}
      <mesh
        ref={moonRef}
        geometry={plane}
        material={skyMaterials[ev.moon.prop]}
        scale={[sizeOf(ev.moon.prop)[0], sizeOf(ev.moon.prop)[1], 1]}
        renderOrder={-9.5}
        visible={false}
        raycast={() => null}
      />
      {ev.stars.list.map((s, i) => (
        <mesh
          key={`star-${i}`}
          ref={(m) => {
            starRefs.current[i] = m;
          }}
          geometry={plane}
          material={starMaterials[i]}
          renderOrder={-9.5}
          visible={false}
          raycast={() => null}
        />
      ))}
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
