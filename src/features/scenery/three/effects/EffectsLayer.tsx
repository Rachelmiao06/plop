"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import {
  AdditiveBlending,
  CanvasTexture,
  Color,
  ConeGeometry,
  DirectionalLight,
  DoubleSide,
  IcosahedronGeometry,
  type InstancedMesh,
  MeshStandardMaterial,
  NormalBlending,
  Object3D,
  type PointLight,
  ShaderMaterial,
  SphereGeometry,
  type Sprite,
  SpriteMaterial,
  SRGBColorSpace,
  Vector3,
} from "three";

import { getTimeOfDay, useSnow } from "@/features/snow-scene";

import { backdrop, standee3d, village, type PropId } from "../../content";
import { throwingView, villageLayout, type GameLane, type VillageProp } from "../../village";
import { useReducedMotion } from "../motion";
import { effects, effectTags } from "./effects";

/*
  A little real-world effect on top of the paper village (Rachel, 2026-11-25): warm light, chimney smoke, clear ice.
  Everything is made in code; the drawings are untouched and stay unlit. What goes where comes from each prop's
  effect tags (`effectTags`), so the effects follow the layout. Numbers: `effects.ts`. Colours: tokens, read from
  globals.css at run time.
*/

/** The token colours these effects use, read once from globals.css (browser only). */
type Tokens = { paper: string; shade: string; ink: string; butter: string; sky: string; blush: string };
let tokenCache: Tokens | null = null;
function tokens(): Tokens {
  if (tokenCache) return tokenCache;
  const css = getComputedStyle(document.documentElement);
  const t = (name: string) => css.getPropertyValue(name).trim();
  tokenCache = { paper: t("--paper"), shade: t("--snow-shadow"), ink: t("--ink"), butter: t("--butter"), sky: t("--sky-blue"), blush: t("--blush") };
  return tokenCache;
}

/** Small seeded random numbers, so every load looks the same. */
function seeded(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A point on a drawing (shares of width and height) in the prop's own space, `forward` units in front of the art. */
const onDrawing = (at: readonly [number, number], width: number, height: number, forward = 0): [number, number, number] => [
  (at[0] - 0.5) * width,
  at[1] * height,
  (height * standee3d.thicknessShare) / 2 + 0.004 + forward,
];

/** How far into the evening it is for the lights: 0 until `evening.from` of the time of day, 1 from `evening.to`. */
function eveningShare(): number {
  const e = effects.lights.evening;
  const u = Math.min(Math.max((getTimeOfDay() - e.from) / (e.to - e.from), 0), 1);
  return u * u * (3 - 2 * u);
}

/* ------------------------------------------------------------------ */
/* Warm glow                                                            */
/* ------------------------------------------------------------------ */

let glowTex: CanvasTexture | null = null;
/**
 * A crayon glow (white; tinted per use): bright in the middle, falling off in a few soft bands with paper grain and a
 * slightly wobbly edge, never a smooth airbrush gradient.
 */
function glowTexture(): CanvasTexture {
  if (glowTex) return glowTex;
  const l = effects.lights;
  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const g = canvas.getContext("2d")!;
  const img = g.createImageData(size, size);
  const rand = seeded(5);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = (x + 0.5) / size - 0.5;
      const dy = (y + 0.5) / size - 0.5;
      const a = Math.atan2(dy, dx);
      const r = Math.hypot(dx, dy) * 2 * (1 + 0.05 * Math.sin(a * 5) + 0.03 * Math.sin(a * 11 + 1.3));
      const lit = Math.max(0, 1 - r);
      const banded = Math.floor(lit * l.bands + 0.65) / l.bands;
      const soft = lit + (banded - lit) * l.banding;
      const grain = 1 - l.grain / 2 + l.grain * rand();
      const alpha = Math.min(1, soft ** 1.25 * grain);
      const i = (y * size + x) * 4;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = 255;
      img.data[i + 3] = Math.round(alpha * 255);
    }
  }
  g.putImageData(img, 0, 0);
  glowTex = new CanvasTexture(canvas);
  glowTex.colorSpace = SRGBColorSpace;
  return glowTex;
}

/** The warm light colour: `--butter`, softened toward `--paper`. */
function warmColor(): Color {
  const t = tokens();
  return new Color(t.butter).lerp(new Color(t.paper), effects.lights.warmSoftening);
}

/**
 * The warm lights on one prop (its `emitsLight` tag), drawn inside the prop's own turning group so they turn and
 * sway with the drawing: halos per point in the prop's style, and a real point light on the snow if the prop is in
 * `effects.lights.pointLights`. Halos breathe a tiny bit; with reduced motion they hold still.
 */
export function WarmLights({ id, width, height }: { id: PropId; width: number; height: number }) {
  const points = effectTags(id).emitsLight;
  const l = effects.lights;
  const style = l.lamps.includes(id) ? l.styles.lamp : (points?.length ?? 0) >= 3 ? l.styles.bulbs : l.styles.window;
  const lightSpec = l.pointLights[id];
  const reduced = useReducedMotion();
  const color = useMemo(() => warmColor(), []);
  // One entry per halo: which point, front or behind, and its own material (opacity changes per frame).
  const halos = useMemo(
    () =>
      (points ?? []).flatMap((at, i) =>
        (["front", "behind"] as const).flatMap((place) => {
          const h = style[place];
          if (!h) return [];
          return [
            {
              key: `${i}-${place}`,
              at,
              h,
              i,
              place,
              material: new SpriteMaterial({
                map: glowTexture(),
                color,
                blending: place === "front" ? AdditiveBlending : NormalBlending,
                transparent: true,
                depthWrite: false,
                toneMapped: false,
                opacity: h.strength,
              }),
            },
          ];
        }),
      ),
    [points, style, color],
  );
  useEffect(() => () => halos.forEach((h) => h.material.dispose()), [halos]);
  const light = useRef<PointLight>(null);
  const seed = useMemo(() => (id.length * 7.31) % 6.28, [id]);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const evening = eveningShare();
    halos.forEach((halo) => {
      const { h, i } = halo;
      // Two slow waves and a faster small one: a candle-like breath, never a strobe.
      const f = reduced
        ? 0
        : Math.sin(t * h.speed * 6.28 + seed + i * 1.9) * 0.5 +
          Math.sin(t * h.speed * 2.7 + seed * 2 + i) * 0.35 +
          Math.sin(t * h.speed * 13.1 + i * 4.1) * 0.15;
      const boost = 1 + l.evening.haloBoost * evening;
      const strength = halo.place === "front" ? Math.min(1, h.strength * boost) : h.strength * boost;
      halo.material.opacity = strength * (1 + h.flicker * f);
    });
    if (light.current && lightSpec) {
      const breath = reduced ? 0 : style.front.flicker * 0.5 * Math.sin(t * style.front.speed * 6.28 + seed);
      light.current.intensity = lightSpec.intensity * (1 + l.evening.lightBoost * evening) * (1 + breath);
    }
  });

  if (!points || points.length === 0) return null;
  const mid = points.reduce((s, p) => [s[0] + p[0] / points.length, s[1] + p[1] / points.length], [0, 0]) as [number, number];
  const depth = height * standee3d.thicknessShare;
  return (
    <>
      {halos.map(({ key, at, h, place, material }) => {
        const [x, y, z] = onDrawing(at, width, height, 0.03);
        return (
          <sprite
            key={key}
            material={material}
            // Behind: just behind the cut-out's back, so the drawing stays crisp in front of the glow.
            position={[x, y, place === "front" ? z : -depth / 2 - 0.04]}
            scale={[h.size, h.size, 1]}
            renderOrder={place === "front" ? 5 : -1}
            raycast={() => null}
          />
        );
      })}
      {lightSpec && (
        <pointLight
          ref={light}
          color={color}
          intensity={lightSpec.intensity}
          distance={lightSpec.distance}
          decay={2}
          position={onDrawing(mid, width, height, l.lightForward)}
        />
      )}
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Chimney smoke                                                        */
/* ------------------------------------------------------------------ */

/**
 * A soft smoke puff: a few overlapping round blobs, `--paper` tinted toward `--snow-shadow`, shaded underneath (and,
 * if `effects.smoke.outline` > 0, a faint `--ink` rim). `variant` changes the blob layout.
 */
function puffTexture(variant: number): CanvasTexture {
  const s = effects.smoke;
  const t = tokens();
  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const g = canvas.getContext("2d")!;
  const rand = seeded(17 + variant * 31);
  const blobs = Array.from({ length: 5 }, (_, i) => {
    const a = (i / 5) * Math.PI * 2 + rand();
    const d = i === 0 ? 0 : 0.13 + rand() * 0.08;
    return { x: 0.5 + Math.cos(a) * d, y: 0.52 + Math.sin(a) * d * 0.8, r: 0.17 + rand() * 0.07 };
  });
  // The shape: soft-edged blobs, drawn as alpha.
  const shape = document.createElement("canvas");
  shape.width = shape.height = size;
  const sg = shape.getContext("2d")!;
  for (const b of blobs) {
    const grad = sg.createRadialGradient(b.x * size, b.y * size, 0, b.x * size, b.y * size, b.r * size);
    grad.addColorStop(0, "rgba(255,255,255,1)");
    grad.addColorStop(0.55, "rgba(255,255,255,0.85)");
    grad.addColorStop(1, "rgba(255,255,255,0)");
    sg.fillStyle = grad;
    sg.fillRect(0, 0, size, size);
  }
  // The colour: tinted paper on top, shading further toward the pale-blue shadow token underneath.
  const col = g.createLinearGradient(0, size * 0.25, 0, size * 0.85);
  const paper = new Color(t.paper);
  col.addColorStop(0, paper.clone().lerp(new Color(t.shade), s.tint).getStyle());
  col.addColorStop(1, paper.clone().lerp(new Color(t.shade), Math.min(1, s.tint + s.shade)).getStyle());
  g.fillStyle = col;
  g.fillRect(0, 0, size, size);
  if (s.outline > 0) {
    g.globalAlpha = s.outline;
    g.strokeStyle = t.ink;
    g.lineWidth = 2.5;
    for (const b of blobs) {
      g.beginPath();
      g.arc(b.x * size, b.y * size, b.r * size * 0.78, 0, Math.PI * 2);
      g.stroke();
    }
    g.globalAlpha = 1;
  }
  g.globalCompositeOperation = "destination-in";
  g.drawImage(shape, 0, 0);
  const tex = new CanvasTexture(canvas);
  tex.colorSpace = SRGBColorSpace;
  return tex;
}

/**
 * Real smoke from every placed prop with a `chimneyAt` tag: a few soft puffs, each rising, drifting sideways with a
 * gentle wind, growing and fading out, one after another. With reduced motion it rises `reducedSlowdown` times slower.
 */
export function ChimneySmoke({ placed }: { placed: (VillageProp & { baseY: number })[] }) {
  const s = effects.smoke;
  const reduced = useReducedMotion();
  const chimneys = useMemo(
    () =>
      placed.flatMap((p) => {
        const at = effectTags(p.id).chimneyAt;
        if (!at) return [];
        const along = (at[0] - 0.5) * p.width * (p.flip ? -1 : 1);
        return [{ key: p.key, x: p.x + along, y: p.baseY + p.height * at[1], z: p.z - 0.02, scale: p.scale }];
      }),
    [placed],
  );
  const textures = useMemo(() => [0, 1, 2].map((v) => puffTexture(v)), []);
  const puffs = useMemo(
    () =>
      chimneys.flatMap((c, ci) =>
        Array.from({ length: s.puffsPerChimney }, (_, i) => ({
          ...c,
          offset: i / s.puffsPerChimney + ci * 0.37,
          spin: (i * 2.1 + ci) % 6.28,
          material: new SpriteMaterial({
            map: textures[(i + ci) % textures.length],
            transparent: true,
            depthWrite: false,
            toneMapped: false,
            opacity: 0,
          }),
        })),
      ),
    [chimneys, textures, s.puffsPerChimney],
  );
  useEffect(() => () => puffs.forEach((p) => p.material.dispose()), [puffs]);
  useEffect(() => () => textures.forEach((t) => t.dispose()), [textures]);
  const refs = useRef<(Sprite | null)[]>([]);
  // The light on the smoke: warm at sunset, moonlit blue in the evening (multiplies the puff's own colour).
  const tints = useMemo(() => {
    const tk = tokens();
    return { warm: new Color(tk.butter).lerp(new Color(tk.blush), 0.5), cool: new Color(tk.sky), now: new Color() };
  }, []);

  useFrame(({ clock }) => {
    const life = s.life * (reduced ? s.reducedSlowdown : 1);
    const t = clock.elapsedTime;
    const day = getTimeOfDay();
    const sunset = Math.max(0, 1 - Math.abs(day - 0.5) * 2.5);
    const night = Math.min(Math.max((day - 0.55) / 0.4, 0), 1);
    tints.now.setRGB(1, 1, 1).lerp(tints.warm, s.sunsetWarm * sunset).lerp(tints.cool, s.eveningCool * night);
    puffs.forEach((p, i) => {
      const sprite = refs.current[i];
      if (!sprite) return;
      const u = (t / life + p.offset) % 1;
      // Rises quickly at first, then slows as it cools and spreads; the wind takes it more the higher it gets.
      const up = 1 - (1 - u) * (1 - u);
      const wander = Math.sin(t * s.wanderSpeed + p.spin) * s.wander * u;
      sprite.position.set(p.x + s.wind * u * u + wander, p.y + s.rise * up * p.scale, p.z);
      const size = (s.sizeFrom + (s.sizeTo - s.sizeFrom) * Math.sqrt(u)) * p.scale;
      sprite.scale.set(size, size, 1);
      p.material.rotation = p.spin + u * 0.6;
      p.material.color.copy(tints.now);
      // In softly, then a long fade.
      p.material.opacity = s.opacity * Math.min(u / 0.12, 1) * (1 - u) ** 1.6;
    });
  });

  return (
    <>
      {puffs.map((p, i) => (
        <sprite
          key={`${p.key}-${i}`}
          ref={(m) => {
            refs.current[i] = m;
          }}
          material={p.material}
          renderOrder={4}
          raycast={() => null}
        />
      ))}
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Ice                                                                  */
/* ------------------------------------------------------------------ */

/** Shared uniforms for every piece of ice: the sun direction is copied from the scene's sun once it is there. */
const iceSun = { uSun: { value: new Vector3(0.5, 0.4, -0.6).normalize() } };

/**
 * Clear ice, faked cheaply: no screen-space transmission (it would draw the scene twice). The middle is nearly
 * clear and lightly tinted; the tint deepens toward the edges (thicker ice seen side-on), a sky reflection and a
 * bright fresnel rim appear at grazing angles, the sun leaves one sharp glint, and tiny facets flash as the view
 * moves. Not tone mapped, so the highlights stay crisp next to the paper.
 */
let iceMat: ShaderMaterial | null = null;
function iceMaterial(): ShaderMaterial {
  if (iceMat) return iceMat;
  const t = tokens();
  const a = effects.ice;
  iceMat = new ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: DoubleSide,
    toneMapped: false,
    uniforms: {
      ...iceSun,
      uPaper: { value: new Color(t.paper) },
      uShade: { value: new Color(t.shade) },
      uSky: { value: new Color(t.sky) },
      // body, edge, glint sharpness, glint
      uLook: { value: [a.body, a.edge, a.glintSharpness, a.glint] },
      // sparkle share, sparkle brightness
      uSparkle: { value: [a.sparkle, a.sparkleBright] },
    },
    vertexShader: /* glsl */ `
      varying vec3 vWorld;
      varying vec3 vNormal;
      varying vec3 vLocal;
      void main() {
        mat4 model = modelMatrix;
        #ifdef USE_INSTANCING
          model = modelMatrix * instanceMatrix;
        #endif
        vec4 world = model * vec4(position, 1.0);
        vWorld = world.xyz;
        vLocal = position;
        vNormal = normalize(mat3(model) * normal);
        gl_Position = projectionMatrix * viewMatrix * world;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uSun;
      uniform vec3 uPaper;
      uniform vec3 uShade;
      uniform vec3 uSky;
      uniform vec4 uLook;
      uniform vec2 uSparkle;
      varying vec3 vWorld;
      varying vec3 vNormal;
      varying vec3 vLocal;
      float hash(vec3 p) { return fract(sin(dot(p, vec3(12.9898, 78.233, 37.719))) * 43758.5453); }
      void main() {
        vec3 n = normalize(vNormal);
        vec3 v = normalize(cameraPosition - vWorld);
        if (dot(n, v) < 0.0) n = -n;
        float facing = clamp(dot(n, v), 0.0, 1.0);
        float rim = pow(1.0 - facing, 3.0);
        // Thicker toward the edges: a deeper blue tint there, nearly clear in the middle.
        vec3 tint = mix(mix(uShade, uSky, 0.3), mix(uShade, uSky, 0.85), pow(1.0 - facing, 1.5));
        // Fake refraction: the ice bends the bright snow below into its lower half and shows a darker core.
        tint = mix(tint, uPaper, smoothstep(-0.2, -0.9, n.y) * 0.35);
        tint *= 0.92 + 0.08 * facing;
        // Faint streaks frozen inside, like real icicles.
        float streak = 0.5 + 0.5 * sin(vLocal.y * 90.0 + sin(vLocal.x * 40.0) * 2.0);
        tint = mix(tint, uPaper, streak * 0.12);
        // The sky seen in the surface at grazing angles: pale blue above, paper white near the horizon.
        vec3 r = reflect(-v, n);
        vec3 sky = mix(uPaper, uShade, clamp(r.y * 1.5, 0.0, 1.0));
        vec3 color = mix(tint, sky, rim * 0.7) + uPaper * rim * uLook.y * 0.5;
        // The sun: one small, sharp glint.
        float glint = pow(max(dot(r, normalize(uSun)), 0.0), uLook.z) * uLook.w;
        // Tiny facets that flash as the view moves.
        vec3 cell = floor(vWorld * 55.0);
        float on = step(1.0 - uSparkle.x, hash(cell));
        vec3 facet = normalize(vec3(hash(cell + 1.3), hash(cell + 2.7), hash(cell + 4.1)) - 0.5);
        float flash = on * pow(max(dot(reflect(-v, facet), normalize(uSun)), 0.0), 24.0) * uSparkle.y;
        color += uPaper * (glint + flash);
        float alpha = clamp(uLook.x + rim * uLook.y + glint + flash, 0.0, 1.0);
        gl_FragColor = vec4(color, alpha);
        #include <colorspace_fragment>
      }
    `,
  });
  return iceMat;
}

/** Keeps the ice's sun direction on the scene's sun (the snow scene owns the sun; it is not exported). */
function useIceSun() {
  const scene = useThree((s) => s.scene);
  const sun = useRef<DirectionalLight | null>(null);
  useFrame(() => {
    if (!sun.current) {
      scene.traverse((o) => {
        if (!sun.current && o instanceof DirectionalLight) sun.current = o;
      });
    }
    // The sun moves with the time of day (and becomes the moon), so the glint follows it.
    if (sun.current) iceSun.uSun.value.copy(sun.current.position).normalize();
  });
}

/** One icicle shape, pointing down from y = 0: a slightly uneven, faceted cone. */
let icicleGeo: ConeGeometry | null = null;
function icicleGeometry(): ConeGeometry {
  if (icicleGeo) return icicleGeo;
  const g = new ConeGeometry(0.5, 1, 6, 4, true);
  g.rotateX(Math.PI); // tip down
  g.translate(0, -0.5, 0); // top at y = 0
  const pos = g.attributes.position;
  const rand = seeded(9);
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i);
    // A little wobble along the length, like water refrozen in rings.
    const wob = 1 + (rand() - 0.5) * 0.25 + Math.sin(y * 19) * 0.06;
    pos.setX(i, pos.getX(i) * wob);
    pos.setZ(i, pos.getZ(i) * wob);
  }
  g.computeVertexNormals();
  icicleGeo = g;
  return g;
}

/**
 * Icicles hanging along one prop's `icicleEdge` tags, drawn inside the prop's turning group so they stay on the
 * drawing. One per `icicleSpacing` of edge, the longest in the middle. One instanced mesh per prop.
 */
export function Icicles({ id, width, height }: { id: PropId; width: number; height: number }) {
  const edges = effectTags(id).icicleEdge;
  const a = effects.ice;
  const counts = useMemo(
    () => (edges ?? []).map(([x0, y0, x1, y1]) => Math.max(1, Math.round(Math.hypot((x1 - x0) * width, (y1 - y0) * height) / a.icicleSpacing))),
    [edges, width, height, a.icicleSpacing],
  );
  const count = counts.reduce((n, c) => n + c, 0);
  const mesh = useRef<InstancedMesh>(null);
  useIceSun();
  useEffect(() => {
    const m = mesh.current;
    if (!m || !edges || count === 0) return;
    const rand = seeded(id.length * 13 + count);
    const o = new Object3D();
    let k = 0;
    edges.forEach(([x0, y0, x1, y1], e) => {
      const n = counts[e];
      for (let i = 0; i < n; i++) {
        // Evenly along the edge with a little jitter; the longest ones in the middle, like real eaves.
        const s = n === 1 ? 0.5 : (i + 0.15 + rand() * 0.7) / n;
        const [x, y, z] = onDrawing([x0 + (x1 - x0) * s, y0 + (y1 - y0) * s], width, height, 0.008);
        const middle = 1 - Math.abs(s - 0.5) * 1.2;
        const len = a.icicleLength[0] + (a.icicleLength[1] - a.icicleLength[0]) * (0.35 * rand() + 0.65 * middle * rand());
        const w = a.icicleWidth * (0.75 + rand() * 0.5) * Math.min(1, len / 0.12 + 0.3);
        o.position.set(x, y + 0.006, z);
        o.rotation.set(0, rand() * Math.PI, (rand() - 0.5) * 0.12);
        o.scale.set(w, len, w);
        o.updateMatrix();
        m.setMatrixAt(k++, o.matrix);
      }
    });
    m.instanceMatrix.needsUpdate = true;
  }, [edges, counts, count, id, width, height, a]);
  if (count === 0) return null;
  return (
    <instancedMesh
      key={count}
      ref={mesh}
      args={[icicleGeometry(), iceMaterial(), count]}
      frustumCulled={false}
      renderOrder={3}
      raycast={() => null}
    />
  );
}

/** Where each ice chunk lies: next to every placed copy of its `near` prop, in scene units. */
function chunkSpots(lane: GameLane) {
  const placed = villageLayout(lane);
  return effects.ice.chunks.flatMap((c, i) =>
    placed.filter((p) => p.id === c.near).map((p, k) => ({ ...c, x: p.x + c.dx, z: p.z + c.dz, seed: 101 + i * 7 + k * 3 })),
  );
}

/**
 * The small heaps of real snow the ice chunks sit in. Render outside any Suspense (Village does), so they are made
 * before anything samples the snow (the pins' physics ground).
 */
export function IceBeds({ lane }: { lane: GameLane }) {
  const snow = useSnow();
  useMemo(() => {
    for (const c of chunkSpots(lane)) snow.heapSnow(c.x, c.z, c.size * 0.9, c.size * 0.8, c.size * 0.22);
  }, [snow, lane]);
  return null;
}

/** A chunk of ice: a faceted, slightly squashed lump (flat-shaded so each facet catches light on its own). */
function chunkGeometry(seed: number): IcosahedronGeometry {
  const g = new IcosahedronGeometry(0.5, 1).toNonIndexed() as IcosahedronGeometry;
  const pos = g.attributes.position;
  const rand = seeded(seed);
  // Move shared corners together (same position = same push), so the lump stays closed.
  const pushes = new Map<string, number>();
  for (let i = 0; i < pos.count; i++) {
    const key = `${pos.getX(i).toFixed(3)},${pos.getY(i).toFixed(3)},${pos.getZ(i).toFixed(3)}`;
    if (!pushes.has(key)) pushes.set(key, 0.72 + rand() * 0.5);
    const p = pushes.get(key)!;
    pos.setXYZ(i, pos.getX(i) * p * 1.15, pos.getY(i) * p * 0.75, pos.getZ(i) * p);
  }
  g.computeVertexNormals();
  return g;
}

const capGeometry = new SphereGeometry(0.5, 10, 5, 0, Math.PI * 2, 0, Math.PI / 2);

/** Chunks of clear ice lying in the snow beside their `near` props, a little sunk, with a dab of snow on top. */
export function IceChunks({ lane }: { lane: GameLane }) {
  const snow = useSnow();
  useIceSun();
  const a = effects.ice;
  const chunks = useMemo(
    () =>
      chunkSpots(lane).map((c) => ({
        ...c,
        y: snow.heightAt(c.x, c.z) - c.size * a.chunkSink * 0.5,
        geometry: chunkGeometry(c.seed),
      })),
    [a, lane, snow],
  );
  const capMaterial = useMemo(() => {
    const t = tokens();
    // Lit like the snow around it, a touch toward the shadow token so it never glares.
    return new MeshStandardMaterial({ color: new Color(t.paper).lerp(new Color(t.shade), 0.35), roughness: 0.95 });
  }, []);
  useEffect(
    () => () => {
      chunks.forEach((c) => c.geometry.dispose());
      capMaterial.dispose();
    },
    [chunks, capMaterial],
  );
  return (
    <>
      {chunks.map((c, i) => (
        <group key={i} position={[c.x, c.y, c.z]} rotation-y={(c.turn * Math.PI) / 180}>
          <mesh geometry={c.geometry} material={iceMaterial()} scale={c.size} renderOrder={3} raycast={() => null} />
          <mesh
            geometry={capGeometry}
            material={capMaterial}
            position={[c.size * 0.08, c.size * 0.27, -c.size * 0.05]}
            scale={[c.size * a.snowCap, c.size * a.snowCap * 0.32, c.size * a.snowCap * 0.8]}
            raycast={() => null}
          />
        </group>
      ))}
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Snow banked at the backdrop's foot (#51)                             */
/* ------------------------------------------------------------------ */

/**
 * Real snow banked up against the foot of the paper hills: a row of soft, uneven heaps of real snow just in front of
 * them, along the middle of the arc, so from a low view the hills sink into lit snow instead of meeting it in a hard
 * straight line. Follows the backdrop's own placement (`backdrop` in content.ts and `Backdrop.tsx`: round the throwing
 * view's look-at point, moved back on a longer lane, closer on a phone held upright). Render it outside any Suspense
 * (Village does), so the heaps exist before anything samples the snow. Heaps never stack, so a resize is harmless.
 */
export function FootBank({ lane }: { lane: GameLane }) {
  const snow = useSnow();
  const aspect = useThree((s) => s.size.width / Math.max(s.size.height, 1));
  const narrow = Math.min(Math.max((1 - aspect) / (1 - backdrop.portrait.aspect), 0), 1);
  useMemo(() => {
    const f = effects.footBank;
    const [cx, , cz] = throwingView(lane).lookAt;
    const reach = Math.max(0, (lane.lineZ - lane.pinSpot.z - backdrop.laneLength) * (1 - village.view.lookAtShare));
    const wall = backdrop.radius + (backdrop.portrait.radius - backdrop.radius) * narrow + reach;
    const arc = ((backdrop.arc * Math.PI) / 180) * f.arcShare;
    const r = wall - 0.05 - f.inset;
    const steps = Math.max(2, Math.round((r * arc) / f.spacing));
    // Uneven on purpose (size, spacing and distance vary, the same on every load), so from high up it reads as
    // drifted snow, not a row of matching lumps.
    const rnd = (i: number, k: number) => {
      const v = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453;
      return v - Math.floor(v);
    };
    for (let i = 0; i <= steps; i++) {
      const a = Math.PI - arc / 2 + (arc * (i + (rnd(i, 1) - 0.5) * f.jitter)) / steps;
      const k = 1 - f.vary / 2 + f.vary * rnd(i, 2);
      const d = r + (rnd(i, 3) - 0.5) * f.jitter * f.radiusZ;
      snow.heapSnow(cx + d * Math.sin(a), cz + d * Math.cos(a), f.radiusX * k, f.radiusZ * (0.8 + 0.4 * rnd(i, 4)), f.height * k);
    }
  }, [snow, lane, narrow]);
  return null;
}
