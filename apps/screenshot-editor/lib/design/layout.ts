import { frameMetrics } from "./frames";
import { MAX_DESIGN_SIDE } from "./limits";
import type { Design } from "./schema";

export type Size = { width: number; height: number };
export type Rect = Size & { x: number; y: number };
/** Top-left, top-right, bottom-right, bottom-left, as Konva's cornerRadius array. */
export type CornerRadii = [number, number, number, number];

/** Shrinks (never enlarges) a size so its longest side is at most `maxSide`. Whole pixels. */
export function fitWithin(size: Size, maxSide: number): Size {
  const scale = Math.min(1, maxSide / Math.max(size.width, size.height));
  return {
    width: Math.max(1, Math.round(size.width * scale)),
    height: Math.max(1, Math.round(size.height * scale)),
  };
}

/** The framed screenshot, in canvas px. Rects are relative to the shot's top-left. */
export type ShotLayout = Rect & {
  /** Factor from natural design px to canvas px (1 on an auto canvas). */
  scale: number;
  /** Degrees, about the shot's centre. */
  rotation: number;
  /** Outer corner radius, never more than half the shorter side. */
  radius: number;
  /** The screenshot itself. */
  image: Rect;
  imageRadii: CornerRadii;
  /** The inset area around the screenshot; the same as `image` without an inset. */
  content: Rect;
  /** The title or address bar, if the frame has one. */
  chrome: Rect | null;
  /** Size multiplier for chrome details (buttons, text), in canvas px. */
  unit: number;
};

export type DesignLayout = {
  /** The whole design, which is also the exported image at 1x. Whole pixels. */
  canvas: Size;
  shot: ShotLayout;
  /** The shot can be moved by dragging (fixed canvas sizes only). */
  draggable: boolean;
};

/**
 * Where everything goes. On an "auto" canvas the canvas is the framed shot plus
 * padding on every side. On a fixed canvas the framed shot is fitted inside the
 * padding, multiplied by its scale and centred on its position. The shadow does
 * not grow the canvas, so with little padding it is cut off at the edges.
 */
export function computeLayout(source: Size, design: Design): DesignLayout {
  const shot = design.layers[0];
  const image = fitWithin(source, MAX_DESIGN_SIDE);
  const { chromeTop, ring, unit } = frameMetrics(shot.frame.kind, image.width);
  const inset = shot.inset.size;
  const natural = {
    width: image.width + 2 * inset + 2 * ring,
    height: image.height + 2 * inset + 2 * ring + chromeTop,
  };
  const { padding } = shot;

  let canvas: Size;
  let scale: number;
  let x: number;
  let y: number;
  if (design.canvas.preset === "auto") {
    scale = 1;
    canvas = {
      width: Math.round(natural.width + 2 * padding),
      height: Math.round(natural.height + 2 * padding),
    };
    x = padding;
    y = padding;
  } else {
    canvas = { width: design.canvas.width, height: design.canvas.height };
    const available = {
      width: Math.max(1, canvas.width - 2 * padding),
      height: Math.max(1, canvas.height - 2 * padding),
    };
    scale =
      Math.min(
        available.width / natural.width,
        available.height / natural.height,
      ) * shot.scale;
    x = shot.position.x * canvas.width - (natural.width * scale) / 2;
    y = shot.position.y * canvas.height - (natural.height * scale) / 2;
  }

  const width = natural.width * scale;
  const height = natural.height * scale;
  const radius = Math.max(0, Math.min(shot.radius, width / 2, height / 2));
  const imageRect: Rect = {
    x: (ring + inset) * scale,
    y: (ring + chromeTop + inset) * scale,
    width: image.width * scale,
    height: image.height * scale,
  };
  const inner = Math.max(
    0,
    Math.min(
      radius - (inset + ring) * scale,
      imageRect.width / 2,
      imageRect.height / 2,
    ),
  );
  const top = chromeTop > 0 ? 0 : inner;

  return {
    canvas,
    draggable: design.canvas.preset !== "auto",
    shot: {
      x,
      y,
      width,
      height,
      scale,
      rotation: shot.rotation,
      radius,
      image: imageRect,
      imageRadii: [top, top, inner, inner],
      content: {
        x: ring * scale,
        y: (ring + chromeTop) * scale,
        width: (image.width + 2 * inset) * scale,
        height: (image.height + 2 * inset) * scale,
      },
      chrome:
        chromeTop > 0
          ? {
              x: ring * scale,
              y: ring * scale,
              width: (natural.width - 2 * ring) * scale,
              height: chromeTop * scale,
            }
          : null,
      unit: unit * scale,
    },
  };
}

/**
 * The shot position (centre, as a fraction of the canvas) that lines its
 * unrotated edges up with the padding: "start" is left or top.
 */
export function alignedPosition(
  layout: DesignLayout,
  padding: number,
  horizontal: Alignment,
  vertical: Alignment,
): { x: number; y: number } {
  const along = (alignment: Alignment, canvas: number, size: number) => {
    if (alignment === "center") return 0.5;
    const centre =
      alignment === "start" ? padding + size / 2 : canvas - padding - size / 2;
    return Math.min(1, Math.max(0, centre / canvas));
  };
  return {
    x: along(horizontal, layout.canvas.width, layout.shot.width),
    y: along(vertical, layout.canvas.height, layout.shot.height),
  };
}

export type Alignment = "start" | "center" | "end";

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
