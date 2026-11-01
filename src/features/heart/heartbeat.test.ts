import { describe, expect, it } from "vitest";
import { beat, DUB, LUB, PERIOD, sinceLub, smooth, soundsBetween } from "./heartbeat";

describe("beat", () => {
  it("beats lub, then a softer dub, then rests", () => {
    expect(beat(LUB)).toBeCloseTo(1, 1);
    expect(beat(DUB)).toBeGreaterThan(0.5);
    expect(beat(DUB)).toBeLessThan(beat(LUB));
    expect(beat(0.7)).toBeLessThan(0.05);
  });

  it("repeats every beat and stays between 0 and 1", () => {
    for (let t = 0; t < 3; t += 0.013) {
      expect(beat(t)).toBeGreaterThanOrEqual(0);
      expect(beat(t)).toBeLessThanOrEqual(1);
      expect(beat(t + PERIOD)).toBeCloseTo(beat(t), 6);
    }
  });
});

describe("sinceLub", () => {
  it("counts from the most recent lub", () => {
    expect(sinceLub(LUB)).toBeCloseTo(0);
    expect(sinceLub(LUB + 0.2)).toBeCloseTo(0.2);
    expect(sinceLub(LUB - 0.01)).toBeCloseTo(PERIOD - 0.01);
  });
});

describe("soundsBetween", () => {
  it("reports each heart sound in the frame where it happens", () => {
    expect(soundsBetween(0, LUB + 0.001)).toEqual(["lub"]);
    expect(soundsBetween(LUB, DUB)).toEqual(["dub"]);
    expect(soundsBetween(0, DUB + 0.01)).toEqual(["lub", "dub"]);
    expect(soundsBetween(PERIOD - 0.01, PERIOD + LUB + 0.01)).toEqual(["lub"]);
  });

  it("stays quiet when nothing happens, time runs backwards or a long pause is skipped", () => {
    expect(soundsBetween(0.5, 0.6)).toEqual([]);
    expect(soundsBetween(0.6, 0.5)).toEqual([]);
    expect(soundsBetween(0, PERIOD * 3)).toEqual([]);
  });
});

describe("smooth", () => {
  it("eases from 0 to 1 and clamps outside", () => {
    expect(smooth(-1)).toBe(0);
    expect(smooth(0.5)).toBe(0.5);
    expect(smooth(2)).toBe(1);
  });
});
