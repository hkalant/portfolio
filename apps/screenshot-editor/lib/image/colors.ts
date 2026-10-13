import { rgbToHex, type Rgb } from "@/lib/design/colors";

/** RGBA pixels of a small copy of an image. */
export type PixelData = {
  width: number;
  height: number;
  data: Uint8ClampedArray;
};

/** Longest side of the copy that colours are read from. */
export const SAMPLE_SIDE = 64;

/**
 * Up to `count` colours that stand out in the image, most common first, for a
 * background made from the screenshot. Pixels are grouped into coarse colour
 * boxes; boxes close to one already chosen are skipped so the colours differ.
 */
export function dominantColors({ data }: PixelData, count = 3): string[] {
  const boxes = new Map<
    number,
    { r: number; g: number; b: number; n: number }
  >();
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 128) continue;
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    // 4 bits per channel: 4096 boxes.
    const key = ((r >> 4) << 8) | ((g >> 4) << 4) | (b >> 4);
    const box = boxes.get(key);
    if (box) {
      box.r += r;
      box.g += g;
      box.b += b;
      box.n += 1;
    } else boxes.set(key, { r, g, b, n: 1 });
  }
  const ranked = [...boxes.values()]
    .map((box) => ({
      color: { r: box.r / box.n, g: box.g / box.n, b: box.b / box.n },
      n: box.n,
    }))
    .sort((a, b) => b.n - a.n);

  const chosen: Rgb[] = [];
  const distance = (a: Rgb, b: Rgb) =>
    Math.hypot(a.r - b.r, a.g - b.g, a.b - b.b);
  for (const { color } of ranked) {
    if (chosen.every((other) => distance(color, other) > 60))
      chosen.push(color);
    if (chosen.length === count) break;
  }
  return chosen.map(rgbToHex);
}

const samples = new WeakMap<object, PixelData | null>();

/**
 * Reads a SAMPLE_SIDE copy of an image's pixels, cached per source. Null where
 * the pixels can't be read (no canvas, or a cross-origin image).
 */
export function sampleImagePixels(
  source: HTMLImageElement | HTMLCanvasElement,
): PixelData | null {
  if (samples.has(source)) return samples.get(source) ?? null;
  let result: PixelData | null = null;
  try {
    const sourceWidth =
      source instanceof HTMLImageElement ? source.naturalWidth : source.width;
    const sourceHeight =
      source instanceof HTMLImageElement ? source.naturalHeight : source.height;
    if (sourceWidth > 0 && sourceHeight > 0) {
      const scale = Math.min(
        1,
        SAMPLE_SIDE / Math.max(sourceWidth, sourceHeight),
      );
      const width = Math.max(1, Math.round(sourceWidth * scale));
      const height = Math.max(1, Math.round(sourceHeight * scale));
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext("2d", { willReadFrequently: true });
      if (context) {
        context.imageSmoothingQuality = "high";
        context.drawImage(source, 0, 0, width, height);
        result = {
          width,
          height,
          data: context.getImageData(0, 0, width, height).data,
        };
      }
      canvas.width = 0;
      canvas.height = 0;
    }
  } catch {
    result = null;
  }
  samples.set(source, result);
  return result;
}
