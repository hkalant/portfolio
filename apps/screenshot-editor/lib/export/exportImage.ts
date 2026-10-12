import type Konva from "konva";
import type { Size } from "@/lib/design/layout";
import { exportFilename } from "./filename";
import { exportPixelSize, safePixelRatio } from "./limits";
import { FORMAT_INFO, type ExportFormat } from "./options";

/** Nodes with this name are shown on screen but left out of exports (e.g. snap guides). */
export const EXPORT_HIDDEN = "export-hidden";

/**
 * Renders the layer at its true design size times `pixelRatio`, whatever the
 * on-screen zoom. The stage scale is reset for the render and restored after.
 * The output is floor(width * ratio) x floor(height * ratio) pixels.
 */
export function renderLayerToCanvas(
  stage: Konva.Stage,
  layer: Konva.Layer,
  size: Size,
  pixelRatio: number,
): HTMLCanvasElement {
  const previous = stage.scale();
  const hidden = layer
    .find(`.${EXPORT_HIDDEN}`)
    .filter((node) => node.visible());
  stage.scale({ x: 1, y: 1 });
  for (const node of hidden) node.visible(false);
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
    for (const node of hidden) node.visible(true);
    stage.scale(previous);
    stage.batchDraw();
  }
}

/** Paints `color` under everything already drawn: for formats without transparency. */
export function fillBehind(canvas: HTMLCanvasElement, color = "#ffffff") {
  const context = canvas.getContext("2d");
  if (!context) return;
  context.save();
  context.setTransform(1, 0, 0, 1, 0, 0);
  context.globalCompositeOperation = "destination-over";
  context.fillStyle = color;
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.restore();
}

export function canvasToBlob(
  canvas: HTMLCanvasElement,
  type = "image/png",
  quality?: number,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) =>
        blob ? resolve(blob) : reject(new Error("Canvas could not be encoded")),
      type,
      quality,
    );
  });
}

/** Frees a canvas bitmap now rather than at garbage collection (helps Safari). */
export function releaseCanvas(canvas: HTMLCanvasElement) {
  canvas.width = 0;
  canvas.height = 0;
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

export type RenderTarget = {
  stage: Konva.Stage;
  layer: Konva.Layer;
  /** The design's canvas size (the 1x export). */
  size: Size;
};

export type ExportPlan = {
  /** The pixel ratio actually used: the chosen scale unless it was capped. */
  ratio: number;
  pixels: Size;
  capped: boolean;
};

/** What an export at `scale` will produce, after the browser canvas cap. */
export function planExport(size: Size, scale: number): ExportPlan {
  const ratio = safePixelRatio(size, scale);
  return { ratio, pixels: exportPixelSize(size, ratio), capped: ratio < scale };
}

/**
 * Renders the design and encodes it. The render happens synchronously, before
 * the first await, so the size and the drawn layer come from the same moment.
 */
export async function renderDesignBlob(
  target: RenderTarget,
  options: { format: ExportFormat; quality: number; scale: number },
): Promise<{ blob: Blob; plan: ExportPlan }> {
  const plan = planExport(target.size, options.scale);
  const canvas = renderLayerToCanvas(
    target.stage,
    target.layer,
    target.size,
    plan.ratio,
  );
  try {
    const info = FORMAT_INFO[options.format];
    if (!info.alpha) fillBehind(canvas);
    const blob = await canvasToBlob(
      canvas,
      info.mime,
      info.alpha && options.format === "png" ? undefined : options.quality,
    );
    return { blob, plan };
  } finally {
    releaseCanvas(canvas);
  }
}

/** Renders, encodes and downloads the design. Returns the file name. */
export async function exportDesign(
  target: RenderTarget,
  options: { format: ExportFormat; quality: number; scale: number },
  sourceName: string | null,
): Promise<{ filename: string; plan: ExportPlan }> {
  const { blob, plan } = await renderDesignBlob(target, options);
  const filename = exportFilename(
    sourceName,
    options.scale,
    new Date(),
    FORMAT_INFO[options.format].extension,
  );
  downloadBlob(blob, filename);
  return { filename, plan };
}

/** True when this browser can put an image on the clipboard. */
export function canCopyImages(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.ClipboardItem === "function" &&
    typeof navigator.clipboard?.write === "function"
  );
}

/**
 * Puts a PNG on the clipboard. Call it straight from a click or key handler:
 * the clipboard write starts synchronously and `makeBlob` fills it in later
 * (Safari only allows the write inside the user's gesture).
 */
export function copyPngToClipboard(
  makeBlob: () => Promise<Blob>,
): Promise<void> {
  if (!canCopyImages())
    return Promise.reject(new Error("Clipboard images are not supported"));
  const item = new ClipboardItem({ "image/png": makeBlob() });
  return navigator.clipboard.write([item]);
}
