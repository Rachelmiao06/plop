"use client";

import { useContext, useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import {
  BufferAttribute,
  BufferGeometry,
  Color,
  type DirectionalLight,
  type HemisphereLight,
  ShaderMaterial,
  Vector3,
} from "three";
import { content } from "./content";
import { sunDirection, sunDirectionAt } from "./layout";
import { getTimeOfDay, type Lighting, lightingAt } from "./timeOfDay";
import { sharedUniforms } from "./sharedUniforms";
import { SnowContext } from "./snowContext";

// Everything around the snow: sun, sky light, the foggy backdrop and the
// falling flakes. The camera is in CameraRig.tsx.

/**
 * Keeps the number of pixels drawn within a budget: full sharpness on phones
 * and small windows, slightly softer on a big retina window.
 */
export function Sharpness() {
  const width = useThree((s) => s.size.width);
  const height = useThree((s) => s.size.height);
  const setDpr = useThree((s) => s.setDpr);
  useEffect(() => {
    const device = Math.min(window.devicePixelRatio || 1, content.maxPixelRatio);
    const budget = Math.sqrt(content.maxPixels / Math.max(width * height, 1));
    setDpr(Math.max(1, Math.min(device, budget)));
  }, [width, height, setDpr]);
  return null;
}

/**
 * Low warm sun plus a cool sky fill, so shadows read soft blue. Both follow the time of day (setTimeOfDay): the sun
 * sinks and warms toward sunset, then a cool moon takes over for the evening; the sky fill, shadow strength, sparkles,
 * fog, flakes and exposure move with it (numbers in content.timeOfDay). Only recomputed when the time changes.
 */
export function Lights() {
  const l = content.light;
  const sun = useRef<DirectionalLight>(null);
  const sky = useRef<HemisphereLight>(null);
  const [sx, sy, sz] = sunDirection();
  const far = 40;
  const lit = useRef<{ t: number; out: Lighting | undefined }>({ t: -1, out: undefined });

  useFrame(({ gl }) => {
    const t = getTimeOfDay();
    const light = sun.current;
    const fill = sky.current;
    if (!light || !fill || t === lit.current.t) return;
    lit.current.t = t;
    const o = lightingAt(t, lit.current.out);
    lit.current.out = o;
    const [x, y, z] = sunDirectionAt(o.sunElevation, o.sunAzimuth);
    light.position.set(x * far * 0.5, y * far * 0.5, z * far * 0.5);
    light.color.copy(o.sun);
    light.intensity = o.sunStrength;
    light.shadow.intensity = o.shadeStrength;
    fill.color.copy(o.skyFill);
    fill.groundColor.copy(o.groundBounce);
    fill.intensity = o.skyStrength;
    gl.toneMappingExposure = o.exposure;
    sharedUniforms.uFogTop.value.copy(o.fogTop);
    sharedUniforms.uFogBottom.value.copy(o.fogBottom);
    sharedUniforms.uSparkleColor.value.copy(o.sparkle);
    sharedUniforms.uSparkle.value.w = o.sparkleStrength;
    flakeClock.uColor.value.copy(o.snowflake);
  });

  useEffect(() => {
    const light = sun.current;
    if (!light) return;
    light.target.position.set(0, 0, 0);
    light.target.updateMatrixWorld();
  }, []);

  return (
    <>
      <hemisphereLight
        ref={sky}
        args={[content.colors.skyFill, content.colors.groundBounce, l.skyStrength]}
      />
      <directionalLight
        ref={sun}
        color={content.colors.sun}
        intensity={l.sunStrength}
        position={[sx * far * 0.5, sy * far * 0.5, sz * far * 0.5]}
        castShadow
        shadow-mapSize={[l.shadowMapSize, l.shadowMapSize]}
        shadow-radius={l.shadowSoftness}
        shadow-bias={l.shadowBias}
        shadow-normalBias={l.shadowNormalBias}
        shadow-intensity={content.shade.strength}
      >
        <orthographicCamera
          attach="shadow-camera"
          args={[-l.shadowArea, l.shadowArea, l.shadowArea, -l.shadowArea, 1, far]}
        />
      </directionalLight>
    </>
  );
}

/** The fog colour behind everything, drawn as one screen-filling triangle. */
export function Backdrop() {
  const geometry = useMemo(() => {
    const g = new BufferGeometry();
    g.setAttribute(
      "position",
      new BufferAttribute(new Float32Array([-1, -1, 0, 3, -1, 0, -1, 3, 0]), 3),
    );
    return g;
  }, []);

  const material = useMemo(
    () =>
      new ShaderMaterial({
        uniforms: sharedUniforms,
        depthTest: false,
        depthWrite: false,
        vertexShader: /* glsl */ `
          void main() {
            gl_Position = vec4(position.xy, 1.0, 1.0);
          }
        `,
        fragmentShader: /* glsl */ `
          uniform vec3 uFogTop;
          uniform vec3 uFogBottom;
          uniform vec2 uResolution;
          void main() {
            gl_FragColor = vec4(mix(uFogBottom, uFogTop, gl_FragCoord.y / uResolution.y), 1.0);
            #include <colorspace_fragment>
          }
        `,
      }),
    [],
  );

  return (
    <mesh
      geometry={geometry}
      material={material}
      frustumCulled={false}
      renderOrder={-1000}
      raycast={() => null}
    />
  );
}

// Changed every frame, so it lives outside the component.
const flakeClock = { uTime: { value: 0 }, uHeavy: { value: 0 }, uColor: { value: new Color(content.colors.snowflake) } };

/**
 * Light snowfall. The flakes are moved on the graphics card, not in script.
 * During a fresh snowfall extra, bigger flakes fade in on top (they are only
 * drawn while it lasts).
 */
export function Snowfall() {
  const s = content.snowfall;
  const f = content.freshSnow;
  const field = useContext(SnowContext);

  const geometry = useMemo(() => {
    const total = s.count + f.heavyCount;
    // Position holds three random numbers per flake, not a place in the scene.
    const seeds = new Float32Array(total * 3);
    const extra = new Float32Array(total);
    // 1 for the extra flakes of a fresh snowfall.
    const heavy = new Float32Array(total);
    let v = 1234.5;
    const random = () => {
      v = Math.sin(v * 12.9898 + 78.233) * 43758.5453;
      v -= Math.floor(v);
      return v;
    };
    for (let i = 0; i < s.count; i++) {
      seeds[i * 3] = random();
      seeds[i * 3 + 1] = random();
      seeds[i * 3 + 2] = random();
      extra[i] = random();
    }
    // The fresh-snowfall flakes come after, so the light snow is unchanged.
    for (let i = s.count; i < total; i++) {
      seeds[i * 3] = random();
      seeds[i * 3 + 1] = random();
      seeds[i * 3 + 2] = random();
      extra[i] = random();
      heavy[i] = 1;
    }
    const g = new BufferGeometry();
    g.setAttribute("position", new BufferAttribute(seeds, 3));
    g.setAttribute("aExtra", new BufferAttribute(extra, 1));
    g.setAttribute("aHeavy", new BufferAttribute(heavy, 1));
    g.setDrawRange(0, s.count);
    return g;
  }, [s.count, f.heavyCount]);

  const material = useMemo(
    () =>
      new ShaderMaterial({
        transparent: true,
        depthWrite: false,
        uniforms: {
          ...flakeClock,
          uPixelsPerUnit: sharedUniforms.uPixelsPerUnit,
          uFlakeFade: sharedUniforms.uFlakeFade,
          uArea: { value: new Vector3(s.areaX, s.height, s.areaZ) },
          uCenterZ: { value: content.ground.centerZ },
          // fall speed, sideways drift, flake size, opacity
          uFlake: { value: [s.fallSpeed, s.drift, s.size, s.opacity] },
          // how much bigger and faster the fresh-snowfall flakes are
          uHeavyLook: { value: [f.heavySize, f.heavySpeed] },
        },
        vertexShader: /* glsl */ `
          uniform float uTime;
          uniform float uPixelsPerUnit;
          uniform float uFlakeFade;
          uniform vec3 uArea;
          uniform float uCenterZ;
          uniform vec4 uFlake;
          uniform float uHeavy;
          uniform vec2 uHeavyLook;
          attribute float aExtra;
          attribute float aHeavy;
          varying float vAlpha;
          void main() {
            float speed = uFlake.x * (0.6 + 0.8 * aExtra) * mix(1.0, uHeavyLook.y, aHeavy);
            float fall = fract(position.y - uTime * speed / uArea.y);
            vec3 p = vec3(
              (position.x - 0.5) * uArea.x,
              fall * uArea.y,
              (position.z - 0.5) * uArea.z + uCenterZ
            );
            p.x += sin(uTime * 0.7 + aExtra * 40.0) * uFlake.y;
            p.z += cos(uTime * 0.5 + aExtra * 23.0) * uFlake.y * 0.6;
            vec4 mv = viewMatrix * vec4(p, 1.0);
            gl_Position = projectionMatrix * mv;
            gl_PointSize = uFlake.z * (0.6 + 0.8 * fract(aExtra * 7.0)) * mix(1.0, uHeavyLook.x, aHeavy)
              * uPixelsPerUnit / -mv.z;
            // Fade in at the top and out just above the snow. Extra flakes
            // each appear at their own moment as the snowfall thickens.
            float heavyOn = smoothstep(aExtra * 0.7, aExtra * 0.7 + 0.3, uHeavy);
            vAlpha = uFlakeFade * uFlake.w * smoothstep(0.0, 0.06, fall) * (1.0 - smoothstep(0.85, 1.0, fall))
              * mix(1.0, heavyOn, aHeavy);
          }
        `,
        fragmentShader: /* glsl */ `
          uniform vec3 uColor;
          varying float vAlpha;
          void main() {
            float d = length(gl_PointCoord - 0.5);
            float a = (1.0 - smoothstep(0.15, 0.5, d)) * vAlpha;
            gl_FragColor = vec4(uColor, a);
            #include <colorspace_fragment>
          }
        `,
      }),
    [s, f],
  );

  useFrame((state) => {
    flakeClock.uTime.value = state.clock.elapsedTime;
    const heavy = field?.heaviness() ?? 0;
    flakeClock.uHeavy.value = heavy;
    // The extra flakes cost nothing while no fresh snowfall is on.
    geometry.setDrawRange(0, heavy > 0 ? s.count + f.heavyCount : s.count);
    const fov = (content.camera.fieldOfView * Math.PI) / 180;
    sharedUniforms.uPixelsPerUnit.value =
      sharedUniforms.uResolution.value.y / (2 * Math.tan(fov / 2));
  });

  return (
    <points
      geometry={geometry}
      material={material}
      frustumCulled={false}
      raycast={() => null}
    />
  );
}
