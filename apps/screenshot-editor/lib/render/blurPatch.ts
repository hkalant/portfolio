import Konva from "konva";
import type { Box } from "@/lib/design/annotations";
import { blurRadius } from "@/lib/design/blur";

/** The longest side the blur is worked out at, in px, so it stays quick. */
const MAX_SIDE = 900;
/** Konva's stack blur goes no further than this radius. */
const MAX_RADIUS = 180;

/**
 * The screenshot under `area` (inside the screenshot, in image widths),
 * blurred. Pixels around the area are blurred in too, so the edges blend.
 */
export function blurredPatch(
  source: CanvasImageSource,
  sourceWidth: number,
  sourceHeight: number,
  area: Box,
  intensity: number,
): HTMLCanvasElement | null {
  if (!(sourceWidth > 0) || !(sourceHeight > 0)) return null;
  // Source pixels per image width.
  const perUnit = sourceWidth;
  const radius = blurRadius(intensity) * perUnit;
  const pad = radius * 1.5;
  const sx = Math.max(0, area.x * perUnit - pad);
  const sy = Math.max(0, area.y * perUnit - pad);
  const sRight = Math.min(sourceWidth, (area.x + area.width) * perUnit + pad);
  const sBottom = Math.min(
    sourceHeight,
    (area.y + area.height) * perUnit + pad,
  );
  const sw = sRight - sx;
  const sh = sBottom - sy;
  if (!(sw >= 1) || !(sh >= 1)) return null;
  const scale = Math.min(1, MAX_SIDE / Math.max(sw, sh));
  const work = document.createElement("canvas");
  work.width = Math.max(1, Math.round(sw * scale));
  work.height = Math.max(1, Math.round(sh * scale));
  const context = work.getContext("2d", { willReadFrequently: true });
  if (!context) return null;
  context.imageSmoothingQuality = "high";
  context.drawImage(source, sx, sy, sw, sh, 0, 0, work.width, work.height);
  const pixels = context.getImageData(0, 0, work.width, work.height);
  const r = Math.min(MAX_RADIUS, Math.max(1, Math.round(radius * scale)));
  // Konva's stack blur reads its radius from the node it filters.
  const blur = Konva.Filters.Blur as unknown as (
    this: { blurRadius: () => number },
    data: ImageData,
  ) => void;
  blur.call({ blurRadius: () => r }, pixels);
  context.putImageData(pixels, 0, 0);

  // Just the area itself.
  const out = document.createElement("canvas");
  out.width = Math.max(1, Math.round(area.width * perUnit * scale));
  out.height = Math.max(1, Math.round(area.height * perUnit * scale));
  out
    .getContext("2d")
    ?.drawImage(
      work,
      (area.x * perUnit - sx) * scale,
      (area.y * perUnit - sy) * scale,
      area.width * perUnit * scale,
      area.height * perUnit * scale,
      0,
      0,
      out.width,
      out.height,
    );
  Konva.Util.releaseCanvas(work);
  return out;
}
