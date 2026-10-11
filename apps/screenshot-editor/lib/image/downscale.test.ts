import { describe, expect, it } from "vitest";
import { planDownscaleSteps } from "./downscale";

describe("planDownscaleSteps", () => {
  it("does nothing when the image is small enough", () => {
    expect(planDownscaleSteps(3200, 2000, 3200)).toEqual([]);
    expect(planDownscaleSteps(800, 600, 3200)).toEqual([]);
  });

  it("halves while it can, then resizes to the exact target", () => {
    expect(planDownscaleSteps(10000, 6000, 3200)).toEqual([
      { width: 5000, height: 3000 },
      { width: 3200, height: 1920 },
    ]);
  });

  it("does not repeat the target when halving lands on it", () => {
    expect(planDownscaleSteps(6400, 4000, 3200)).toEqual([
      { width: 3200, height: 2000 },
    ]);
  });

  it("handles tall images and a single final step", () => {
    expect(planDownscaleSteps(1000, 4000, 3200)).toEqual([
      { width: 800, height: 3200 },
    ]);
  });
});
