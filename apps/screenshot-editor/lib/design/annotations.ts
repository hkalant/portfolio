import { clamp } from "@/lib/utils";
import {
  ANNOTATION_COLORS,
  MAX_STEP_NUMBER,
  type Annotation,
  type AnnotationColor,
  type ShapeAnnotation,
  type ShapeKind,
} from "./schema";

// Sizes and rules for the annotations drawn on the screenshot. Every length
// is in image widths (1 = the screenshot's width), like the positions.

export { ANNOTATION_COLORS, MAX_STEP_NUMBER };

export const ANNOTATION_COLOR_NAMES: Record<AnnotationColor, string> = {
  "#424a52": "Charcoal",
  "#d10373": "Pink",
  "#f9c909": "Yellow",
};

/** Steps and shapes start in this colour. */
export const DEFAULT_ANNOTATION_COLOR: AnnotationColor = "#d10373";

export function isAnnotationColor(value: string): value is AnnotationColor {
  return (ANNOTATION_COLORS as readonly string[]).includes(value);
}

/** Radius of a step circle. */
export const STEP_RADIUS = 0.019;
/** Border of an outline shape. */
export const SHAPE_STROKE = 0.004;
/** Corner radius of a rounded rectangle. */
export const SHAPE_CORNER = 0.012;
/** A click without a drag makes a shape this size, centred on the click. */
export const DEFAULT_SHAPE_SIZE = { width: 0.16, height: 0.1 };
/** Drags shorter than this are clicks. */
export const MIN_DRAG = 0.01;
/** The smallest side a shape can be resized to. */
export const MIN_SHAPE_SIDE = 0.01;

/** The number shown in a step: dark on yellow, white on the darker colours. */
export function stepTextColor(color: AnnotationColor): string {
  return color === "#f9c909" ? "#424a52" : "#ffffff";
}

/** The step number from typed text: digits only, 1 to MAX_STEP_NUMBER, or null. */
export function parseStepNumber(text: string): number | null {
  if (!/^\d+$/.test(text.trim())) return null;
  const value = Number.parseInt(text.trim(), 10);
  return value >= 1 && value <= MAX_STEP_NUMBER ? value : null;
}

/** Image height in image widths. */
export const imageAspect = (size: { width: number; height: number }) =>
  size.height / size.width;

export type Point = { x: number; y: number };
export type Box = Point & { width: number; height: number };

/** A point kept inside the screenshot. */
export function clampToImage(point: Point, aspect: number): Point {
  return { x: clamp(point.x, 0, 1), y: clamp(point.y, 0, aspect) };
}

/** Whether a point is on the screenshot. */
export function onImage(point: Point, aspect: number): boolean {
  return point.x >= 0 && point.x <= 1 && point.y >= 0 && point.y <= aspect;
}

/**
 * The box dragged out from `start` to `end`, kept on the screenshot. A circle's
 * box is square: its side is the longer of the two drags.
 */
export function dragBox(
  start: Point,
  end: Point,
  shape: ShapeKind,
  aspect: number,
): Box {
  const to = clampToImage(end, aspect);
  let dx = to.x - start.x;
  let dy = to.y - start.y;
  if (shape === "circle") {
    // Square, but no bigger than the room in the drag's direction.
    const room = Math.min(
      dx < 0 ? start.x : 1 - start.x,
      dy < 0 ? start.y : aspect - start.y,
    );
    const side = Math.min(Math.max(Math.abs(dx), Math.abs(dy)), room);
    dx = Math.sign(dx || 1) * side;
    dy = Math.sign(dy || 1) * side;
  }
  return {
    x: Math.min(start.x, start.x + dx),
    y: Math.min(start.y, start.y + dy),
    width: Math.abs(dx),
    height: Math.abs(dy),
  };
}

/** The default-size shape for a click at `point`, kept on the screenshot. */
export function clickBox(point: Point, shape: ShapeKind, aspect: number): Box {
  let { width, height } = DEFAULT_SHAPE_SIZE;
  if (shape === "circle") width = height;
  width = Math.min(width, 1);
  height = Math.min(height, aspect);
  if (shape === "circle") width = height = Math.min(width, height);
  return {
    x: clamp(point.x - width / 2, 0, 1 - width),
    y: clamp(point.y - height / 2, 0, aspect - height),
    width,
    height,
  };
}

/** Whether a drag from `start` to `end` is long enough to be one. */
export function isDrag(start: Point, end: Point): boolean {
  return Math.hypot(end.x - start.x, end.y - start.y) >= MIN_DRAG;
}

const round4 = (value: number) => Math.round(value * 10000) / 10000;

/** Rounds positions and sizes so saved designs stay small. */
export function roundBox(box: Box): Box {
  return {
    x: round4(box.x),
    y: round4(box.y),
    width: Math.max(0.0001, round4(box.width)),
    height: Math.max(0.0001, round4(box.height)),
  };
}

export const roundPoint = (point: Point): Point => ({
  x: round4(point.x),
  y: round4(point.y),
});

/**
 * A box moved or resized, kept on the screenshot (as far as its size allows).
 * A `square` box (a circle's) stays square.
 */
export function fitBoxToImage(box: Box, aspect: number, square = false): Box {
  let width = Math.min(Math.max(box.width, MIN_SHAPE_SIDE), 1);
  let height = Math.min(Math.max(box.height, MIN_SHAPE_SIDE), aspect);
  if (square) width = height = Math.min(width, height);
  return {
    x: clamp(box.x, 0, 1 - width),
    y: clamp(box.y, 0, aspect - height),
    width,
    height,
  };
}

let counter = 0;

export function newAnnotationId(): string {
  counter += 1;
  return `a${Date.now().toString(36)}${counter.toString(36)}`;
}

export function isShape(annotation: Annotation): annotation is ShapeAnnotation {
  return annotation.kind === "shape";
}
