/**
 * The loading strip's shader: a short trench of real lit snow seen from slightly above, a snowball rolling
 * left to right and pressing a groove behind it, a little spray, and the burst at the end.
 *
 * Same recipe as the snow scene's ground (src/features/snow-scene/SnowGround.tsx), shrunk to one flat pass:
 * a warm sun and a pale sky fill shading the slopes, fine grain that catches the light, glinting sparkles,
 * pressed snow turning bluer the deeper it goes. Raw WebGL 1, no three.js, so the loading screen stays tiny.
 *
 * Units: the strip is 1 tall and `aspect` wide; x runs left to right, y up the screen.
 */

/** The groove's centre line, as a share of the strip height from the bottom (shared with SnowStrip.tsx). */
export const LANE_Y = 0.42;

export const VERTEX = /* glsl */ `
attribute vec2 aPos;
varying vec2 vUv;
void main() {
  vUv = aPos * 0.5 + 0.5;
  gl_Position = vec4(aPos, 0.0, 1.0);
}
`;

export const FRAGMENT = /* glsl */ `
precision highp float;
varying vec2 vUv;

uniform float uAspect;
uniform float uTime;
uniform float uBallX;     // ball centre x (strip units)
uniform float uStartX;    // where the groove starts
uniform float uR0;        // ball radius at the start
uniform float uR1;        // ball radius at the end
uniform float uEndX;      // ball centre x at 100 %
uniform float uSpin;      // how far the ball has turned (radians)
uniform float uSpeed;     // 0..1, how fast it is rolling now (spray)
uniform float uBurst;     // seconds since the burst, or -1
uniform float uMotion;    // 0 = reduce motion (no twinkle, no spray)

uniform vec3 uSnow;
uniform vec3 uPressed;
uniform vec3 uSun;
uniform vec3 uSky;
uniform vec3 uBounce;
uniform vec3 uSparkle;
uniform float uGrain;
uniform float uSparkleAmount;
uniform float uExposure;

const float LANE_Y = ${LANE_Y.toFixed(3)};
const vec3 SUN = normalize(vec3(-0.55, 0.72, 0.42));
const vec3 VIEW = normalize(vec3(0.0, 0.62, 0.78));

float sq(float x) { return x * x; }
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float hash3(vec3 p) { return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
}
float noise3(vec3 p) {
  vec3 i = floor(p), f = fract(p);
  vec3 u = f * f * (3.0 - 2.0 * f);
  float a = mix(mix(hash3(i), hash3(i + vec3(1,0,0)), u.x), mix(hash3(i + vec3(0,1,0)), hash3(i + vec3(1,1,0)), u.x), u.y);
  float b = mix(mix(hash3(i + vec3(0,0,1)), hash3(i + vec3(1,0,1)), u.x), mix(hash3(i + vec3(0,1,1)), hash3(i + vec3(1,1,1)), u.x), u.y);
  return mix(a, b, u.z);
}
float fbm(vec2 p) { return noise(p) * 0.6 + noise(p * 2.1 + 7.3) * 0.28 + noise(p * 4.3 + 1.7) * 0.12; }

vec3 toLinear(vec3 c) { return pow(c, vec3(2.2)); }
vec3 toSrgb(vec3 c) { return pow(c, vec3(1.0 / 2.2)); }

// Ball radius once it has rolled to x.
float radiusAt(float x) { return mix(uR0, uR1, clamp((x - uStartX) / max(0.001, uEndX - uStartX), 0.0, 1.0)); }

// Snow height at (x, y): soft lumpy fresh snow, a shallow trench, the groove pressed behind the ball,
// a raised rim either side, and a little bow wave ahead of it. Also returns how deep it is pressed.
float heightAt(vec2 p, out float pressed) {
  float h = (fbm(p * 6.0) - 0.5) * 0.05 + (noise(p * 2.3) - 0.5) * 0.04;
  h -= 0.03 * exp(-sq((p.y - LANE_Y) / 0.2));       // the trench
  pressed = 0.0;
  float r = radiusAt(min(p.x, uBallX));
  float behind = smoothstep(uStartX - 0.06, uStartX + 0.08, p.x) * smoothstep(uBallX + 0.02, uBallX - r * 0.4, p.x);
  float w = r * 0.78;                                    // groove half width on screen (foreshortened)
  float dy = (p.y - (LANE_Y - 0.02)) / w;
  float wobble = (noise(vec2(p.x * 18.0, 3.1)) - 0.5) * 0.35;   // never a ruler-straight edge
  float inside = max(0.0, 1.0 - dy * dy * (1.0 + wobble));
  float depth = r * 0.3 * smoothstep(0.0, 0.7, inside) * behind;
  float rim = r * 0.09 * exp(-sq((abs(dy) - 1.1) / 0.35)) * behind * (0.7 + 0.6 * noise(p * 30.0));
  // Bow wave ahead of the ball.
  float ahead = exp(-sq((p.x - uBallX - r * 0.95) / (r * 0.35))) * exp(-dy * dy * 1.4);
  pressed = depth / max(0.001, uR1 * 0.3);
  return h - depth + rim + ahead * r * 0.12;
}

vec3 light(vec3 n, vec3 albedo, float shadow, vec2 cell) {
  float sun = max(dot(n, SUN), 0.0) * (1.0 - shadow * 0.65);
  vec3 col = albedo * (uSun * sun * 1.05 + uSky * (0.42 + 0.3 * n.y) + uBounce * 0.12 * (1.0 - n.y));
  // Glints: a few grain cells catch the sun when the half vector lines up (twinkle slowly).
  vec2 c = floor(cell);
  float pick = hash(c);
  if (pick < uSparkleAmount) {
    vec3 jitter = normalize(vec3(hash(c + 1.3) - 0.5, 1.6, hash(c + 2.7) - 0.5));
    vec3 hv = normalize(SUN + VIEW);
    float tw = uMotion > 0.5 ? 0.6 + 0.4 * sin(uTime * (1.5 + pick * 40.0) + pick * 90.0) : 1.0;
    float s = pow(max(dot(normalize(n + jitter * 0.6), hv), 0.0), 60.0) * tw;
    float dotShape = smoothstep(0.5, 0.1, length(fract(cell) - 0.5));
    col += uSparkle * s * dotShape * 2.6 * (1.0 - shadow);
  }
  return col;
}

void main() {
  vec2 p = vec2(vUv.x * uAspect, vUv.y);
  float burst = uBurst;
  float r = radiusAt(uBallX);
  vec2 ball = vec2(uBallX, LANE_Y + r * 0.42);

  // --- snow surface
  float e = 0.0025;
  float pr, tmp;
  float h = heightAt(p, pr);
  float hx = heightAt(p + vec2(e, 0.0), tmp);
  float hy = heightAt(p + vec2(0.0, e), tmp);
  vec3 n = normalize(vec3(-(hx - h) / e, 1.0, (hy - h) / e));
  // Fine grain on top.
  vec2 g = p * 85.0;
  vec2 gn = vec2(noise(g) - noise(g + vec2(0.7, 0.0)), noise(g) - noise(g + vec2(0.0, 0.7)));
  n = normalize(n + vec3(gn.x, 0.0, gn.y) * uGrain * 3.0);

  // Soft contact shadow from the ball, thrown away from the sun.
  vec2 sp = (p - (ball + vec2(r * 0.5, -r * 0.55))) / vec2(r * 1.3, r * 0.45);
  float shadow = (burst < 0.0 ? 1.0 : max(0.0, 1.0 - burst * 5.0)) * smoothstep(1.0, 0.25, length(sp));

  vec3 albedo = mix(toLinear(uSnow), toLinear(uPressed), clamp(pr, 0.0, 1.0) * 0.55);
  albedo *= 1.0 - (noise(g * 0.5) - 0.5) * 0.06;
  vec3 col = light(n, albedo, shadow, p * 60.0);

  // --- the snowball
  float ballFade = burst < 0.0 ? 1.0 : clamp(1.0 - burst / 0.14, 0.0, 1.0);
  float rr = r * (burst < 0.0 ? 1.0 : 1.0 + burst * 1.5);
  vec2 d = (p - ball) / rr;
  float dd = dot(d, d);
  float cover = smoothstep(1.0, 1.0 - 0.06, dd) * ballFade;
  if (cover > 0.0) {
    vec3 sn = vec3(d.x, d.y, sqrt(max(0.0, 1.0 - dd)));
    // screen frame -> world (y up, viewer up and in front)
    vec3 up = normalize(vec3(0.0, 0.78, -0.62));
    vec3 wn = normalize(vec3(sn.x, 0.0, 0.0) + up * sn.y + VIEW * sn.z);
    // Turn the surface with the roll (about the axis pointing at the viewer's side), so the clumps travel.
    float c = cos(uSpin), s = sin(uSpin);
    vec3 q = vec3(c * sn.x + s * sn.y, -s * sn.x + c * sn.y, sn.z);
    float lump = noise3(q * 5.5) * 0.6 + noise3(q * 13.0) * 0.4;
    vec3 bump = vec3(noise3(q * 9.0 + 3.1) - 0.5, noise3(q * 9.0 + 8.7) - 0.5, 0.0);
    wn = normalize(wn + bump * 0.55);
    vec3 ballAlbedo = toLinear(uSnow) * (0.98 + lump * 0.06);
    vec3 bc = light(wn, ballAlbedo, 0.0, q.xy * 18.0 + 40.0);
    // A touch of the pressed snow's blue in the deepest underside.
    bc = mix(bc, bc * toLinear(uPressed) * 1.4, smoothstep(-0.2, -0.95, d.y) * 0.35);
    col = mix(col, bc, cover);
  }

  // --- spray behind the ball while it rolls, and the burst
  float dust = 0.0;
  if (uMotion > 0.5) {
    for (int i = 0; i < 16; i++) {
      float fi = float(i);
      float life = 0.55 + hash(vec2(fi, 1.0)) * 0.35;
      float ph = fract(uTime / life + hash(vec2(fi, 2.0)));
      float age = ph * life;
      vec2 v = vec2(-0.25 - hash(vec2(fi, 3.0)) * 0.45, 0.35 + hash(vec2(fi, 4.0)) * 0.55) * (0.4 + uSpeed);
      vec2 at = vec2(uBallX - r * 0.6, LANE_Y + r * 0.1) + v * age + vec2(0.0, -1.6) * age * age;
      float size = (0.008 + hash(vec2(fi, 5.0)) * 0.012) * (1.0 - ph * 0.5);
      dust += smoothstep(size, size * 0.3, length(p - at)) * (1.0 - ph) * uSpeed * ballFade;
    }
    if (burst >= 0.0) {
      for (int i = 0; i < 28; i++) {
        float fi = float(i);
        float ang = hash(vec2(fi, 11.0)) * 6.2832;
        float sp2 = 0.5 + hash(vec2(fi, 12.0)) * 1.1;
        vec2 at = ball + vec2(cos(ang), sin(ang) * 0.8) * sp2 * burst + vec2(0.0, -0.9) * burst * burst;
        float size = (0.012 + hash(vec2(fi, 13.0)) * 0.02) * (1.0 + burst);
        dust += smoothstep(size, size * 0.2, length(p - at)) * clamp(1.0 - burst / 0.7, 0.0, 1.0);
      }
    }
  }
  vec3 dustCol = light(normalize(vec3(-0.3, 1.0, 0.4)), toLinear(uSnow), 0.0, vec2(0.0));
  col = mix(col, dustCol * 1.05, clamp(dust, 0.0, 1.0));

  col = toSrgb(col * uExposure);

  // Soft torn edges so the strip melts into the paper (never a hard rectangle).
  float tear = (fbm(vec2(p.x * 7.0, p.y * 5.0)) - 0.5) * 0.22;
  float top = smoothstep(0.0, 0.2, 1.0 - vUv.y + tear);
  float bottom = smoothstep(0.0, 0.2, vUv.y + tear * 0.8);
  float ends = smoothstep(0.0, 0.3, p.x + tear * 1.2) * smoothstep(0.0, 0.3, uAspect - p.x + tear * 1.2);
  float a = top * bottom * ends;
  a = max(a, cover);
  a = max(a, clamp(dust, 0.0, 1.0));
  gl_FragColor = vec4(col * a, a);
}
`;
