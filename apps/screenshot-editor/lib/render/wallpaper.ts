import type { Size } from "@/lib/design/layout";
import { getWallpaper, WALLPAPER_SIZE } from "@/lib/design/wallpapers";
import { coverCrop, sourceSize } from "./cover";

// Wallpapers are drawn by code once, at WALLPAPER_SIZE, and then used like an
// uploaded background image.

/** Full-size wallpapers kept (each is 14 MB of pixels), most recently used last. */
const KEEP_WALLPAPERS = 3;
const wallpapers = new Map<string, HTMLCanvasElement>();

function createCanvas(size: Size) {
  const canvas = document.createElement("canvas");
  canvas.width = size.width;
  canvas.height = size.height;
  return { canvas, context: canvas.getContext("2d") };
}

/** The wallpaper rendered at WALLPAPER_SIZE. Null for an unknown id or without a DOM. */
export function getWallpaperCanvas(id: string): HTMLCanvasElement | null {
  const cached = wallpapers.get(id);
  if (cached) {
    wallpapers.delete(id);
    wallpapers.set(id, cached);
    return cached;
  }
  const wallpaper = getWallpaper(id);
  if (!wallpaper || typeof document === "undefined") return null;
  const { canvas, context } = createCanvas(WALLPAPER_SIZE);
  if (!context) return null;
  wallpaper.draw(context, canvas.width, canvas.height);
  wallpapers.set(id, canvas);
  // Dropped ones may still be on screen, so they are left to the garbage collector.
  for (const key of wallpapers.keys()) {
    if (wallpapers.size <= KEEP_WALLPAPERS) break;
    wallpapers.delete(key);
  }
  return canvas;
}

/** Picker thumbnails: twice the size they are shown at, for sharp high-DPI screens. */
export const THUMBNAIL_SIZE: Size = { width: 192, height: 144 };

const toDataUrl = (canvas: HTMLCanvasElement) => {
  try {
    // Thumbnails are opaque, and JPEG is a fraction of the size of PNG.
    return canvas.toDataURL("image/jpeg", 0.88);
  } catch {
    return null;
  } finally {
    canvas.width = 0;
    canvas.height = 0;
  }
};

const wallpaperThumbnails = new Map<string, string | null>();

/**
 * A small JPEG data URL of a wallpaper, drawn by its own code at thumbnail
 * size (drawings adapt to any size). Memoised; null without a DOM.
 */
export function wallpaperThumbnail(id: string): string | null {
  if (wallpaperThumbnails.has(id)) return wallpaperThumbnails.get(id) ?? null;
  const wallpaper = getWallpaper(id);
  if (!wallpaper || typeof document === "undefined") return null;
  const { canvas, context } = createCanvas(THUMBNAIL_SIZE);
  let url: string | null = null;
  if (context) {
    wallpaper.draw(context, THUMBNAIL_SIZE.width, THUMBNAIL_SIZE.height);
    url = toDataUrl(canvas);
  }
  wallpaperThumbnails.set(id, url);
  return url;
}

const imageThumbnails = new WeakMap<object, string | null>();

/** A small cover-cropped JPEG data URL of an image, memoised per image. */
export function imageThumbnail(
  source: HTMLImageElement | HTMLCanvasElement,
): string | null {
  if (imageThumbnails.has(source)) return imageThumbnails.get(source) ?? null;
  if (typeof document === "undefined") return null;
  const size = sourceSize(source);
  if (size.width === 0 || size.height === 0) return null;
  const { canvas, context } = createCanvas(THUMBNAIL_SIZE);
  let url: string | null = null;
  if (context) {
    const crop = coverCrop(size, THUMBNAIL_SIZE);
    // Transparent parts of an upload show on white, as JPEG has no alpha.
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, THUMBNAIL_SIZE.width, THUMBNAIL_SIZE.height);
    context.imageSmoothingQuality = "high";
    context.drawImage(
      source,
      crop.x,
      crop.y,
      crop.width,
      crop.height,
      0,
      0,
      THUMBNAIL_SIZE.width,
      THUMBNAIL_SIZE.height,
    );
    url = toDataUrl(canvas);
  }
  imageThumbnails.set(source, url);
  return url;
}
