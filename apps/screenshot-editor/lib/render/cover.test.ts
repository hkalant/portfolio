import { describe, expect, it } from "vitest";
import { coverCrop, coverScale, sourceSize } from "./cover";

describe("coverScale", () => {
  it("scales so the source covers the target on both axes", () => {
    expect(
      coverScale({ width: 400, height: 300 }, { width: 200, height: 200 }),
    ).toBeCloseTo(2 / 3);
    expect(
      coverScale({ width: 100, height: 100 }, { width: 300, height: 150 }),
    ).toBe(3);
  });
});

describe("coverCrop", () => {
  it("crops the sides of a wider source, centred", () => {
    expect(
      coverCrop({ width: 400, height: 300 }, { width: 200, height: 200 }),
    ).toEqual({ x: 50, y: 0, width: 300, height: 300 });
  });

  it("crops the top and bottom of a taller source, centred", () => {
    expect(
      coverCrop({ width: 300, height: 600 }, { width: 300, height: 300 }),
    ).toEqual({ x: 0, y: 150, width: 300, height: 300 });
  });

  it("keeps the whole source when the aspect ratios match", () => {
    expect(
      coverCrop({ width: 2400, height: 1500 }, { width: 800, height: 500 }),
    ).toEqual({ x: 0, y: 0, width: 2400, height: 1500 });
  });

  it("has the target's aspect ratio and stays inside the source", () => {
    const source = { width: 1234, height: 567 };
    for (const target of [
      { width: 1080, height: 1920 },
      { width: 1600, height: 900 },
      { width: 100, height: 4000 },
    ]) {
      const crop = coverCrop(source, target);
      expect(crop.width / crop.height).toBeCloseTo(
        target.width / target.height,
        6,
      );
      expect(crop.x).toBeGreaterThanOrEqual(0);
      expect(crop.y).toBeGreaterThanOrEqual(0);
      expect(crop.x + crop.width).toBeCloseTo(source.width - crop.x, 6);
      expect(crop.y + crop.height).toBeCloseTo(source.height - crop.y, 6);
      expect(crop.width).toBeLessThanOrEqual(source.width + 1e-9);
      expect(crop.height).toBeLessThanOrEqual(source.height + 1e-9);
    }
  });
});

describe("sourceSize", () => {
  it("reads natural size from images and width and height from canvases", () => {
    const image = {
      naturalWidth: 640,
      naturalHeight: 480,
      width: 10,
      height: 10,
    };
    const canvas = { width: 320, height: 200 };
    expect(sourceSize(image as unknown as HTMLImageElement)).toEqual({
      width: 640,
      height: 480,
    });
    expect(sourceSize(canvas as unknown as HTMLCanvasElement)).toEqual({
      width: 320,
      height: 200,
    });
  });
});
