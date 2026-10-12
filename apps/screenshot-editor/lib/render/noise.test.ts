import { describe, expect, it } from "vitest";
import {
  getNoiseTile,
  NOISE_MAX_OPACITY,
  NOISE_TILE_SIZE,
  noiseOpacity,
  noiseTileValues,
} from "./noise";
import { createRandom } from "./random";

describe("createRandom", () => {
  it("repeats the same sequence for the same seed", () => {
    const a = createRandom(42);
    const b = createRandom(42);
    const first = Array.from({ length: 5 }, a);
    expect(Array.from({ length: 5 }, b)).toEqual(first);
    expect(Array.from({ length: 5 }, createRandom(43))).not.toEqual(first);
  });

  it("stays in [0, 1)", () => {
    const random = createRandom(7);
    for (let i = 0; i < 10_000; i += 1) {
      const value = random();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });
});

describe("noiseTileValues", () => {
  it("is the same tile every time, so exports don't change between runs", () => {
    const tile = noiseTileValues();
    expect(tile).toHaveLength(NOISE_TILE_SIZE * NOISE_TILE_SIZE);
    expect(noiseTileValues()).toEqual(tile);
    // Pinned: a different tile would change every exported image with noise.
    expect([...tile.slice(0, 8)]).toEqual([
      188, 40, 150, 34, 226, 176, 138, 140,
    ]);
    let hash = 0;
    for (const value of tile) hash = (Math.imul(hash, 31) + value) >>> 0;
    expect(hash).toBe(3153737164);
  });

  it("uses the whole grey range and averages mid-grey", () => {
    const tile = noiseTileValues();
    const mean = tile.reduce((sum, value) => sum + value, 0) / tile.length;
    expect(Math.min(...tile)).toBe(0);
    expect(Math.max(...tile)).toBe(255);
    expect(mean).toBeGreaterThan(125);
    expect(mean).toBeLessThan(130);
  });

  it("depends on the seed", () => {
    expect(noiseTileValues(16, 1)).not.toEqual(noiseTileValues(16, 2));
  });
});

describe("noiseOpacity", () => {
  it("scales the amount to the maximum opacity and clamps it", () => {
    expect(noiseOpacity(0)).toBe(0);
    expect(noiseOpacity(1)).toBeCloseTo(NOISE_MAX_OPACITY);
    expect(noiseOpacity(0.5)).toBeCloseTo(0.175);
    expect(noiseOpacity(3)).toBeCloseTo(NOISE_MAX_OPACITY);
  });
});

it("getNoiseTile needs a DOM", () => {
  expect(getNoiseTile()).toBeNull();
});
