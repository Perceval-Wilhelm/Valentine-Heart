// Every particle's motion is computed on the GPU from a few uniforms, so JavaScript does the same small
// amount of work each frame however many particles there are.

const shared = /* glsl */ `
const float CAMERA = 3.4;
const float TAU = 6.2831853;

mat3 turn(vec2 yawPitch) {
  float cy = cos(yawPitch.x), sy = sin(yawPitch.x), cp = cos(yawPitch.y), sp = sin(yawPitch.y);
  mat3 yaw = mat3(cy, 0.0, -sy, 0.0, 1.0, 0.0, sy, 0.0, cy);
  mat3 pitch = mat3(1.0, 0.0, 0.0, 0.0, cp, sp, 0.0, -sp, cp);
  return yaw * pitch;
}

vec4 clip(vec2 pixels, vec2 resolution) {
  return vec4(pixels / resolution * 2.0 - 1.0, 0.0, 1.0);
}
`;

export const PARTICLE_VERTEX = /* glsl */ `#version 300 es
precision highp float;

layout(location = 0) in vec2 aStart;
layout(location = 1) in vec3 aHeart;
layout(location = 2) in vec2 aText;
layout(location = 3) in vec4 aSeed;
layout(location = 4) in float aGlow;

uniform vec2 uResolution;
uniform vec2 uCenter;
uniform float uUnit;
uniform float uTime;
uniform float uIntro;
uniform float uName;
uniform float uBeat;
uniform float uRing;
uniform float uBurst;
uniform vec2 uTurn;
uniform vec3 uPointer;
uniform float uPixelRatio;
uniform float uMotion;

out vec3 vColor;
out float vAlpha;
${shared}
// Particles leave one after another, so shapes form like a wave rather than all at once.
float travel(float progress, float delay) {
  float t = clamp((progress - delay * 0.4) / 0.6, 0.0, 1.0);
  return t * t * (3.0 - 2.0 * t);
}

vec2 spin(vec2 v, float angle) {
  float c = cos(angle), s = sin(angle);
  return vec2(c * v.x - s * v.y, s * v.x + c * v.y);
}

void main() {
  float intro = travel(uIntro, aSeed.x);
  float name = travel(uName, fract(aSeed.x * 7.31 + aSeed.w));

  // The heart: a faint shimmer, the heartbeat, the burst, then the turn and perspective.
  vec3 h = aHeart;
  h.xy += 0.01 * uMotion * vec2(sin(uTime * 1.3 + aSeed.z * TAU), cos(uTime * 1.1 + aSeed.w * TAU));
  float b = max(uBurst, 0.0) / 0.3;
  float burst = b * exp(1.0 - b);
  vec3 away = normalize(aHeart + 0.5 * (aSeed.wzy - 0.5) + vec3(0.0, 0.0, 0.001));
  h += away * burst * (0.5 + aSeed.w) * 1.1 * uMotion;
  h *= 1.0 + 0.075 * uBeat * uMotion;
  h = turn(uTurn) * h;
  float depth = CAMERA / (CAMERA - h.z);
  vec2 heart = uCenter + h.xy * uUnit * depth;

  // The name: flat and legible, floating very slightly.
  vec2 drift = 0.004 * uMotion * vec2(sin(uTime * 2.1 + aSeed.z * 40.0), cos(uTime * 1.7 + aSeed.w * 40.0));
  vec2 text = uCenter + (aText + drift) * uUnit;

  // Stardust across the whole screen, drifting until it is called in.
  vec2 dust = (aStart * 0.5 + 0.5) * uResolution;
  dust += 16.0 * uPixelRatio * uMotion * vec2(sin(uTime * 0.21 + aSeed.z * TAU), cos(uTime * 0.17 + aSeed.w * TAU));

  vec2 position = mix(dust, mix(heart, text, name), intro);
  // Paths bend around the centre on the way, like a galaxy settling.
  float swirl = intro * (1.0 - intro) * 6.0 + name * (1.0 - name) * 2.4;
  position = uCenter + spin(position - uCenter, swirl * (aSeed.w - 0.5) * uMotion);

  // The pointer parts the light around it.
  vec2 fromPointer = position - uPointer.xy;
  float reach = 120.0 * uPixelRatio;
  float push = uPointer.z * 42.0 * uPixelRatio * exp(-dot(fromPointer, fromPointer) / (reach * reach));
  position += normalize(fromPointer + 0.001) * push;

  gl_Position = clip(position, uResolution);

  float scale = clamp(uUnit / (240.0 * uPixelRatio), 0.7, 1.5);
  float size = (1.6 + 3.2 * aSeed.y * aSeed.y) * (1.0 + 0.35 * aGlow) * uPixelRatio * scale;
  gl_PointSize = size * mix(1.0, depth, intro * (1.0 - name)) * (1.0 + 0.5 * burst);

  vec3 rose = vec3(1.0, 0.33, 0.56);
  vec3 pink = vec3(0.918, 0.502, 0.69);
  vec3 blush = vec3(1.0, 0.87, 0.92);
  vec3 gold = vec3(1.0, 0.83, 0.6);
  vec3 color = mix(rose, pink, aSeed.z);
  color = mix(color, blush, aGlow * 0.4 + name * 0.35);
  color = mix(color, gold, step(0.94, aSeed.w) * 0.85);

  float twinkle = 0.7 + 0.3 * sin(uTime * (1.4 + 3.2 * aSeed.y) * uMotion + aSeed.z * 31.0);
  // Each lub sends a ring of light out across the heart.
  float ring = (length(aHeart.xy) - uRing * 1.9) / 0.1;
  float ripple = exp(-ring * ring) * max(0.0, 1.0 - uRing / 0.8);
  float light = (0.45 + 0.9 * aGlow) * twinkle + ripple * 0.9 * (1.0 - name) * uMotion + burst * 0.5;
  light = mix(light, 0.85 + 0.3 * twinkle, name);

  vColor = mix(vec3(0.95, 0.82, 0.92) * (0.5 + 0.5 * twinkle), color * light, intro);
  vAlpha = mix(0.4, 1.0, intro);
}
`;

export const PARTICLE_FRAGMENT = /* glsl */ `#version 300 es
precision mediump float;

in vec3 vColor;
in float vAlpha;
out vec4 outColor;

void main() {
  float d = length(gl_PointCoord - 0.5) * 2.0;
  float glow = exp(-d * d * 6.0) + exp(-d * d * 2.2) * 0.35;
  float a = glow * smoothstep(1.0, 0.7, d) * vAlpha;
  // Premultiplied, for additive blending: overlapping light adds up instead of covering.
  outColor = vec4(vColor * a, a);
}
`;

export const AURA_VERTEX = /* glsl */ `#version 300 es
precision highp float;

layout(location = 0) in vec3 aAura;

uniform vec2 uResolution;
uniform vec2 uCenter;
uniform float uUnit;
uniform float uTime;
uniform float uIntro;
uniform float uName;
uniform float uBeat;
uniform vec2 uTurn;
uniform float uMotion;
// Curve parameters at equal steps of arc length; see arcLengthTable().
uniform float uArc[65];

out float vAlpha;
${shared}
vec2 heartPoint(float t) {
  float s = sin(t);
  return vec2(s * s * s, (13.0 * cos(t) - 5.0 * cos(2.0 * t) - 2.0 * cos(3.0 * t) - cos(4.0 * t) + 2.5) / 16.0);
}

// The point a given fraction of the way round the outline, measured by length.
vec2 alongOutline(float along) {
  float x = fract(along) * 64.0;
  int i = int(x);
  return heartPoint(mix(uArc[i], uArc[i + 1], fract(x)));
}

void main() {
  // The 2025 heart lives on as this aura, with its physics unchanged: each little heart lives 2 s,
  // leaves the outline at 135 px/s and slows at -0.35 × that speed, on a heart 160 px per unit.
  float cycle = uTime * 0.5 + aAura.y;
  float life = fract(cycle);
  float age = life * 2.0;
  // A new spot on the outline every life, so the pattern never visibly repeats. Spacing by length
  // (the 2025 page spaced them by angle) stops them piling up into beams at the cusp and the tip.
  vec2 onCurve = alongOutline(aAura.x + floor(cycle) * 0.618034);
  vec2 outward = normalize(onCurve);
  vec3 p = vec3(onCurve + outward * (135.0 / 160.0) * (age - 0.175 * age * age), (aAura.z - 0.5) * 0.35);
  p *= 1.0 + 0.075 * uBeat * uMotion;
  p = turn(uTurn) * p;
  float depth = CAMERA / (CAMERA - p.z);
  gl_Position = clip(uCenter + p.xy * uUnit * depth, uResolution);

  // The 2025 sprite was 14 px, but its heart filled only about 8 px of it.
  float grow = 1.0 - pow(1.0 - life, 3.0);
  gl_PointSize = (8.0 / 160.0) * uUnit * depth * grow * (0.7 + 0.6 * aAura.z);
  vAlpha = (1.0 - life) * uIntro * (1.0 - uName) * uMotion * 0.5;
}
`;

export const AURA_FRAGMENT = /* glsl */ `#version 300 es
precision mediump float;

in float vAlpha;
out vec4 outColor;

float dot2(vec2 v) { return dot(v, v); }

// Inigo Quilez's exact heart distance: tip at the origin, lobes near y = 1.
float heart(vec2 p) {
  p.x = abs(p.x);
  if (p.y + p.x > 1.0) return sqrt(dot2(p - vec2(0.25, 0.75))) - sqrt(2.0) / 4.0;
  return sqrt(min(dot2(p - vec2(0.0, 1.0)), dot2(p - 0.5 * max(p.x + p.y, 0.0)))) * sign(p.x - p.y);
}

void main() {
  vec2 p = vec2(gl_PointCoord.x - 0.5, 1.0 - gl_PointCoord.y) * vec2(1.35, 1.2) - vec2(0.0, 0.08);
  float d = heart(p);
  float a = (smoothstep(0.03, -0.03, d) + exp(-max(d, 0.0) * 14.0) * 0.25) * vAlpha;
  // #ea80b0, the 2025 heart's pink.
  outColor = vec4(vec3(0.918, 0.502, 0.69) * a, a);
}
`;

export const STAR_VERTEX = /* glsl */ `#version 300 es
precision highp float;

layout(location = 0) in vec4 aStar;

uniform float uTime;
uniform float uPixelRatio;
uniform float uMotion;

out float vAlpha;

void main() {
  gl_Position = vec4(aStar.xy, 0.0, 1.0);
  gl_PointSize = (0.8 + aStar.z * 1.8) * uPixelRatio;
  vAlpha = (0.2 + 0.5 * aStar.z) * (0.7 + 0.3 * sin(uTime * (0.5 + aStar.w * 1.6) * uMotion + aStar.w * 40.0));
}
`;

export const STAR_FRAGMENT = /* glsl */ `#version 300 es
precision mediump float;

in float vAlpha;
out vec4 outColor;

void main() {
  float d = length(gl_PointCoord - 0.5) * 2.0;
  float a = exp(-d * d * 5.0) * smoothstep(1.0, 0.6, d) * vAlpha;
  outColor = vec4(vec3(1.0, 0.94, 0.97) * a, a);
}
`;
