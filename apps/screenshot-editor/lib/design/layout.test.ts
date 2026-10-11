import { describe, expect, it } from "vitest";
import {
  computeLayout,
  computePreviewScale,
  fitWithin,
  MIN_PREVIEW_SCALE,
} from "./layout";
import {
  EXPORT_SCALE,
  MAX_CANVAS_AREA,
  MAX_CANVAS_SIDE,
  MAX_DESIGN_SIDE,
  PADDING,
} from "./limits";

describe("fitWithin", () => {
  it("never enlarges", () => {
    expect(fitWithin({ width: 800, height: 600 }, 1600)).toEqual({
      width: 800,
      height: 600,
    });
  });

  it("shrinks the longest side to the limit", () => {
    expect(fitWithin({ width: 3200, height: 2000 }, 1600)).toEqual({
      width: 1600,
      height: 1000,
    });
    expect(fitWithin({ width: 900, height: 2880 }, 1600)).toEqual({
      width: 500,
      height: 1600,
    });
  });

  it("rounds to whole pixels and keeps very thin images at least 1px", () => {
    expect(fitWithin({ width: 2999, height: 1001 }, 1600)).toEqual({
      width: 1600,
      height: 534,
    });
    expect(fitWithin({ width: 10000, height: 2 }, 1600)).toEqual({
      width: 1600,
      height: 1,
    });
  });
});

describe("computeLayout", () => {
  it("adds padding on every side", () => {
    const layout = computeLayout({ width: 1200, height: 750 }, 64, 12);
    expect(layout.canvas).toEqual({ width: 1328, height: 878 });
    expect(layout.imageRect).toEqual({
      x: 64,
      y: 64,
      width: 1200,
      height: 750,
    });
    expect(layout.radius).toBe(12);
  });

  it("fits large screenshots before padding", () => {
    const layout = computeLayout({ width: 4000, height: 2500 }, 64, 12);
    expect(layout.canvas).toEqual({ width: 1728, height: 1128 });
  });

  it("caps the radius at half the shorter side", () => {
    expect(computeLayout({ width: 40, height: 20 }, 0, 64).radius).toBe(10);
  });

  it("keeps every possible M1 export inside browser canvas limits", () => {
    const side = MAX_DESIGN_SIDE + 2 * PADDING.max;
    expect(side * EXPORT_SCALE).toBeLessThanOrEqual(MAX_CANVAS_SIDE);
    expect((side * EXPORT_SCALE) ** 2).toBeLessThanOrEqual(MAX_CANVAS_AREA);
  });
});

describe("computePreviewScale", () => {
  it("never goes above 1", () => {
    expect(
      computePreviewScale(
        { width: 4000, height: 4000 },
        { width: 400, height: 300 },
      ),
    ).toBe(1);
  });

  it("fits the canvas inside the container minus the margin", () => {
    expect(
      computePreviewScale(
        { width: 864, height: 2000 },
        { width: 1600, height: 1000 },
        32,
      ),
    ).toBe(0.5);
    expect(
      computePreviewScale(
        { width: 2000, height: 564 },
        { width: 1600, height: 1000 },
        32,
      ),
    ).toBe(0.5);
  });

  it("returns the minimum for tiny or unmeasured containers", () => {
    expect(
      computePreviewScale({ width: 0, height: 0 }, { width: 100, height: 100 }),
    ).toBe(MIN_PREVIEW_SCALE);
    expect(
      computePreviewScale(
        { width: 70, height: 70 },
        { width: 10000, height: 10000 },
      ),
    ).toBe(MIN_PREVIEW_SCALE);
  });
});
