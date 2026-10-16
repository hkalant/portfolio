import { describe, expect, it } from "vitest";
import { clampMagnifyZoom, magnifyArea } from "./magnify";

describe("magnifyArea", () => {
  it("enlarges the middle of the box", () => {
    const area = magnifyArea(
      { x: 0.2, y: 0.1, width: 0.2, height: 0.1 },
      2,
      0.6,
    );
    expect(area.x).toBeCloseTo(0.25);
    expect(area.y).toBeCloseTo(0.125);
    expect(area.width).toBeCloseTo(0.1);
    expect(area.height).toBeCloseTo(0.05);
  });

  it("stays on the screenshot near its edges", () => {
    const area = magnifyArea(
      { x: 0.9, y: -0.1, width: 0.2, height: 0.2 },
      2,
      0.6,
    );
    expect(area).toEqual({ x: 0.9, y: 0, width: 0.1, height: 0.1 });
  });

  it("is never bigger than the screenshot", () => {
    const area = magnifyArea({ x: -1, y: -1, width: 4, height: 2 }, 1.5, 0.5);
    expect(area.width).toBeLessThanOrEqual(1);
    expect(area.height).toBeLessThanOrEqual(0.5 + 1e-9);
    expect(area.width / area.height).toBeCloseTo(2);
  });
});

describe("clampMagnifyZoom", () => {
  it("keeps the zoom within its limits, to a quarter", () => {
    expect(clampMagnifyZoom(1)).toBe(1.5);
    expect(clampMagnifyZoom(9)).toBe(4);
    expect(clampMagnifyZoom(2.6)).toBe(2.5);
  });
});
