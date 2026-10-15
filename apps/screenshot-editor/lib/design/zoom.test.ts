import { describe, expect, it } from "vitest";
import { MAX_CANVAS_AREA, MAX_CANVAS_SIDE } from "./limits";
import {
  atZoomLimit,
  MAX_ZOOM,
  maxZoom,
  minZoom,
  previewPixelRatio,
  stepZoom,
  ZOOM_STEPS,
} from "./zoom";

const limits = { min: 0.1, max: 2 };

describe("stepZoom", () => {
  it("steps from a fitted zoom to the next level either way", () => {
    expect(stepZoom(0.42, "in", limits)).toBe(0.5);
    expect(stepZoom(0.42, "out", limits)).toBe(0.33);
  });

  it("moves off a level it is already on", () => {
    expect(stepZoom(1, "in", limits)).toBe(1.25);
    expect(stepZoom(1, "out", limits)).toBe(0.75);
    // A fit a hair under a level still counts as that level.
    expect(stepZoom(0.499, "in", limits)).toBe(0.67);
  });

  it("stays within the limits", () => {
    expect(stepZoom(2, "in", limits)).toBe(2);
    expect(stepZoom(0.1, "out", limits)).toBe(0.1);
    expect(stepZoom(1, "in", { min: 0.1, max: 1.1 })).toBe(1.1);
    expect(stepZoom(0.05, "out", { min: 0.05, max: 2 })).toBe(0.05);
  });

  it("steps through levels in order", () => {
    expect([...ZOOM_STEPS]).toEqual([...ZOOM_STEPS].sort((a, b) => a - b));
    expect(MAX_ZOOM).toBe(2);
  });
});

describe("zoom limits", () => {
  it("allows 200% for a typical design", () => {
    expect(maxZoom({ width: 1744, height: 1144 })).toBe(2);
  });

  it("keeps a zoomed preview inside one browser canvas", () => {
    for (const canvas of [
      { width: 4000, height: 4000 },
      { width: 8000, height: 400 },
    ]) {
      const zoom = maxZoom(canvas);
      expect(canvas.width * zoom * canvas.height * zoom).toBeLessThanOrEqual(
        MAX_CANVAS_AREA + 1,
      );
      expect(Math.max(canvas.width, canvas.height) * zoom).toBeLessThanOrEqual(
        MAX_CANVAS_SIDE,
      );
    }
  });

  it("lets a design zoom out to its fit when that is under 10%", () => {
    expect(minZoom(0.5)).toBe(0.1);
    expect(minZoom(0.04)).toBe(0.04);
  });

  it("treats near-equal levels as the limit", () => {
    expect(atZoomLimit(1.999, 2)).toBe(true);
    expect(atZoomLimit(1.5, 2)).toBe(false);
  });
});

describe("previewPixelRatio", () => {
  it("uses the screen's ratio for a normal preview", () => {
    expect(previewPixelRatio(2, { width: 1200, height: 800 })).toBe(2);
    expect(previewPixelRatio(1, { width: 3488, height: 2288 })).toBe(1);
  });

  it("lowers the ratio when the bitmap would be too big", () => {
    const size = { width: 3488, height: 2288 };
    const ratio = previewPixelRatio(2, size);
    expect(ratio).toBeLessThan(2);
    expect(ratio).toBeGreaterThan(1);
    expect(
      Math.floor(size.width * ratio) * Math.floor(size.height * ratio),
    ).toBeLessThanOrEqual(MAX_CANVAS_AREA);
  });
});
