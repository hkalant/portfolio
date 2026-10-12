import type { Rect, Size } from "@/lib/design/layout";

/** How much `source` is scaled so it covers `target` (CSS `object-fit: cover`). */
export function coverScale(source: Size, target: Size): number {
  return Math.max(target.width / source.width, target.height / source.height);
}

/**
 * The centred part of `source`, in source pixels, that fills `target` when
 * cover-fitted. Konva's `crop` takes exactly this.
 */
export function coverCrop(source: Size, target: Size): Rect {
  const scale = coverScale(source, target);
  const width = Math.min(source.width, target.width / scale);
  const height = Math.min(source.height, target.height / scale);
  return {
    x: (source.width - width) / 2,
    y: (source.height - height) / 2,
    width,
    height,
  };
}

/** Pixel size of an image or canvas. Zero for a released or broken one. */
export function sourceSize(source: HTMLImageElement | HTMLCanvasElement): Size {
  // `in` rather than instanceof, so this also runs where there is no DOM.
  return "naturalWidth" in source
    ? { width: source.naturalWidth, height: source.naturalHeight }
    : { width: source.width, height: source.height };
}
