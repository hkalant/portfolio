import type { Size } from "@/lib/design/layout";
import { clamp } from "@/lib/utils";

/** How close (in screen px) the shot's centre must come to a centre line to snap to it. */
export const SNAP_DISTANCE = 6;

export type Point = { x: number; y: number };

/** The canvas centre lines the shot is snapped to. */
export type CentreGuides = { vertical: boolean; horizontal: boolean };

export const NO_GUIDES: CentreGuides = { vertical: false, horizontal: false };

export type DragSnap = {
  /** Where the shot's centre goes, in canvas px. */
  centre: Point;
  /** The same point as a fraction of the canvas, as the design stores it. */
  position: Point;
  guides: CentreGuides;
};

/**
 * Where a dragged shot goes: its centre stays on the canvas, and within
 * `distance` screen px of a centre line it snaps onto it. `zoom` is the
 * on-screen scale, so the snap feels the same at any zoom.
 */
export function snapDrag(
  centre: Point,
  canvas: Size,
  zoom: number,
  distance = SNAP_DISTANCE,
): DragSnap {
  const threshold = distance / (zoom > 0 ? zoom : 1);
  const along = (value: number, size: number) => {
    const inside = clamp(value, 0, size);
    const middle = size / 2;
    return Math.abs(inside - middle) <= threshold
      ? { value: middle, snapped: true }
      : { value: inside, snapped: false };
  };
  const x = along(centre.x, canvas.width);
  const y = along(centre.y, canvas.height);
  return {
    centre: { x: x.value, y: y.value },
    position: { x: x.value / canvas.width, y: y.value / canvas.height },
    // A vertical line marks the horizontal centre, and the other way round.
    guides: { vertical: x.snapped, horizontal: y.snapped },
  };
}
