import { MAX_DESIGN_SIDE } from "./limits";

export type Size = { width: number; height: number };
export type Rect = Size & { x: number; y: number };

/** Shrinks (never enlarges) a size so its longest side is at most `maxSide`. Whole pixels. */
export function fitWithin(size: Size, maxSide: number): Size {
  const scale = Math.min(1, maxSide / Math.max(size.width, size.height));
  return {
    width: Math.max(1, Math.round(size.width * scale)),
    height: Math.max(1, Math.round(size.height * scale)),
  };
}

export type DesignLayout = {
  /** The whole design, which is also the exported image at 1x. */
  canvas: Size;
  /** Where the screenshot sits inside the canvas. */
  imageRect: Rect;
  /** Corner radius actually drawn: never more than half the shorter side. */
  radius: number;
};

/**
 * "Auto" canvas size: the screenshot (fitted to MAX_DESIGN_SIDE) plus padding
 * on every side. The shadow does not grow the canvas, so with little padding it
 * is cut off at the edges.
 */
export function computeLayout(
  source: Size,
  padding: number,
  radius: number,
): DesignLayout {
  const image = fitWithin(source, MAX_DESIGN_SIDE);
  return {
    canvas: {
      width: image.width + 2 * padding,
      height: image.height + 2 * padding,
    },
    imageRect: {
      x: padding,
      y: padding,
      width: image.width,
      height: image.height,
    },
    radius: Math.max(
      0,
      Math.min(radius, Math.min(image.width, image.height) / 2),
    ),
  };
}

export const MIN_PREVIEW_SCALE = 0.05;

/** How much to shrink the design so it fits the workspace with a margin. Never above 1. */
export function computePreviewScale(
  container: Size,
  canvas: Size,
  margin = 32,
): number {
  const availableWidth = container.width - 2 * margin;
  const availableHeight = container.height - 2 * margin;
  if (availableWidth <= 0 || availableHeight <= 0) return MIN_PREVIEW_SCALE;
  const scale = Math.min(
    availableWidth / canvas.width,
    availableHeight / canvas.height,
  );
  return Math.min(1, Math.max(MIN_PREVIEW_SCALE, scale));
}

export function scaleSize(size: Size, scale: number): Size {
  return { width: size.width * scale, height: size.height * scale };
}
