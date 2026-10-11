import { fitWithin, type Size } from "@/lib/design/layout";

/**
 * Sizes to resize through so a large image ends up with its longest side at
 * `maxSide`. Halving step by step, then one final resize, looks much sharper
 * than a single big jump. Empty when the image is already small enough.
 */
export function planDownscaleSteps(
  width: number,
  height: number,
  maxSide: number,
): Size[] {
  if (Math.max(width, height) <= maxSide) return [];
  const target = fitWithin({ width, height }, maxSide);
  const steps: Size[] = [];
  let current = { width, height };
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
  const last = steps[steps.length - 1];
  if (!last || last.width !== target.width || last.height !== target.height)
    steps.push(target);
  return steps;
}

/** Draws `source` through each step. Frees intermediate canvases as it goes. */
export function downscaleToCanvas(
  source: CanvasImageSource,
  steps: Size[],
): HTMLCanvasElement {
  let current: CanvasImageSource = source;
  let previous: HTMLCanvasElement | null = null;
  let canvas: HTMLCanvasElement | null = null;
  for (const step of steps) {
    canvas = document.createElement("canvas");
    canvas.width = step.width;
    canvas.height = step.height;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Canvas 2D is not available");
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";
    context.drawImage(current, 0, 0, step.width, step.height);
    if (previous) {
      previous.width = 0;
      previous.height = 0;
    }
    previous = canvas;
    current = canvas;
  }
  if (!canvas) throw new Error("No downscale steps");
  return canvas;
}
