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
  Object3D,
  type PointLight,
  ShaderMaterial,
  SphereGeometry,
  type Sprite,
  SpriteMaterial,
  SRGBColorSpace,
  Vector3,
} from "three";

import { useSnow } from "@/features/snow-scene";

import { atmosphere, standee3d, village, type PropId } from "../content";
import { fitPoint, type GameLane, type VillageProp } from "../village";
import { useReducedMotion } from "./motion";

/*
  A little real-world effect on top of the paper village (Rachel, 2026-11-25): warm light from the lamp, the
  lit window and the fairy lights; real smoke from the chimneys; clear ice hanging from the eaves and lying in
  the snow. Everything is made in code; the drawings are untouched and stay unlit. Numbers: `atmosphere` in
  content.ts. Colours: tokens read from globals.css at run time.
*/

/** The token colours these effects use, read once from globals.css (browser only). */
type Tokens = { paper: string; shade: string; ink: string; butter: string; sky: string };
let tokenCache: Tokens | null = null;
function tokens(): Tokens {
  if (tokenCache) return tokenCache;
  const css = getComputedStyle(document.documentElement);
  const t = (name: string) => css.getPropertyValue(name).trim();
  tokenCache = { paper: t("--paper"), shade: t("--snow-shadow"), ink: t("--ink"), butter: t("--butter"), sky: t("--sky-blue") };
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

/** Where a point on a drawing (shares of width and height) sits in the prop's own space, just in front of the art. */
const onDrawing = (at: [number, number], width: number, height: number, forward = 0): [number, number, number] => [
  (at[0] - 0.5) * width,
  at[1] * height,
  (height * standee3d.thicknessShare) / 2 + 0.004 + forward,
];

/* ------------------------------------------------------------------ */
/* Warm glow                                                            */
/* ------------------------------------------------------------------ */

let glowTex: CanvasTexture | null = null;
/** A soft round glow, bright in the middle and falling off smoothly to nothing at the edge (white; tinted per use). */
function glowTexture(): CanvasTexture {
  if (glowTex) return glowTex;
  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const g = canvas.getContext("2d")!;
  const grad = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  // A falloff close to 1 / (1 + r^2), cut smoothly to zero at the rim.
  for (let i = 0; i <= 10; i++) {
    const r = i / 10;
    const a = (1 / (1 + 18 * r * r)) * (1 - r * r) ** 2;
    grad.addColorStop(r, `rgba(255,255,255,${a.toFixed(3)})`);
  }
  g.fillStyle = grad;
  g.fillRect(0, 0, size, size);
  glowTex = new CanvasTexture(canvas);
  glowTex.colorSpace = SRGBColorSpace;
  return glowTex;
}

/** The warm light colour: `--butter`, softened toward `--paper`. */
function warmColor(): Color {
  const t = tokens();
  return new Color(t.butter).lerp(new Color(t.paper), atmosphere.warmSoftening);
}

/**
 * The warm lights on one prop (`atmosphere.lights`), drawn inside the prop's own turning group so they turn and
 * sway with the drawing: a halo per bulb and one real point light that warms the lit snow (never the cut-outs,
 * which are unlit paper). The halo flickers a tiny bit; with reduced motion it holds still.
 */
export function WarmLights({ id, width, height }: { id: PropId; width: number; height: number }) {
  const spec = atmosphere.lights.find((l) => l.prop === id);
  const reduced = useReducedMotion();
  const color = useMemo(() => warmColor(), []);
  const materials = useMemo(
    () =>
      (spec?.at ?? []).map(
        () =>
          new SpriteMaterial({
            map: glowTexture(),
            color,
            blending: AdditiveBlending,
            transparent: true,
            depthWrite: false,
            toneMapped: false,
            opacity: spec?.halo.strength ?? 0,
          }),
      ),
    [spec, color],
  );
  useEffect(() => () => materials.forEach((m) => m.dispose()), [materials]);
  const light = useRef<PointLight>(null);
  const seed = useMemo(() => (id.length * 7.31) % 6.28, [id]);

  useFrame(({ clock }) => {
    if (!spec) return;
    const t = clock.elapsedTime;
    materials.forEach((m, i) => {
      // Two slow waves and a faster small one: a candle-like breath, never a strobe.
      const f = reduced
        ? 0
        : Math.sin(t * spec.halo.speed * 6.28 + seed + i * 1.9) * 0.5 +
          Math.sin(t * spec.halo.speed * 2.7 + seed * 2 + i) * 0.35 +
          Math.sin(t * spec.halo.speed * 13.1 + i * 4.1) * 0.15;
      m.opacity = spec.halo.strength * (1 + spec.halo.flicker * f);
    });
    if (light.current && !reduced) {
      light.current.intensity = spec.light.intensity * (1 + spec.halo.flicker * 0.5 * Math.sin(t * spec.halo.speed * 6.28 + seed));
    }
  });

  if (!spec) return null;
  // The point light sits at the middle of the bulbs, a little in front of the drawing.
  const mid = spec.at.reduce((s, p) => [s[0] + p[0] / spec.at.length, s[1] + p[1] / spec.at.length], [0, 0]) as [number, number];
  return (
    <>
      {spec.at.map((at, i) => (
        <sprite
          key={i}
          material={materials[i]}
          position={onDrawing(at, width, height, 0.03)}
          scale={[spec.halo.size, spec.halo.size, 1]}
          renderOrder={5}
          raycast={() => null}
        />
      ))}
      <pointLight
        ref={light}
        color={color}
        intensity={spec.light.intensity}
        distance={spec.light.distance}
        decay={2}
        position={onDrawing(mid, width, height, atmosphere.lightForward)}
      />
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Chimney smoke                                                        */
/* ------------------------------------------------------------------ */

/**
 * A soft smoke puff: a few overlapping round blobs, off-white `--paper` with a faint `--snow-shadow` shade on the
 * lower side (and, if `atmosphere.smoke.outline` > 0, a faint `--ink` rim like a pencil line). `variant` changes
 * the blob layout.
 */
function puffTexture(variant: number): CanvasTexture {
  const s = atmosphere.smoke;
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
  // The colour: paper on top, shading to the pale-blue shadow token underneath.
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
 * Real smoke from each cottage chimney (`village.chimneys`): a few soft puffs, each rising, drifting sideways with
 * a gentle wind, growing and fading out, one after another. With reduced motion it rises `reducedSlowdown` times slower.
 */
export function ChimneySmoke({ placed }: { placed: (VillageProp & { baseY: number })[] }) {
  const s = atmosphere.smoke;
  const reduced = useReducedMotion();
  const chimneys = useMemo(
    () =>
      placed.flatMap((p) => {
        const share = village.chimneys[p.id];
        if (share === undefined) return [];
        const along = (share - 0.5) * p.width * (p.flip ? -1 : 1);
        return [{ key: p.key, x: p.x + along, y: p.baseY + p.height * 0.97, z: p.z - 0.02, scale: p.scale }];
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
  useEffect(
    () => () => {
      puffs.forEach((p) => p.material.dispose());
    },
    [puffs],
  );
  useEffect(() => () => textures.forEach((t) => t.dispose()), [textures]);
  const refs = useRef<(Sprite | null)[]>([]);

  useFrame(({ clock }) => {
    const life = s.life * (reduced ? s.reducedSlowdown : 1);
    const t = clock.elapsedTime;
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
  const a = atmosphere.ice;
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

/** Copies the scene's sun direction into the ice once (the snow scene owns the sun; it is not exported). */
function useIceSun() {
  const scene = useThree((s) => s.scene);
  const done = useRef(false);
  useFrame(() => {
    if (done.current) return;
    scene.traverse((o) => {
      if (!done.current && o instanceof DirectionalLight) {
        iceSun.uSun.value.copy(o.position).normalize();
        done.current = true;
      }
    });
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
    // A little wobble along the length, more near the top where water refroze in rings.
    const wob = 1 + (rand() - 0.5) * 0.25 + Math.sin(y * 19) * 0.06;
    pos.setX(i, pos.getX(i) * wob);
    pos.setZ(i, pos.getZ(i) * wob);
  }
  g.computeVertexNormals();
  icicleGeo = g;
  return g;
}

/**
 * Icicles hanging from one prop's eaves (`atmosphere.ice.icicles`), drawn inside the prop's turning group so they
 * stay on the drawing. One instanced mesh per prop.
 */
export function Icicles({ id, width, height }: { id: PropId; width: number; height: number }) {
  const rows = atmosphere.ice.icicles.filter((r) => r.prop === id);
  const count = rows.reduce((n, r) => n + r.count, 0);
  const mesh = useRef<InstancedMesh>(null);
  useIceSun();
  useEffect(() => {
    const m = mesh.current;
    if (!m || count === 0) return;
    const a = atmosphere.ice;
    const rand = seeded(id.length * 13 + count);
    const o = new Object3D();
    let k = 0;
    for (const r of rows) {
      for (let i = 0; i < r.count; i++) {
        // Evenly along the eave with a little jitter; the longest ones in the middle, like real eaves.
        const s = r.count === 1 ? 0.5 : (i + 0.15 + rand() * 0.7) / r.count;
        const at: [number, number] = [r.from[0] + (r.to[0] - r.from[0]) * s, r.from[1] + (r.to[1] - r.from[1]) * s];
        const [x, y, z] = onDrawing(at, width, height, 0.008);
        const middle = 1 - Math.abs(s - 0.5) * 1.2;
        const len = a.icicleLength[0] + (a.icicleLength[1] - a.icicleLength[0]) * (0.35 * rand() + 0.65 * middle * rand());
        const w = a.icicleWidth * (0.75 + rand() * 0.5) * Math.min(1, len / 0.12 + 0.3);
        o.position.set(x, y + 0.006, z);
        o.rotation.set(0, rand() * Math.PI, (rand() - 0.5) * 0.12);
        o.scale.set(w, len, w);
        o.updateMatrix();
        m.setMatrixAt(k++, o.matrix);
      }
    }
    m.instanceMatrix.needsUpdate = true;
  }, [rows, count, id, width, height]);
  if (count === 0) return null;
  return (
    <instancedMesh
      ref={mesh}
      args={[icicleGeometry(), iceMaterial(), count]}
      frustumCulled={false}
      renderOrder={3}
      raycast={() => null}
    />
  );
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

/**
 * The small heaps of real snow the ice chunks sit in. Render outside any Suspense (Village does), so they are
 * made before anything samples the snow (the pins' physics ground).
 */
export function IceBeds({ lane }: { lane: GameLane }) {
  const snow = useSnow();
  useMemo(() => {
    for (const c of atmosphere.ice.chunks) {
      const [x, z] = fitPoint(c.x, c.z, lane);
      snow.heapSnow(x, z, c.size * 0.9, c.size * 0.8, c.size * 0.22);
    }
  }, [snow, lane]);
  return null;
}

/**
 * Chunks of clear ice lying in the snow by the frozen pond and the igloo (`atmosphere.ice.chunks`), each a little
 * sunk in a small heap of real snow with a dab of snow on top.
 */
export function IceChunks({ lane }: { lane: GameLane }) {
  const snow = useSnow();
  useIceSun();
  const a = atmosphere.ice;
  const chunks = useMemo(
    () =>
      a.chunks.map((c, i) => {
        const [x, z] = fitPoint(c.x, c.z, lane);
        const y = snow.heightAt(x, z) - c.size * a.chunkSink * 0.5;
        return { ...c, x, y, z, geometry: chunkGeometry(101 + i * 7) };
      }),
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
