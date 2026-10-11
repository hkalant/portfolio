import { MAX_SOURCE_PIXELS, MAX_SOURCE_SIDE } from "@/lib/design/limits";
import { downscaleToCanvas, planDownscaleSteps } from "./downscale";

/** A decoded image ready for drawing. Lives in the store, not in the design JSON. */
export type LoadedImage = {
  id: string;
  name: string;
  source: HTMLImageElement | HTMLCanvasElement;
  /** Original size in pixels, before any downscaling on load. */
  width: number;
  height: number;
  /** Frees the memory behind `source`. Safe to call more than once. */
  release: () => void;
};

export type ImageLoadFailure = "unreadable" | "tooManyPixels";

export class ImageLoadError extends Error {
  constructor(readonly reason: ImageLoadFailure) {
    super(
      reason === "tooManyPixels"
        ? "Image has too many pixels"
        : "Image could not be decoded",
    );
    this.name = "ImageLoadError";
  }
}

let nextId = 0;
function createImageId(): string {
  nextId += 1;
  return `img-${nextId}-${Date.now().toString(36)}`;
}

function waitForLoad(image: HTMLImageElement, url: string): Promise<void> {
  return new Promise((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = () => reject(new ImageLoadError("unreadable"));
    image.src = url;
  });
}

export async function loadImageFromBlob(
  blob: Blob,
  name: string,
): Promise<LoadedImage> {
  const url = URL.createObjectURL(blob);
  const image = new Image();
  try {
    await waitForLoad(image, url);
    const { naturalWidth: width, naturalHeight: height } = image;
    if (!width || !height) throw new ImageLoadError("unreadable");
    // Check the size before decode() so a huge image is never fully decoded.
    if (width * height > MAX_SOURCE_PIXELS)
      throw new ImageLoadError("tooManyPixels");
    try {
      await image.decode();
    } catch {
      // Some browsers reject decode() for images that are in fact usable.
      if (!(image.complete && image.naturalWidth > 0))
        throw new ImageLoadError("unreadable");
    }

    const steps = planDownscaleSteps(width, height, MAX_SOURCE_SIDE);
    if (steps.length > 0) {
      const canvas = downscaleToCanvas(image, steps);
      // The full-size image is no longer needed; it is freed once unreferenced.
      URL.revokeObjectURL(url);
      return {
        id: createImageId(),
        name,
        source: canvas,
        width,
        height,
        release: () => {
          canvas.width = 0;
          canvas.height = 0;
        },
      };
    }

    let released = false;
    return {
      id: createImageId(),
      name,
      source: image,
      width,
      height,
      release: () => {
        if (released) return;
        released = true;
        URL.revokeObjectURL(url);
      },
    };
  } catch (error) {
    URL.revokeObjectURL(url);
    throw error;
  }
}
