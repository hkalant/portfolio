import { describe, expect, it } from "vitest";
import { MAX_CANVAS_AREA, MAX_CANVAS_SIDE } from "@/lib/design/limits";
import { exportPixelSize, safePixelRatio } from "./limits";

describe("safePixelRatio", () => {
  it("keeps the wanted ratio when it fits", () => {
    expect(safePixelRatio({ width: 1600, height: 900 }, 2)).toBe(2);
    expect(safePixelRatio({ width: 1000, height: 1000 }, 4)).toBe(4);
  });

  it("caps the area for big canvases", () => {
    const size = { width: 1600, height: 900 };
    const ratio = safePixelRatio(size, 4);
    expect(ratio).toBeLessThan(4);
    const out = exportPixelSize(size, ratio);
    expect(out.width * out.height).toBeLessThanOrEqual(MAX_CANVAS_AREA);
    expect(ratio).toBeCloseTo(3.413, 2);
  });

  it("caps very long sides", () => {
    const size = { width: 4000, height: 100 };
    const ratio = safePixelRatio(size, 4);
    expect(exportPixelSize(size, ratio).width).toBeLessThanOrEqual(
      MAX_CANVAS_SIDE,
    );
  });
});

describe("exportPixelSize", () => {
  it("floors like Konva", () => {
    expect(exportPixelSize({ width: 1328, height: 878 }, 2)).toEqual({
      width: 2656,
      height: 1756,
    });
    expect(exportPixelSize({ width: 333, height: 333 }, 1.5)).toEqual({
      width: 499,
      height: 499,
    });
  });
});
