import type { Box } from "./annotations";

// Blur boxes blur the screenshot under them. Boxes are in image widths (1 is
// the screenshot's width), so the blur is worked out on the screenshot's own
// pixels and looks the same at every zoom and in the export.

export const DEFAULT_BLUR_INTENSITY = 0.5;

/** The blur radius as a share of the screenshot's width: light to heavy. */
export function blurRadius(intensity: number): number {
  const amount = Math.min(1, Math.max(0, intensity));
  return 0.003 + 0.037 * amount;
}

/** The part of a box over the screenshot (1 wide, `aspect` tall), or null. */
export function blurArea(box: Box, aspect: number): Box | null {
  const x = Math.max(0, box.x);
  const y = Math.max(0, box.y);
  const right = Math.min(1, box.x + box.width);
  const bottom = Math.min(aspect, box.y + box.height);
  if (!(right - x > 0.0005) || !(bottom - y > 0.0005)) return null;
  return { x, y, width: right - x, height: bottom - y };
}
