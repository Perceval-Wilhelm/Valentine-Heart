/** A resting heart: 66 beats a minute, each a "lub" followed by a softer "dub". */
export const BPM = 66;
export const PERIOD = 60 / BPM;
export const LUB = 0.04;
export const DUB = 0.3;

/** A pulse that rises quickly and falls slowly, like a heart sound. */
function pulse(x: number, center: number, rise: number, fall: number) {
  const d = x - center;
  const width = d < 0 ? rise : fall;
  return Math.exp(-(d * d) / (width * width));
}

/** Seconds into the current beat, for `time` seconds since the heart started. */
export function beatPhase(time: number) {
  return ((time % PERIOD) + PERIOD) % PERIOD;
}

/** How hard the heart is beating at `time` (0 at rest, 1 at the lub). */
export function beat(time: number) {
  const x = beatPhase(time);
  // The previous beat's tail and the next beat's onset also count, so the curve stays continuous.
  const lub = pulse(x, LUB, 0.025, 0.09) + pulse(x - PERIOD, LUB, 0.025, 0.09) + pulse(x + PERIOD, LUB, 0.025, 0.09);
  const dub = pulse(x, DUB, 0.03, 0.11) + pulse(x - PERIOD, DUB, 0.03, 0.11);
  return Math.min(1, lub + 0.55 * dub);
}

/** Seconds since the most recent lub, which sends a ripple of light across the heart. */
export function sinceLub(time: number) {
  const x = beatPhase(time) - LUB;
  return x >= 0 ? x : x + PERIOD;
}

/** Which heart sounds fall in the frame from `previous` to `time` (both seconds since the heart started). */
export function soundsBetween(previous: number, time: number): ("lub" | "dub")[] {
  if (time <= previous || time - previous > PERIOD) return [];
  const sounds: { at: number; kind: "lub" | "dub" }[] = [];
  const first = Math.floor(previous / PERIOD);
  for (let n = first; n <= first + 1; n++) {
    for (const [offset, kind] of [
      [LUB, "lub"],
      [DUB, "dub"],
    ] as const) {
      const at = n * PERIOD + offset;
      if (at > previous && at <= time) sounds.push({ at, kind });
    }
  }
  return sounds.sort((a, b) => a.at - b.at).map((sound) => sound.kind);
}

/** Smooth 0 → 1 easing with gentle ends. */
export function smooth(x: number) {
  const t = Math.min(1, Math.max(0, x));
  return t * t * (3 - 2 * t);
}
