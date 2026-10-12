import { describe, expect, it } from "vitest";
import { dominantColors, edgeColor, type PixelData } from "./colors";

function pixels(
  width: number,
  height: number,
  colorAt: (x: number, y: number) => [number, number, number, number],
): PixelData {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y += 1)
    for (let x = 0; x < width; x += 1)
      data.set(colorAt(x, y), (y * width + x) * 4);
  return { width, height, data };
}

describe("edgeColor", () => {
  it("averages the outer ring of pixels", () => {
    // A white frame around a red centre.
    const image = pixels(8, 8, (x, y) =>
      x === 0 || y === 0 || x === 7 || y === 7
        ? [255, 255, 255, 255]
        : [255, 0, 0, 255],
    );
    expect(edgeColor(image)).toBe("#ffffff");
  });

  it("skips transparent pixels and gives null when nothing is opaque", () => {
    const halfClear = pixels(4, 4, (x) =>
      x < 2 ? [0, 0, 0, 0] : [0, 0, 255, 255],
    );
    expect(edgeColor(halfClear)).toBe("#0000ff");
    expect(edgeColor(pixels(3, 3, () => [10, 10, 10, 0]))).toBeNull();
  });
});

describe("dominantColors", () => {
  it("returns distinct colours, most common first", () => {
    const image = pixels(10, 10, (x) =>
      x < 6
        ? [20, 40, 200, 255]
        : x < 9
          ? [240, 200, 20, 255]
          : [22, 42, 198, 255],
    );
    expect(dominantColors(image, 3)).toEqual(["#1428c8", "#f0c814"]);
  });

  it("is empty for a fully transparent image", () => {
    expect(dominantColors(pixels(2, 2, () => [0, 0, 0, 0]))).toEqual([]);
  });
});
