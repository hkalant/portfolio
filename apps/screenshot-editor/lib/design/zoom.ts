import type { Size } from "./layout";
import { MAX_CANVAS_AREA, MAX_CANVAS_SIDE } from "./limits";

/** The levels the zoom buttons step through. 1 shows the design at its true size. */
export const ZOOM_STEPS = [
  0.1, 0.25, 0.33, 0.5, 0.67, 0.75, 1, 1.25, 1.5, 2,
] as const;

export const MAX_ZOOM = ZOOM_STEPS[ZOOM_STEPS.length - 1];

// Levels closer than this count as the same, so a fit of 0.4999 doesn't stop
// "zoom in" at 0.5.
const EPSILON = 0.005;

/**
 * Largest zoom whose preview still fits in one browser canvas at one bitmap
 * pixel per screen pixel (Safari refuses bigger canvases).
 */
export function maxZoom(canvas: Size): number {
  const byArea = Math.sqrt(MAX_CANVAS_AREA / (canvas.width * canvas.height));
  const bySide = MAX_CANVAS_SIDE / Math.max(canvas.width, canvas.height);
  return Math.min(MAX_ZOOM, byArea, bySide);
}

/** Smallest zoom: the first step, or less when even that doesn't fit the workspace. */
export function minZoom(fit: number): number {
  return Math.min(ZOOM_STEPS[0], fit);
}

/** The next zoom level in or out from `current`, kept within the limits. */
export function stepZoom(
  current: number,
  direction: "in" | "out",
  limits: { min: number; max: number },
): number {
  const next =
    direction === "in"
      ? (ZOOM_STEPS.find((step) => step > current + EPSILON) ?? limits.max)
      : ([...ZOOM_STEPS].reverse().find((step) => step < current - EPSILON) ??
        limits.min);
  return Math.min(limits.max, Math.max(limits.min, next));
}

/** True when `zoom` is at `limit`, so the button that moves towards it is spent. */
export function atZoomLimit(zoom: number, limit: number): boolean {
  return Math.abs(zoom - limit) < EPSILON;
}

/**
 * Bitmap pixels per screen pixel for a preview this size (in screen px): the
 * screen's own ratio, lowered when a zoomed-in preview would otherwise need a
 * canvas bigger than the browser allows.
 */
export function previewPixelRatio(
  devicePixelRatio: number,
  size: Size,
): number {
  const area = Math.max(1, size.width * size.height);
  const side = Math.max(1, size.width, size.height);
  // Rounded down, so the bitmap Konva allocates stays inside the limits.
  const cap =
    Math.floor(
      Math.min(Math.sqrt(MAX_CANVAS_AREA / area), MAX_CANVAS_SIDE / side) * 100,
    ) / 100;
  return Math.min(devicePixelRatio, cap);
}
