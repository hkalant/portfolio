import { describe, expect, it } from "vitest";
import { dominantColors, type PixelData } from "./colors";

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
