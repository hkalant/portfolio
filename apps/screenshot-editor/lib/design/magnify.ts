import type { Box } from "./annotations";

// Magnifiers show the screenshot under them, enlarged. Like blur boxes they
// work on the screenshot's own pixels, so they look the same at every zoom
// and in the export. Boxes are in image widths (1 is the screenshot's width).

export const DEFAULT_MAGNIFY_ZOOM = 2;
export const MIN_MAGNIFY_ZOOM = 1.5;
export const MAX_MAGNIFY_ZOOM = 4;

/** A zoom kept within the limits, to the nearest quarter. */
export function clampMagnifyZoom(zoom: number): number {
  const kept = Math.min(MAX_MAGNIFY_ZOOM, Math.max(MIN_MAGNIFY_ZOOM, zoom));
  return Math.round(kept * 4) / 4;
}

/**
 * The part of the screenshot (1 wide, `aspect` tall) a magnifier enlarges:
 * its box shrunk by the zoom around the box's centre, moved inside the
 * screenshot where it would run off it.
 */
export function magnifyArea(box: Box, zoom: number, aspect: number): Box {
  let width = box.width / zoom;
  let height = box.height / zoom;
  // Never more than the screenshot: shrink both sides to keep the shape.
  const fit = Math.min(1, 1 / width, aspect / height);
  width *= fit;
  height *= fit;
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  return {
    x: Math.min(1 - width, Math.max(0, cx - width / 2)),
    y: Math.min(aspect - height, Math.max(0, cy - height / 2)),
    width,
    height,
  };
}
