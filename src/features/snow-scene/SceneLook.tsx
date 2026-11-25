"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import {
  BufferAttribute,
  BufferGeometry,
  Color,
  type DirectionalLight,
  ShaderMaterial,
  Vector3,
} from "three";
import { content } from "./content";
import { sunDirection } from "./layout";
import { sharedUniforms } from "./sharedUniforms";

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

/** Low warm sun plus a cool sky fill, so shadows read soft blue. */
export function Lights() {
  const l = content.light;
  const sun = useRef<DirectionalLight>(null);
  const [sx, sy, sz] = sunDirection();
  const far = 40;

  useEffect(() => {
    const light = sun.current;
    if (!light) return;
    light.target.position.set(0, 0, 0);
    light.target.updateMatrixWorld();
  }, []);

  return (
    <>
      <hemisphereLight
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
const flakeClock = { uTime: { value: 0 } };

/** Light snowfall. The flakes are moved on the graphics card, not in script. */
export function Snowfall() {
  const s = content.snowfall;

  const geometry = useMemo(() => {
    // Position holds three random numbers per flake, not a place in the scene.
    const seeds = new Float32Array(s.count * 3);
    const extra = new Float32Array(s.count);
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
    const g = new BufferGeometry();
    g.setAttribute("position", new BufferAttribute(seeds, 3));
    g.setAttribute("aExtra", new BufferAttribute(extra, 1));
    return g;
  }, [s.count]);

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
          uColor: { value: new Color(content.colors.snowflake) },
        },
        vertexShader: /* glsl */ `
          uniform float uTime;
          uniform float uPixelsPerUnit;
          uniform float uFlakeFade;
          uniform vec3 uArea;
          uniform float uCenterZ;
          uniform vec4 uFlake;
          attribute float aExtra;
          varying float vAlpha;
          void main() {
            float speed = uFlake.x * (0.6 + 0.8 * aExtra);
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
            gl_PointSize = uFlake.z * (0.6 + 0.8 * fract(aExtra * 7.0)) * uPixelsPerUnit / -mv.z;
            // Fade in at the top and out just above the snow.
            vAlpha = uFlakeFade * uFlake.w * smoothstep(0.0, 0.06, fall) * (1.0 - smoothstep(0.85, 1.0, fall));
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
    [s],
  );

  useFrame((state) => {
    flakeClock.uTime.value = state.clock.elapsedTime;
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
