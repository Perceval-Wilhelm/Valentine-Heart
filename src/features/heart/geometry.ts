/** Small seeded PRNG (mulberry32), so every build draws the same heart. */
export function createRandom(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * The heart curve from the 2025 page (x = 16 sin³t, y = 13 cos t − 5 cos 2t − 2 cos 3t − cos 4t),
 * divided by 16 so x spans [-1, 1]. The +2.5 is the 2025 page's +25, which centres it vertically.
 */
export function heartPoint(t: number): [number, number] {
  const x = Math.sin(t) ** 3;
  const y = (13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t) + 2.5) / 16;
  return [x, y];
}

/** The outline as an SVG path in heart units, with y flipped because SVG's y axis points down. */
export function heartPath(points = 72) {
  let path = "";
  for (let i = 0; i < points; i++) {
    const [x, y] = heartPoint((i / points) * Math.PI * 2);
    path += `${i ? "L" : "M"}${x.toFixed(3)} ${(-y).toFixed(3)}`;
  }
  return `${path}Z`;
}

const SEGMENTS = 2048;

type Table = { t: Float64Array; cdf: Float64Array };

/** Cumulative tables over the curve: by arc length (even outlines) and by wedge area (even fills). */
function buildTables(): { arc: Table; area: Table } {
  const t = new Float64Array(SEGMENTS + 1);
  const arc = new Float64Array(SEGMENTS + 1);
  const area = new Float64Array(SEGMENTS + 1);
  let [px, py] = heartPoint(0);
  for (let i = 1; i <= SEGMENTS; i++) {
    t[i] = (i / SEGMENTS) * Math.PI * 2;
    const [x, y] = heartPoint(t[i]);
    arc[i] = arc[i - 1] + Math.hypot(x - px, y - py);
    // The heart is star-shaped around the origin, so wedges from it tile the whole shape.
    area[i] = area[i - 1] + Math.abs(px * y - py * x) / 2;
    px = x;
    py = y;
  }
  return { arc: { t, cdf: arc }, area: { t, cdf: area } };
}

let tables: ReturnType<typeof buildTables> | undefined;

/** Picks a curve parameter so that `u` in [0, 1) is spread evenly by the table's measure. */
function pick(table: Table, u: number) {
  const { t, cdf } = table;
  const target = u * cdf[SEGMENTS];
  let low = 0;
  let high = SEGMENTS;
  while (high - low > 1) {
    const mid = (low + high) >> 1;
    if (cdf[mid] < target) low = mid;
    else high = mid;
  }
  const span = cdf[high] - cdf[low] || 1;
  return t[low] + ((target - cdf[low]) / span) * (t[high] - t[low]);
}

/**
 * Curve parameters at `count` equal steps of arc length (plus the closing 2π), so the GPU can turn an
 * even 0–1 position along the outline into a point without crowding the cusp and the tip.
 */
export function arcLengthTable(count = 64) {
  tables ??= buildTables();
  const table = new Float32Array(count + 1);
  for (let i = 0; i < count; i++) table[i] = pick(tables.arc, i / count);
  table[count] = Math.PI * 2;
  return table;
}

/** Thickness of the puffy heart at fraction `r` of the way from its centre to its outline. */
export function pillow(r: number) {
  return Math.sqrt(Math.max(0, 1 - Math.min(1, r) ** 3));
}

export type HeartSample = {
  /** x, y, z per particle, in heart units (the outline spans x ∈ [-1, 1]). */
  positions: Float32Array;
  /** Brightness weight per particle: the rim glows most, the inside least. */
  glow: Float32Array;
};

/**
 * Samples a puffy 3D heart: a bright rim that draws the silhouette, a front-and-back shell that gives it
 * volume when it turns, and a dim fill inside.
 */
export function sampleHeart(count: number, seed = 14, depth = 0.42): HeartSample {
  tables ??= buildTables();
  const random = createRandom(seed);
  const positions = new Float32Array(count * 3);
  const glow = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    const kind = random();
    let x: number;
    let y: number;
    let z: number;
    if (kind < 0.16) {
      // Rim: spread by arc length, so the cusp and tip are no denser than the lobes.
      const [ox, oy] = heartPoint(pick(tables.arc, random()));
      const r = 1 + Math.abs(gaussian(random)) * 0.022;
      x = ox * r;
      y = oy * r;
      z = (random() - 0.5) * 0.08;
      glow[i] = 1;
    } else {
      // Shell and fill: spread by area, so the inside is evenly covered.
      const [ox, oy] = heartPoint(pick(tables.area, random()));
      const shell = kind < 0.76;
      const r = Math.sqrt(random()) * (shell ? 0.995 : 0.96);
      const thickness = depth * pillow(r);
      x = ox * r;
      y = oy * r;
      z = shell ? (random() < 0.5 ? -1 : 1) * thickness * (0.95 + random() * 0.08) : (random() * 2 - 1) * thickness;
      glow[i] = shell ? 0.5 + random() * 0.25 : 0.22;
    }
    positions[i * 3] = x;
    positions[i * 3 + 1] = y;
    positions[i * 3 + 2] = z;
  }
  return { positions, glow };
}

/** Standard normal sample (Box–Muller). */
function gaussian(random: () => number) {
  return Math.sqrt(-2 * Math.log(1 - random())) * Math.cos(2 * Math.PI * random());
}
