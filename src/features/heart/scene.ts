import { arcLengthTable, createRandom, sampleHeart } from "./geometry";
import { beat, sinceLub, smooth, soundsBetween } from "./heartbeat";
import { AURA_FRAGMENT, AURA_VERTEX, PARTICLE_FRAGMENT, PARTICLE_VERTEX, STAR_FRAGMENT, STAR_VERTEX } from "./shaders";
import { sampleText } from "./text-points";

export type Phase = "intro" | "heart" | "name";
/** Heart centre and width, in CSS pixels relative to the canvas. */
export type Layout = { x: number; y: number; size: number };

export type SceneOptions = {
  reducedMotion: boolean;
  name: string;
  /** CSS font used to write the name in particles. */
  font: string;
  onPhase: (phase: Phase) => void;
  onSound: (kind: "lub" | "dub") => void;
  /** Called every frame with the heartbeat (0–1) and how much of the heart is showing (0–1). */
  onFrame?: (beat: number, presence: number) => void;
};

export type HeartScene = {
  layout: (layout: Layout) => void;
  pointer: (x: number, y: number, active: boolean) => void;
  burst: () => void;
  holdName: (on: boolean) => void;
  replay: () => void;
  setReducedMotion: (reduced: boolean) => void;
  dispose: () => void;
};

const DUST = 0.6; // seconds of drifting stardust before it is called in
const INTRO = 2.8; // seconds for the stardust to become the heart
const NAME_TRAVEL = 1.5; // seconds for the heart to become the name, or back
const AUTO_NAME_AFTER = 5; // the heart writes the name once by itself, this long after forming
const AUTO_NAME_HOLD = 3.2;
const NO_BURST = 1e3;

type Program = { program: WebGLProgram; uniforms: Map<string, WebGLUniformLocation> };

export function createHeartScene(canvas: HTMLCanvasElement, options: SceneOptions): HeartScene | null {
  const context = canvas.getContext("webgl2", {
    alpha: true,
    antialias: false,
    depth: false,
    stencil: false,
    premultipliedAlpha: true,
    powerPreference: "high-performance",
  });
  if (!context) return null;
  // A typed alias, because the null check above does not narrow inside the hoisted helpers below.
  const gl: WebGL2RenderingContext = context;

  const small = Math.min(screen.width, screen.height) < 600;
  const modest = small || (navigator.hardwareConcurrency ?? 4) <= 4;
  const heartCount = modest ? 12000 : 18000;
  const auraCount = small ? 450 : 800;
  const starCount = small ? 350 : 700;

  // Particle data is built once and kept, so a lost GPU context can be rebuilt from it.
  const heart = sampleHeart(heartCount);
  const random = createRandom(7);
  const starts = new Float32Array(heartCount * 2).map(() => random() * 2.3 - 1.15);
  const seeds = new Float32Array(heartCount * 4).map(() => random());
  // Until the font is ready, the "name" is the heart itself.
  const texts = new Float32Array(heartCount * 2).map((_, i) => heart.positions[Math.floor(i / 2) * 3 + (i % 2)]);
  // Per aura heart: where on the outline it starts (0–1 by length), its phase, and a size/depth jitter.
  const aura = new Float32Array(auraCount * 3).map(() => random());
  const arc = arcLengthTable();
  const stars = new Float32Array(starCount * 4).map((_, i) => (i % 4 < 2 ? random() * 2 - 1 : random()));

  let resources = build(gl);
  let textBuffer = resources.buffers.text;
  let drawCount = heartCount;
  let reduced = options.reducedMotion;
  let lost = false;
  let disposed = false;
  let frame = 0;

  // Scene time, in seconds, advanced by clamped frame steps so a hidden tab resumes where it paused.
  let clock = 0;
  let last = -1;
  let introStart = reduced ? -INTRO - DUST : 0;
  let formedAt = -1;
  let nameValue = 0;
  let nameTarget = 0;
  let autoNameUntil = -1;
  let autoNamed = false;
  let touched = false;
  let burstAt = -NO_BURST;
  let previousBeat = 0;
  let phase: Phase = "intro";
  const pointer = { x: 0, y: 0, strength: 0, target: 0, turnX: 0, turnY: 0 };
  let view = { width: 1, height: 1, ratio: 1, x: 0, y: 0, unit: 1, size: 1 };
  const frames: number[] = [];

  void writeName();

  async function writeName() {
    try {
      await document.fonts.load(options.font, options.name);
    } catch {
      // Draw with the fallback font rather than not at all.
    }
    if (disposed) return;
    // A little narrower than the heart, so the name keeps a margin on a phone.
    const points = sampleText(options.name, options.font, 1.9, 0.9);
    if (points.length === 0) return;
    const count = points.length / 2;
    const pick = createRandom(21);
    for (let i = 0; i < heartCount; i++) {
      const j = Math.floor(pick() * count);
      texts[i * 2] = points[j * 2] + (pick() - 0.5) * 0.012;
      texts[i * 2 + 1] = points[j * 2 + 1] + (pick() - 0.5) * 0.012;
    }
    if (lost) return;
    gl.bindBuffer(gl.ARRAY_BUFFER, textBuffer);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, texts);
  }

  function build(context: WebGL2RenderingContext) {
    const particles = link(context, PARTICLE_VERTEX, PARTICLE_FRAGMENT);
    const auraProgram = link(context, AURA_VERTEX, AURA_FRAGMENT);
    const starProgram = link(context, STAR_VERTEX, STAR_FRAGMENT);

    const heartVao = context.createVertexArray();
    context.bindVertexArray(heartVao);
    const text = attribute(context, 2, 2, texts, context.DYNAMIC_DRAW);
    const all = [
      text,
      attribute(context, 0, 2, starts),
      attribute(context, 1, 3, heart.positions),
      attribute(context, 3, 4, seeds),
      attribute(context, 4, 1, heart.glow),
    ];

    const auraVao = context.createVertexArray();
    context.bindVertexArray(auraVao);
    all.push(attribute(context, 0, 3, aura));

    const starVao = context.createVertexArray();
    context.bindVertexArray(starVao);
    all.push(attribute(context, 0, 4, stars));
    context.bindVertexArray(null);

    context.enable(context.BLEND);
    context.blendFunc(context.ONE, context.ONE);
    context.clearColor(0, 0, 0, 0);
    return {
      particles,
      aura: auraProgram,
      stars: starProgram,
      vaos: { heart: heartVao, aura: auraVao, stars: starVao },
      buffers: { text, all },
    };
  }

  function render(now: number) {
    frame = 0;
    if (disposed || lost) return;
    const seconds = now / 1000;
    const step = last < 0 ? 0 : Math.min(seconds - last, 0.1);
    last = seconds;
    clock += step;
    measure(step);

    const intro = Math.min(1, Math.max(0, (clock - introStart - DUST) / INTRO));
    if (intro >= 1 && formedAt < 0) formedAt = clock;
    const formed = formedAt >= 0;

    if (formed && !autoNamed && !touched && !reduced && clock - formedAt > AUTO_NAME_AFTER) {
      autoNamed = true;
      nameTarget = 1;
      autoNameUntil = clock + NAME_TRAVEL + AUTO_NAME_HOLD;
    }
    if (autoNameUntil >= 0 && clock > autoNameUntil) {
      autoNameUntil = -1;
      nameTarget = 0;
    }
    nameValue = reduced
      ? nameTarget
      : nameValue + Math.sign(nameTarget - nameValue) * Math.min(Math.abs(nameTarget - nameValue), step / NAME_TRAVEL);

    const next: Phase = !formed ? "intro" : nameTarget > 0 ? "name" : "heart";
    if (next !== phase) {
      phase = next;
      options.onPhase(phase);
    }

    const beatTime = formed ? clock - formedAt : 0;
    if (formed) for (const sound of soundsBetween(previousBeat, beatTime)) options.onSound(sound);
    previousBeat = beatTime;

    const ease = 1 - Math.exp(-step * 8);
    pointer.strength += (pointer.target - pointer.strength) * ease;
    const motion = reduced ? 0 : 1;
    const turnX = motion * (Math.sin(clock * 0.33) * 0.36 + pointer.turnX * 0.3);
    const turnY = motion * (-0.06 + Math.sin(clock * 0.27) * 0.05 - pointer.turnY * 0.16);

    gl.viewport(0, 0, view.width, view.height);
    gl.clear(gl.COLOR_BUFFER_BIT);
    const { particles, aura, stars: starProgram, vaos } = resources;

    prepare(starProgram, { uTime: clock, uPixelRatio: view.ratio, uMotion: motion });
    gl.bindVertexArray(vaos.stars);
    gl.drawArrays(gl.POINTS, 0, starCount);

    const heartbeat = formed ? beat(beatTime) * (1 - nameValue) : 0;
    options.onFrame?.(heartbeat * motion, smooth(intro) * (1 - nameValue));

    const common = {
      uResolution: [view.width, view.height],
      uCenter: [view.x, view.y],
      uUnit: view.unit,
      uTime: clock,
      uIntro: smooth(intro),
      uName: nameValue,
      uBeat: heartbeat,
      uTurn: [turnX, turnY],
      uMotion: motion,
    };
    prepare(aura, { ...common, "uArc[0]": arc });
    gl.bindVertexArray(vaos.aura);
    gl.drawArrays(gl.POINTS, 0, auraCount);

    prepare(particles, {
      ...common,
      uIntro: intro,
      uRing: formed ? sinceLub(beatTime) : 99,
      uBurst: clock - burstAt,
      uPointer: [pointer.x, pointer.y, pointer.strength * motion],
      uPixelRatio: view.ratio,
    });
    gl.bindVertexArray(vaos.heart);
    gl.drawArrays(gl.POINTS, 0, drawCount);
    gl.bindVertexArray(null);

    // Reduced motion draws only while something changes, then rests until the next interaction.
    const settled = reduced && nameValue === nameTarget && clock - burstAt > 1.5 && Math.abs(pointer.strength) < 0.01;
    if (!settled) frame = requestAnimationFrame(render);
  }

  /** After the heart forms, thin the particles once if the device cannot keep up. */
  function measure(step: number) {
    if (formedAt < 0 || frames.length > 90 || step === 0) return;
    frames.push(step);
    if (frames.length === 90) {
      const average = frames.reduce((sum, value) => sum + value, 0) / frames.length;
      if (average > 1 / 40) drawCount = Math.max(4000, Math.floor(drawCount * 0.6));
    }
  }

  function prepare(program: Program, values: Record<string, number | number[] | Float32Array>) {
    gl.useProgram(program.program);
    for (const [name, value] of Object.entries(values)) {
      const location = program.uniforms.get(name);
      if (!location) continue;
      if (typeof value === "number") gl.uniform1f(location, value);
      else if (value instanceof Float32Array) gl.uniform1fv(location, value);
      else if (value.length === 2) gl.uniform2fv(location, value);
      else gl.uniform3fv(location, value);
    }
  }

  function wake() {
    if (!frame && !disposed && !lost) frame = requestAnimationFrame(render);
  }

  function onLost(event: Event) {
    event.preventDefault();
    lost = true;
    cancelAnimationFrame(frame);
    frame = 0;
  }

  function onRestored() {
    lost = false;
    resources = build(gl);
    textBuffer = resources.buffers.text;
    last = -1;
    wake();
  }

  /** Frees GPU memory but keeps the context, which React's development remount reuses. */
  function release() {
    const { particles, aura: auraProgram, stars: starProgram, vaos, buffers } = resources;
    for (const program of [particles, auraProgram, starProgram]) gl.deleteProgram(program.program);
    for (const vao of Object.values(vaos)) gl.deleteVertexArray(vao);
    for (const buffer of buffers.all) gl.deleteBuffer(buffer);
  }

  canvas.addEventListener("webglcontextlost", onLost);
  canvas.addEventListener("webglcontextrestored", onRestored);
  wake();

  return {
    layout({ x, y, size }) {
      const ratio = Math.min(devicePixelRatio || 1, 2);
      const width = Math.max(1, Math.round(canvas.clientWidth * ratio));
      const height = Math.max(1, Math.round(canvas.clientHeight * ratio));
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }
      // WebGL measures y from the bottom; the page measures it from the top.
      view = { width, height, ratio, x: x * ratio, y: height - y * ratio, unit: (size / 2) * ratio, size };
      wake();
    },
    pointer(x, y, active) {
      const ratio = view.ratio;
      pointer.x = x * ratio;
      pointer.y = view.height - y * ratio;
      pointer.target = active ? 1 : 0;
      const clamp = (value: number) => Math.max(-1, Math.min(1, value));
      pointer.turnX = active ? clamp((x * ratio - view.x) / (view.unit * 2)) : 0;
      pointer.turnY = active ? clamp((view.height - y * ratio - view.y) / (view.unit * 2)) : 0;
      wake();
    },
    burst() {
      touched = true;
      burstAt = clock;
      wake();
    },
    holdName(on) {
      touched = true;
      autoNameUntil = -1;
      nameTarget = on && formedAt >= 0 ? 1 : 0;
      wake();
    },
    replay() {
      introStart = reduced ? clock - INTRO - DUST : clock;
      formedAt = -1;
      nameTarget = 0;
      nameValue = 0;
      autoNamed = false;
      autoNameUntil = -1;
      touched = false;
      burstAt = -NO_BURST;
      previousBeat = 0;
      wake();
    },
    setReducedMotion(value) {
      reduced = value;
      if (reduced && formedAt < 0) introStart = clock - INTRO - DUST;
      if (reduced) autoNameUntil = -1;
      wake();
    },
    dispose() {
      disposed = true;
      cancelAnimationFrame(frame);
      canvas.removeEventListener("webglcontextlost", onLost);
      canvas.removeEventListener("webglcontextrestored", onRestored);
      if (!lost) release();
    },
  };
}

function compile(gl: WebGL2RenderingContext, type: number, source: string) {
  const shader = gl.createShader(type)!;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS) && !gl.isContextLost())
    throw new Error(`Heart shader failed to compile: ${gl.getShaderInfoLog(shader)}`);
  return shader;
}

function link(gl: WebGL2RenderingContext, vertex: string, fragment: string): Program {
  const program = gl.createProgram();
  gl.attachShader(program, compile(gl, gl.VERTEX_SHADER, vertex));
  gl.attachShader(program, compile(gl, gl.FRAGMENT_SHADER, fragment));
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS) && !gl.isContextLost())
    throw new Error(`Heart shader failed to link: ${gl.getProgramInfoLog(program)}`);
  const uniforms = new Map<string, WebGLUniformLocation>();
  const count = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS) as number;
  for (let i = 0; i < count; i++) {
    const info = gl.getActiveUniform(program, i);
    const location = info && gl.getUniformLocation(program, info.name);
    if (info && location) uniforms.set(info.name, location);
  }
  return { program, uniforms };
}

function attribute(gl: WebGL2RenderingContext, location: number, size: number, data: Float32Array, usage?: number) {
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, data, usage ?? gl.STATIC_DRAW);
  gl.enableVertexAttribArray(location);
  gl.vertexAttribPointer(location, size, gl.FLOAT, false, 0, 0);
  return buffer;
}
