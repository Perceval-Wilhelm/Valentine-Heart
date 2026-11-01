import { describe, expect, it } from "vitest";
import { arcLengthTable, createRandom, heartPath, heartPoint, pillow, sampleHeart } from "./geometry";

describe("heartPoint", () => {
  it("keeps the 2025 curve: cusp on top, tip at the bottom, one unit to each side", () => {
    const [cuspX, cuspY] = heartPoint(0);
    const [tipX, tipY] = heartPoint(Math.PI);
    expect(cuspX).toBeCloseTo(0);
    expect(cuspY).toBeCloseTo(7.5 / 16);
    expect(tipX).toBeCloseTo(0);
    expect(tipY).toBeCloseTo(-14.5 / 16);
    expect(heartPoint(Math.PI / 2)[0]).toBeCloseTo(1);
  });

  it("is star-shaped around the origin, so every wedge fill and outward direction is well defined", () => {
    let previous = Math.PI / 2;
    for (let i = 1; i < 500; i++) {
      const [x, y] = heartPoint((i / 500) * Math.PI);
      const angle = Math.atan2(y, x);
      expect(angle).toBeLessThan(previous);
      previous = angle;
    }
  });
});

describe("sampleHeart", () => {
  const count = 4000;
  const { positions, glow } = sampleHeart(count, 5);

  it("is deterministic for a seed", () => {
    expect(sampleHeart(50, 5).positions).toEqual(sampleHeart(50, 5).positions);
    expect(sampleHeart(50, 6).positions).not.toEqual(sampleHeart(50, 5).positions);
  });

  it("puts the rim on the outline and everything else inside a puffy shell", () => {
    let rim = 0;
    for (let i = 0; i < count; i++) {
      const [x, y, z] = [positions[i * 3], positions[i * 3 + 1], positions[i * 3 + 2]];
      expect(Math.abs(x)).toBeLessThanOrEqual(1.12);
      expect(Math.abs(y)).toBeLessThanOrEqual(1.02);
      expect(Math.abs(z)).toBeLessThanOrEqual(0.42 * 1.03 + 1e-6);
      if (glow[i] === 1) {
        rim += 1;
        expect(Math.abs(z)).toBeLessThanOrEqual(0.04);
      }
    }
    expect(rim / count).toBeGreaterThan(0.12);
    expect(rim / count).toBeLessThan(0.2);
  });
});

describe("arcLengthTable", () => {
  it("spaces outline points by length, so no part of the curve crowds", () => {
    const table = arcLengthTable(64);
    expect(table).toHaveLength(65);
    expect(table[0]).toBe(0);
    expect(table[64]).toBeCloseTo(Math.PI * 2);
    const steps = Array.from({ length: 64 }, (_, i) => {
      const [ax, ay] = heartPoint(table[i]);
      const [bx, by] = heartPoint(table[i + 1]);
      return Math.hypot(bx - ax, by - ay);
    });
    const mean = steps.reduce((sum, step) => sum + step, 0) / steps.length;
    for (const step of steps) expect(Math.abs(step - mean) / mean).toBeLessThan(0.05);
  });
});

describe("helpers", () => {
  it("draws a closed SVG path", () => {
    const path = heartPath(10);
    expect(path.startsWith("M")).toBe(true);
    expect(path.endsWith("Z")).toBe(true);
    expect(path.match(/[ML]/g)).toHaveLength(10);
  });

  it("makes the heart thickest in the middle and flat at the edge", () => {
    expect(pillow(0)).toBe(1);
    expect(pillow(1)).toBe(0);
    expect(pillow(0.5)).toBeGreaterThan(pillow(0.9));
  });

  it("returns random numbers in [0, 1)", () => {
    const random = createRandom(1);
    for (let i = 0; i < 1000; i++) {
      const value = random();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });
});
