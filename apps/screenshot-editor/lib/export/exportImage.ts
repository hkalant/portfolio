import type Konva from "konva";
import type { Size } from "@/lib/design/layout";
import { exportFilename } from "./filename";

/**
 * Renders the layer at its true design size times `pixelRatio`, whatever the
 * on-screen zoom. The stage scale is reset for the render and restored after.
 * A whole-number ratio gives exactly width*ratio x height*ratio pixels.
 */
export function renderLayerToCanvas(
  stage: Konva.Stage,
  layer: Konva.Layer,
  size: Size,
  pixelRatio: number,
): HTMLCanvasElement {
  const previous = stage.scale();
  stage.scale({ x: 1, y: 1 });
  try {
    // layer.toCanvas needs one full-size canvas; stage.toCanvas would need two.
    return layer.toCanvas({
      x: 0,
      y: 0,
      width: size.width,
      height: size.height,
      pixelRatio,
    });
  } finally {
    stage.scale(previous);
    stage.batchDraw();
  }
}

export function canvasToBlob(
  canvas: HTMLCanvasElement,
  type = "image/png",
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) =>
        blob ? resolve(blob) : reject(new Error("Canvas could not be encoded")),
      type,
    );
  });
}

// The last download URL stays valid until the next export (or a minute), so a
// slow save sheet, as on iOS, still gets the file.
let lastDownload: { url: string; timer: number } | null = null;

function revokeLastDownload() {
  if (!lastDownload) return;
  window.clearTimeout(lastDownload.timer);
  URL.revokeObjectURL(lastDownload.url);
  lastDownload = null;
}

export function downloadBlob(blob: Blob, filename: string) {
  revokeLastDownload();
  const url = URL.createObjectURL(blob);
  lastDownload = { url, timer: window.setTimeout(revokeLastDownload, 60_000) };
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.rel = "noopener";
  link.style.display = "none";
  document.body.append(link);
  link.click();
  link.remove();
}

/** Lets the browser paint (e.g. a disabled Export button) before the heavy render. */
export const nextPaint = () =>
  new Promise<void>((resolve) =>
    requestAnimationFrame(() => window.setTimeout(resolve, 0)),
  );

/**
 * Renders and downloads the design. The render happens synchronously, before
 * the first await, so `size` and the drawn layer come from the same moment.
 */
export async function exportDesignPng(options: {
  stage: Konva.Stage;
  layer: Konva.Layer;
  size: Size;
  scale: number;
  sourceName: string | null;
}): Promise<string> {
  const canvas = renderLayerToCanvas(
    options.stage,
    options.layer,
    options.size,
    options.scale,
  );
  try {
    const blob = await canvasToBlob(canvas);
    const filename = exportFilename(options.sourceName, options.scale);
    downloadBlob(blob, filename);
    return filename;
  } finally {
    // Free the bitmap now rather than at garbage collection (helps Safari).
    canvas.width = 0;
    canvas.height = 0;
  }
}
