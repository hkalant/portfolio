import type { Size } from "@/lib/design/layout";
import { MAX_CANVAS_AREA, MAX_CANVAS_SIDE } from "@/lib/design/limits";

/**
 * The largest pixel ratio, up to `wanted`, whose output stays inside the
 * canvas limits browsers enforce (Safari: 16,777,216 px in area; all: 16,384
 * px per side). Rounded down to 3 decimals so the floored output fits too.
 */
export function safePixelRatio(size: Size, wanted: number): number {
  let ratio = wanted;
  const area = size.width * size.height;
  if (area * ratio * ratio > MAX_CANVAS_AREA)
    ratio = Math.sqrt(MAX_CANVAS_AREA / area);
  ratio = Math.min(
    ratio,
    MAX_CANVAS_SIDE / size.width,
    MAX_CANVAS_SIDE / size.height,
  );
  return Math.max(0.001, Math.floor(ratio * 1000) / 1000);
}

/** Pixel size of an export at `ratio`. Konva floors bitmap sizes the same way. */
export function exportPixelSize(size: Size, ratio: number): Size {
  return {
    width: Math.max(1, Math.floor(size.width * ratio)),
    height: Math.max(1, Math.floor(size.height * ratio)),
  };
}
