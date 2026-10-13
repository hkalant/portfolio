import { describe, expect, it } from "vitest";
import {
  blurRgba,
  boxRadiiForGauss,
  getBlurredImage,
  MAX_WORK_SIDE,
  planBlur,
  roundBlurSigma,
  shrinkSteps,
  WORK_SIGMA,
} from "./blur";
import { createRandom } from "./random";

type Rgba = [number, number, number, number];

function image(
  width: number,
  height: number,
  colorAt: (x: number, y: number) => Rgba,
) {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y += 1)
    for (let x = 0; x < width; x += 1)
      data.set(colorAt(x, y), (y * width + x) * 4);
  return data;
}

const pixel = (data: Uint8ClampedArray, width: number, x: number, y: number) =>
  [...data.slice((y * width + x) * 4, (y * width + x) * 4 + 4)] as Rgba;

/** Variance of `radii.length` box blurs in a row, in px². */
const boxVariance = (radii: number[]) =>
  radii.reduce((sum, r) => sum + ((2 * r + 1) ** 2 - 1) / 12, 0);

describe("boxRadiiForGauss", () => {
  it("gives three box radii whose combined spread matches sigma", () => {
    for (const sigma of [1, 2.5, 4, 7, 12]) {
      const radii = boxRadiiForGauss(sigma);
      expect(radii).toHaveLength(3);
      for (const r of radii) expect(Number.isInteger(r)).toBe(true);
      expect(Math.sqrt(boxVariance(radii))).toBeCloseTo(sigma, 0);
    }
    expect(boxRadiiForGauss(4)).toEqual([3, 3, 4]);
  });

  it("is empty for no blur", () => {
    expect(boxRadiiForGauss(0)).toEqual([]);
    expect(boxRadiiForGauss(Number.NaN)).toEqual([]);
  });
});

describe("blurRgba", () => {
  it("leaves a flat colour unchanged, including the edges and corners", () => {
    const width = 9;
    const height = 6;
    const data = image(width, height, () => [200, 120, 40, 255]);
    blurRgba(data, width, height, [3, 3, 4]);
    for (let y = 0; y < height; y += 1)
      for (let x = 0; x < width; x += 1)
        expect(pixel(data, width, x, y)).toEqual([200, 120, 40, 255]);
  });

  it("keeps the average brightness of a noisy image", () => {
    const width = 32;
    const height = 24;
    const random = createRandom(3);
    const data = image(width, height, () => {
      const v = Math.floor(random() * 256);
      return [v, 255 - v, v, 255];
    });
    const mean = (values: Uint8ClampedArray, channel: number) => {
      let sum = 0;
      for (let i = channel; i < values.length; i += 4) sum += values[i];
      return sum / (values.length / 4);
    };
    const before = [0, 1, 2].map((channel) => mean(data, channel));
    blurRgba(data, width, height, [2, 2, 2]);
    [0, 1, 2].forEach((channel) =>
      expect(Math.abs(mean(data, channel) - before[channel])).toBeLessThan(2),
    );
    // And it is actually smoother.
    let jumps = 0;
    for (let x = 1; x < width; x += 1)
      jumps += Math.abs(
        pixel(data, width, x, 5)[0] - pixel(data, width, x - 1, 5)[0],
      );
    expect(jumps / (width - 1)).toBeLessThan(20);
  });

  it("turns a hard edge into a smooth ramp without darkening the borders", () => {
    const width = 40;
    const data = image(width, 3, (x) =>
      x < 20 ? [0, 0, 0, 255] : [255, 255, 255, 255],
    );
    blurRgba(data, width, 3, [2, 2, 3]);
    const row = Array.from(
      { length: width },
      (_, x) => pixel(data, width, x, 1)[0],
    );
    for (let x = 1; x < width; x += 1)
      expect(row[x]).toBeGreaterThanOrEqual(row[x - 1]);
    expect(row[0]).toBe(0);
    expect(row[width - 1]).toBe(255);
    expect(row[19]).toBeGreaterThan(64);
    expect(row[20]).toBeLessThan(192);
    // Top and bottom rows are as bright as the middle one: edges repeat, not fade.
    expect(pixel(data, width, 30, 0)).toEqual(pixel(data, width, 30, 1));
    expect(pixel(data, width, 30, 2)).toEqual(pixel(data, width, 30, 1));
  });

  it("doesn't pull dark fringes in from transparent pixels", () => {
    const width = 20;
    const data = image(width, 1, (x) =>
      x < 10 ? [0, 0, 0, 0] : [255, 0, 0, 255],
    );
    blurRgba(data, width, 1, [2, 2, 2]);
    for (let x = 0; x < width; x += 1) {
      const [r, g, b, a] = pixel(data, width, x, 0);
      if (a === 0) continue;
      expect(r).toBeGreaterThanOrEqual(254);
      expect(g + b).toBe(0);
    }
    expect(pixel(data, width, 9, 0)[3]).toBeGreaterThan(0);
    expect(pixel(data, width, 9, 0)[3]).toBeLessThan(255);
  });

  it("does nothing without radii", () => {
    const data = image(3, 3, (x, y) => [x * 50, y * 50, 0, 255]);
    const copy = data.slice();
    blurRgba(data, 3, 3, [0, 0]);
    expect(data).toEqual(copy);
  });
});

describe("planBlur", () => {
  it("shrinks the image so the blur is a few pixels wide", () => {
    const plan = planBlur({ width: 3200, height: 2000 }, 80);
    expect(plan).toMatchObject({ width: 160, height: 100 });
    expect(plan.radii).toEqual(boxRadiiForGauss(WORK_SIGMA));
  });

  it("caps the size of the copy for small blurs on big images", () => {
    const plan = planBlur({ width: 4000, height: 1000 }, 1);
    expect(plan.width).toBe(MAX_WORK_SIDE);
    expect(plan.height).toBe(256);
  });

  it("never enlarges, and keeps at least one pixel", () => {
    expect(planBlur({ width: 50, height: 40 }, 2)).toMatchObject({
      width: 50,
      height: 40,
    });
    expect(planBlur({ width: 10, height: 3000 }, 2000)).toMatchObject({
      width: 1,
      height: 6,
    });
  });
});

describe("shrinkSteps", () => {
  it("halves first, then makes one last step to the target", () => {
    expect(
      shrinkSteps({ width: 3200, height: 2000 }, { width: 160, height: 100 }),
    ).toEqual([
      { width: 1600, height: 1000 },
      { width: 800, height: 500 },
      { width: 400, height: 250 },
      { width: 200, height: 125 },
      { width: 160, height: 100 },
    ]);
  });

  it("has one step when the size doesn't change", () => {
    expect(
      shrinkSteps({ width: 64, height: 48 }, { width: 64, height: 48 }),
    ).toEqual([{ width: 64, height: 48 }]);
  });
});

describe("roundBlurSigma", () => {
  it("rounds to half pixels, with half a pixel as the least blur", () => {
    expect(roundBlurSigma(0)).toBe(0);
    expect(roundBlurSigma(0.1)).toBe(0.5);
    expect(roundBlurSigma(3.3)).toBe(3.5);
    expect(roundBlurSigma(17.74)).toBe(17.5);
  });
});

it("getBlurredImage needs a DOM", () => {
  const canvas = { width: 100, height: 100 } as unknown as HTMLCanvasElement;
  expect(getBlurredImage(canvas, 4)).toBeNull();
});
