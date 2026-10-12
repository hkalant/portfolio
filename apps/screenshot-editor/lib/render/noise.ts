import { createRandom } from "./random";

// Film grain: a small greyscale noise tile repeated over the background. It is
// seeded, so every render and every export has the same grain.

export const NOISE_TILE_SIZE = 128;
export const NOISE_SEED = 0x6e6f6973;
/** Opacity of the noise layer at full strength (noise = 1). */
export const NOISE_MAX_OPACITY = 0.35;

/** Grey levels 0..255, one per pixel of a `size` x `size` tile, row by row. */
export function noiseTileValues(
  size = NOISE_TILE_SIZE,
  seed = NOISE_SEED,
): Uint8Array {
  const random = createRandom(seed);
  const values = new Uint8Array(size * size);
  for (let i = 0; i < values.length; i += 1)
    values[i] = Math.floor(random() * 256);
  return values;
}

/** Opacity of the noise layer for a noise amount of 0..1. */
export function noiseOpacity(amount: number): number {
  return Math.min(1, Math.max(0, amount)) * NOISE_MAX_OPACITY;
}

let tile: HTMLCanvasElement | null = null;

/** The noise tile as an opaque canvas, made once. Null without a DOM. */
export function getNoiseTile(): HTMLCanvasElement | null {
  if (tile) return tile;
  if (typeof document === "undefined") return null;
  const canvas = document.createElement("canvas");
  canvas.width = NOISE_TILE_SIZE;
  canvas.height = NOISE_TILE_SIZE;
  const context = canvas.getContext("2d");
  if (!context) return null;
  const pixels = context.createImageData(NOISE_TILE_SIZE, NOISE_TILE_SIZE);
  const values = noiseTileValues();
  for (let i = 0; i < values.length; i += 1) {
    pixels.data[i * 4] = values[i];
    pixels.data[i * 4 + 1] = values[i];
    pixels.data[i * 4 + 2] = values[i];
    pixels.data[i * 4 + 3] = 255;
  }
  context.putImageData(pixels, 0, 0);
  tile = canvas;
  return tile;
}
