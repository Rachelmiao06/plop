/*
  The drawn snowball. Nothing is lit physically and nothing shines: a flat --paper base, a
  --snow-shadow side that always stays away from the fixed drawing light (the same light the
  scenery cut-outs are shaded from), faint paper fibres, pencil marks and crumbs fixed to the
  ball so they turn as it rolls, and a slightly uneven --ink outline drawn as a back-face shell.
  Works on single meshes and on instanced meshes (the falling clumps).
*/
import { BackSide, Color, FrontSide, ShaderMaterial, UniformsLib, UniformsUtils, Vector3, Vector4 } from "three";

import { LOOK } from "../content";

export type BallColors = { paper: string; shade: string; ink: string };

const noise = /* glsl */ `
  float hash2(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float vnoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash2(i), hash2(i + vec2(1.0, 0.0)), u.x), mix(hash2(i + vec2(0.0, 1.0)), hash2(i + vec2(1.0, 1.0)), u.x), u.y);
  }
`;

/** The model matrix including the instance matrix, when instanced. */
const modelOf = /* glsl */ `
  mat4 model = modelMatrix;
  #ifdef USE_INSTANCING
    model = modelMatrix * instanceMatrix;
  #endif
`;

const MAX_MARKS = 24;

const ballVertex = /* glsl */ `
  #include <common>
  #include <fog_pars_vertex>
  varying vec3 vWorldNormal;
  varying vec3 vObj;
  varying float vRadius;
  void main() {
    ${modelOf}
    vWorldNormal = normalize(mat3(model) * normal);
    vObj = position;
    vRadius = length(model[0].xyz);
    vec4 mvPosition = viewMatrix * model * vec4(position, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    #include <fog_vertex>
  }
`;

const ballFragment = /* glsl */ `
  #include <common>
  #include <fog_pars_fragment>
  ${noise}
  uniform vec3 uPaper;
  uniform vec3 uShade;
  uniform vec3 uInk;
  uniform vec3 uLight;
  uniform vec2 uBand;
  uniform float uUneven;
  uniform float uHatch;
  uniform float uGrain;
  uniform float uMarkWidth;
  uniform float uMarkInk;
  uniform int uMarkCount;
  uniform vec4 uMarkAt[${MAX_MARKS}];
  uniform vec4 uMarkShape[${MAX_MARKS}];
  varying vec3 vWorldNormal;
  varying vec3 vObj;
  varying float vRadius;
  void main() {
    vec3 n = normalize(vWorldNormal);
    vec3 o = normalize(vObj);
    // Shade side: in world space, so it stays away from the light however the ball turns.
    float wander = (vnoise(n.xy * 4.0 + n.z * 2.0) - 0.5) * uUneven;
    float wrap = dot(n, uLight) * 0.5 + 0.5 + wander;
    float shade = 1.0 - smoothstep(uBand.x, uBand.y, wrap);
    // Coloured-pencil hatch in the shade: diagonal strokes that stay put relative to the light.
    float hatch = 0.5 + 0.5 * sin((n.x * 0.8 + n.y) * 70.0 + vnoise(n.xy * 9.0) * 3.0);
    shade *= 1.0 - uHatch * hatch * (0.6 + 0.4 * vnoise(n.yz * 14.0));
    vec3 col = mix(uPaper, uShade, shade);
    // Paper fibres, fixed to the ball.
    float fibre = vnoise(o.xy * 55.0 + o.z * 31.0) * 0.6 + vnoise(o.yz * 17.0) * 0.4;
    col = mix(col, uShade, uGrain * fibre);
    // Pencil marks and crumbs, fixed to the ball so they turn with the roll.
    float w = clamp(uMarkWidth / max(vRadius, 0.001), 0.02, 0.1);
    float pencil = 0.0;
    float crumb = 0.0;
    for (int i = 0; i < ${MAX_MARKS}; i++) {
      if (i >= uMarkCount) break;
      vec3 p = uMarkAt[i].xyz;
      if (dot(o, p) < 0.75) continue;
      vec3 t = normalize(cross(p, abs(p.y) < 0.9 ? vec3(0.0, 1.0, 0.0) : vec3(1.0, 0.0, 0.0)));
      vec3 b = cross(p, t);
      vec2 l = vec2(dot(o, t), dot(o, b));
      vec4 s = uMarkShape[i]; // size, start angle, span, kind (0 = pencil arc, 1 = crumb)
      if (uMarkAt[i].w > 0.5) {
        float d = length(l) - s.x;
        crumb = max(crumb, 1.0 - smoothstep(0.0, w * 0.5, d));
      } else {
        float d = abs(length(l) - s.x);
        float a = mod(atan(l.y, l.x) - s.y, 6.2831853);
        float along = smoothstep(0.0, 0.25, a) * (1.0 - smoothstep(s.z - 0.25, s.z, a));
        // The line thins toward its ends, like a pencil stroke.
        float width = w * (0.55 + 0.45 * sin(3.14159 * clamp(a / s.z, 0.0, 1.0)));
        pencil = max(pencil, (1.0 - smoothstep(width * 0.35, width * 0.6, d)) * along);
      }
    }
    col = mix(col, uShade * 0.92, crumb * 0.9);
    col = mix(col, uInk, pencil * uMarkInk);
    gl_FragColor = vec4(col, 1.0);
    #include <colorspace_fragment>
    #include <fog_fragment>
  }
`;

const outlineVertex = /* glsl */ `
  #include <common>
  #include <fog_pars_vertex>
  ${noise}
  uniform float uOutline;
  uniform float uWobble;
  varying vec3 vWorldNormal;
  void main() {
    ${modelOf}
    float r = max(length(model[0].xyz), 0.001);
    vec3 wn = normalize(mat3(model) * normal);
    vWorldNormal = wn;
    // Uneven width, from the world-space direction so the line stays put while the ball turns.
    float k = 1.0 + uWobble * (vnoise(wn.xy * 2.6 + wn.z * 1.9 + 4.1) * 2.0 - 1.0);
    vec3 p = position + normal * (uOutline * k / r);
    vec4 mvPosition = viewMatrix * model * vec4(p, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    #include <fog_vertex>
  }
`;

const outlineFragment = /* glsl */ `
  #include <common>
  #include <fog_pars_fragment>
  ${noise}
  uniform vec3 uInk;
  uniform vec3 uPaper;
  uniform float uGaps;
  varying vec3 vWorldNormal;
  void main() {
    vec3 n = normalize(vWorldNormal);
    // Fades a little in places, like a pencil line pressed unevenly.
    float gap = smoothstep(0.55, 0.85, vnoise(n.xy * 5.0 + n.z * 3.0 + 9.0));
    vec3 col = mix(uInk, uPaper, gap * uGaps);
    gl_FragColor = vec4(col, 1.0);
    #include <colorspace_fragment>
    #include <fog_fragment>
  }
`;

/** Marks spread evenly over the ball (golden spiral), each a short pencil arc or a crumb. Same every time. */
function markUniforms(count: number) {
  let seed = 29;
  const rnd = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  const at: Vector4[] = [];
  const shape: Vector4[] = [];
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < MAX_MARKS; i++) {
    if (i >= count) {
      at.push(new Vector4());
      shape.push(new Vector4());
      continue;
    }
    const y = 1 - ((i + 0.5) / count) * 2;
    const ring = Math.sqrt(1 - y * y);
    const a = i * golden + rnd() * 0.6;
    const p = new Vector3(Math.cos(a) * ring, y, Math.sin(a) * ring).normalize();
    const crumb = i % 3 === 2;
    at.push(new Vector4(p.x, p.y, p.z, crumb ? 1 : 0));
    shape.push(
      crumb
        ? new Vector4(0.03 + rnd() * 0.025, 0, 0, 1)
        : new Vector4(0.15 + rnd() * 0.12, rnd() * Math.PI * 2, 1.3 + rnd() * 1.5, 0),
    );
  }
  return { at, shape };
}

/** The ball's body. `marks: false` for the little clumps. */
export function ballMaterial(colors: BallColors, light: Vector3, opts: { marks: boolean } = { marks: true }) {
  const b = LOOK.ball;
  const marks = markUniforms(Math.min(MAX_MARKS, b.marks));
  return new ShaderMaterial({
    uniforms: UniformsUtils.merge([
      UniformsLib.fog,
      {
        uPaper: { value: new Color(colors.paper) },
        uShade: { value: new Color(colors.shade) },
        uInk: { value: new Color(colors.ink) },
        uLight: { value: light.clone().normalize() },
        uBand: { value: [b.band.from, b.band.to] },
        uUneven: { value: b.uneven },
        uHatch: { value: b.hatch },
        uGrain: { value: b.grain },
        uMarkWidth: { value: b.markWidth },
        uMarkInk: { value: b.markInk },
        uMarkCount: { value: opts.marks ? Math.min(MAX_MARKS, b.marks) : 0 },
        uMarkAt: { value: marks.at },
        uMarkShape: { value: marks.shape },
      },
    ]),
    vertexShader: ballVertex,
    fragmentShader: ballFragment,
    fog: true,
    side: FrontSide,
  });
}

/** The --ink outline shell: draw the same geometry with this material, back faces only. */
export function ballOutlineMaterial(colors: BallColors, width = LOOK.ball.outline) {
  const b = LOOK.ball;
  return new ShaderMaterial({
    uniforms: UniformsUtils.merge([
      UniformsLib.fog,
      {
        uInk: { value: new Color(colors.ink) },
        uPaper: { value: new Color(colors.paper) },
        uOutline: { value: width },
        uWobble: { value: b.outlineWobble },
        uGaps: { value: b.outlineGaps },
      },
    ]),
    vertexShader: outlineVertex,
    fragmentShader: outlineFragment,
    fog: true,
    side: BackSide,
  });
}
