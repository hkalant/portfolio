import type { Size } from "@/lib/design/layout";
import { downscaleToCanvas } from "@/lib/image/downscale";
import { sourceSize } from "./cover";

// Background blur without ctx.filter (Safari lacks it): shrink the image until
// the blur is only a few pixels wide, box-blur it three times (close to a
// Gaussian), and let the browser scale it back up smoothly when it is drawn.

/** Box blur passes. Three are visually indistinguishable from a Gaussian. */
export const BLUR_PASSES = 3;
/** The blur (Gaussian sigma) in the shrunk copy, in its own pixels. */
export const WORK_SIGMA = 4;
/** Longest side of the shrunk copy, which bounds the work for small blurs. */
export const MAX_WORK_SIDE = 1024;
/** Blurred copies kept per source: enough for undo and redo between a few values. */
const COPIES_PER_SOURCE = 4;

/**
 * Box radii for `passes` box blurs that together approximate a Gaussian of
 * `sigma` (Kovesi, "Fast almost-Gaussian filtering"). Empty for no blur.
 */
export function boxRadiiForGauss(
  sigma: number,
  passes = BLUR_PASSES,
): number[] {
  if (!(sigma > 0) || passes < 1) return [];
  const variance = sigma * sigma;
  const ideal = Math.sqrt((12 * variance) / passes + 1);
  let lower = Math.floor(ideal);
  if (lower % 2 === 0) lower -= 1;
  const upper = lower + 2;
  // How many passes use the smaller box so the variances add up to sigma².
  const smaller = Math.round(
    (12 * variance - passes * lower * lower - 4 * passes * lower - 3 * passes) /
      (-4 * lower - 4),
  );
  const count = Math.min(passes, Math.max(0, smaller));
  return Array.from(
    { length: passes },
    (_, i) => ((i < count ? lower : upper) - 1) / 2,
  );
}

/**
 * One box blur along every row (or column) of RGBA float data, from `src` into
 * `dst`. Past the edges the edge pixel repeats, so borders don't darken.
 */
function boxBlurLines(
  src: Float32Array,
  dst: Float32Array,
  width: number,
  height: number,
  radius: number,
  horizontal: boolean,
) {
  const lines = horizontal ? height : width;
  const length = horizontal ? width : height;
  const step = horizontal ? 4 : width * 4;
  const lineStep = horizontal ? width * 4 : 4;
  const last = length - 1;
  const scale = 1 / (2 * radius + 1);
  for (let line = 0; line < lines; line += 1) {
    for (let channel = 0; channel < 4; channel += 1) {
      const base = line * lineStep + channel;
      let sum = 0;
      for (let k = -radius; k <= radius; k += 1)
        sum += src[base + Math.min(last, Math.max(0, k)) * step];
      for (let i = 0; i < length; i += 1) {
        dst[base + i * step] = sum * scale;
        sum +=
          src[base + Math.min(last, i + radius + 1) * step] -
          src[base + Math.max(0, i - radius) * step];
      }
    }
  }
}

/**
 * Blurs RGBA pixels in place with one horizontal and one vertical box blur per
 * radius. Colours are premultiplied by alpha while blurring, so transparent
 * pixels don't bleed dark fringes into their neighbours.
 */
export function blurRgba(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  radii: readonly number[],
): void {
  const active = radii.map(Math.round).filter((radius) => radius > 0);
  if (active.length === 0 || width < 1 || height < 1) return;
  const size = width * height * 4;
  const a = new Float32Array(size);
  const b = new Float32Array(size);
  for (let i = 0; i < size; i += 4) {
    const alpha = data[i + 3] / 255;
    a[i] = data[i] * alpha;
    a[i + 1] = data[i + 1] * alpha;
    a[i + 2] = data[i + 2] * alpha;
    a[i + 3] = data[i + 3];
  }
  for (const radius of active) {
    boxBlurLines(a, b, width, height, radius, true);
    boxBlurLines(b, a, width, height, radius, false);
  }
  for (let i = 0; i < size; i += 4) {
    const alpha = a[i + 3];
    const unpremultiply = alpha > 0 ? 255 / alpha : 0;
    data[i] = a[i] * unpremultiply;
    data[i + 1] = a[i + 1] * unpremultiply;
    data[i + 2] = a[i + 2] * unpremultiply;
    data[i + 3] = alpha;
  }
}

export type BlurPlan = Size & { radii: number[] };

/**
 * The size of the shrunk copy and its box radii, for a blur of `sigma` source
 * pixels.
 */
export function planBlur(source: Size, sigma: number): BlurPlan {
  const longest = Math.max(source.width, source.height);
  const factor = Math.min(
    1,
    sigma > 0 ? WORK_SIGMA / sigma : 1,
    MAX_WORK_SIDE / longest,
  );
  const width = Math.max(1, Math.round(source.width * factor));
  const height = Math.max(1, Math.round(source.height * factor));
  // Rounding to whole pixels changes the factor slightly; use the real one.
  const actual = (width / source.width + height / source.height) / 2;
  return { width, height, radii: boxRadiiForGauss(sigma * actual) };
}

/**
 * Sizes to shrink through, halving first and then one last step to `target`,
 * which looks much smoother than one big jump. Never empty.
 */
export function shrinkSteps(source: Size, target: Size): Size[] {
  const steps: Size[] = [];
  let current = source;
  while (
    current.width / 2 >= target.width &&
    current.height / 2 >= target.height
  ) {
    current = {
      width: Math.round(current.width / 2),
      height: Math.round(current.height / 2),
    };
    steps.push(current);
  }
  const last = steps.at(-1);
  if (!last || last.width !== target.width || last.height !== target.height)
    steps.push(target);
  return steps;
}

/** Blur sigmas are cached in half pixels, so tiny layout changes reuse a copy. */
export function roundBlurSigma(sigma: number): number {
  return sigma > 0 ? Math.max(0.5, Math.round(sigma * 2) / 2) : 0;
}

const copies = new WeakMap<object, Map<number, HTMLCanvasElement>>();

/**
 * A blurred, shrunk copy of `source` for a Gaussian blur of `sigma` source
 * pixels. Draw it stretched over the same area as the source. Cached per
 * source and rounded sigma; null without a DOM or if the pixels can't be read.
 */
export function getBlurredImage(
  source: HTMLImageElement | HTMLCanvasElement,
  sigma: number,
): HTMLCanvasElement | null {
  if (typeof document === "undefined") return null;
  const key = roundBlurSigma(sigma);
  const size = sourceSize(source);
  if (key === 0 || size.width === 0 || size.height === 0) return null;

  let cache = copies.get(source);
  const cached = cache?.get(key);
  if (cache && cached) {
    // Most recently used last.
    cache.delete(key);
    cache.set(key, cached);
    return cached;
  }

  const plan = planBlur(size, key);
  let canvas: HTMLCanvasElement;
  try {
    canvas = downscaleToCanvas(source, shrinkSteps(size, plan));
    const context = canvas.getContext("2d");
    if (!context) return null;
    const pixels = context.getImageData(0, 0, plan.width, plan.height);
    blurRgba(pixels.data, plan.width, plan.height, plan.radii);
    context.putImageData(pixels, 0, 0);
  } catch {
    return null;
  }

  if (!cache) {
    cache = new Map();
    copies.set(source, cache);
  }
  cache.set(key, canvas);
  // Least recently used first. Those aren't on screen, so they can be freed.
  for (const [oldKey, old] of cache) {
    if (cache.size <= COPIES_PER_SOURCE) break;
    cache.delete(oldKey);
    old.width = 0;
    old.height = 0;
  }
  return canvas;
}
