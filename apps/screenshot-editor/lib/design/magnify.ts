import { clamp } from "@/lib/utils";
import { fitBox, type Box, type Point } from "./annotations";
import type { MagnifyLens } from "./schema";

// Magnifiers show part of the screenshot enlarged. Like blur boxes they work
// on the screenshot's own pixels, so they look the same at every zoom and in
// the export. Boxes are in image widths (1 is the screenshot's width).
//
// In place, a magnifier enlarges what is under its own centre. As an inset
// (`from` set) it enlarges the area around `from`, and sits somewhere else.

export const DEFAULT_MAGNIFY_ZOOM = 2;
export const MIN_MAGNIFY_ZOOM = 1.5;
export const MAX_MAGNIFY_ZOOM = 4;
export const DEFAULT_MAGNIFY_LENS: MagnifyLens = "rounded";

/** The frame round a magnifier and the area an inset enlarges. */
export const MAGNIFY_BORDER_COLOR = "rgba(142, 146, 151, 0.85)";
/** The frame's width, as a share of the screenshot's width. */
export const MAGNIFY_BORDER = 0.005;
/** Room between an inset and the area it enlarges. */
const INSET_GAP = 0.04;

/** A zoom kept within the limits, to the nearest quarter. */
export function clampMagnifyZoom(zoom: number): number {
  const kept = clamp(zoom, MIN_MAGNIFY_ZOOM, MAX_MAGNIFY_ZOOM);
  return Math.round(kept * 4) / 4;
}

const centreOf = (box: Box): Point => ({
  x: box.x + box.width / 2,
  y: box.y + box.height / 2,
});

/**
 * The part of the screenshot (1 wide, `aspect` tall) a magnifier enlarges:
 * its box shrunk by the zoom, around `from` (or the box's own centre),
 * moved inside the screenshot where it would run off it.
 */
export function magnifyArea(
  box: Box,
  zoom: number,
  aspect: number,
  from?: Point,
): Box {
  let width = box.width / zoom;
  let height = box.height / zoom;
  // Never more than the screenshot: shrink both sides to keep the shape.
  const fit = Math.min(1, 1 / width, aspect / height);
  width *= fit;
  height *= fit;
  const centre = from ?? centreOf(box);
  return {
    x: clamp(centre.x - width / 2, 0, 1 - width),
    y: clamp(centre.y - height / 2, 0, aspect - height),
    width,
    height,
  };
}

/**
 * Where a new inset goes for an `area` dragged out on the screenshot: the
 * area enlarged by the zoom, to its right, else left, below or above,
 * wherever it fits.
 */
export function insetBox(area: Box, zoom: number, canvas: Box): Box {
  const width = area.width * zoom;
  const height = area.height * zoom;
  const centre = centreOf(area);
  const room = {
    right: canvas.x + canvas.width - (area.x + area.width),
    left: area.x - canvas.x,
    below: canvas.y + canvas.height - (area.y + area.height),
    above: area.y - canvas.y,
  };
  const sides = Object.keys(room) as (keyof typeof room)[];
  const need = (key: keyof typeof room) =>
    (key === "right" || key === "left" ? width : height) + INSET_GAP;
  // The first side it fits, else the one it fits best.
  const side =
    sides.find((key) => room[key] >= need(key)) ??
    sides.reduce((best, next) =>
      room[next] / need(next) > room[best] / need(best) + 1e-9 ? next : best,
    );
  const x =
    side === "right"
      ? area.x + area.width + INSET_GAP
      : side === "left"
        ? area.x - INSET_GAP - width
        : centre.x - width / 2;
  const y =
    side === "below"
      ? area.y + area.height + INSET_GAP
      : side === "above"
        ? area.y - INSET_GAP - height
        : centre.y - height / 2;
  return fitBox({ x, y, width, height }, canvas, false);
}

/** How far from a lens's centre its edge is, along a direction. */
function edgeDistance(box: Box, lens: MagnifyLens, dx: number, dy: number) {
  const hw = box.width / 2;
  const hh = box.height / 2;
  if (lens === "circle") return 1 / Math.hypot(dx / hw, dy / hh);
  return Math.min(
    dx === 0 ? Infinity : hw / Math.abs(dx),
    dy === 0 ? Infinity : hh / Math.abs(dy),
  );
}

/**
 * The line joining the area an inset enlarges to the inset, from edge to
 * edge, or null where they touch.
 */
export function insetConnector(
  area: Box,
  inset: Box,
  lens: MagnifyLens,
): [Point, Point] | null {
  const a = centreOf(area);
  const b = centreOf(inset);
  const length = Math.hypot(b.x - a.x, b.y - a.y);
  if (!(length > 0)) return null;
  const dx = (b.x - a.x) / length;
  const dy = (b.y - a.y) / length;
  const start = edgeDistance(area, lens, dx, dy);
  const end = length - edgeDistance(inset, lens, -dx, -dy);
  if (!(end - start > 0.002)) return null;
  return [
    { x: a.x + dx * start, y: a.y + dy * start },
    { x: a.x + dx * end, y: a.y + dy * end },
  ];
}
