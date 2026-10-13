import { hexToRgba } from "@/lib/design/colors";
import type { MeshBlob, MeshPreset } from "@/lib/design/meshes";

/**
 * Alpha along a blob's radius, centre to edge: a smoothstep fall-off, so a
 * blob has no visible rim. [offset, alpha] pairs.
 */
export const BLOB_FALLOFF: readonly (readonly [number, number])[] = Array.from(
  { length: 9 },
  (_, i) => {
    const t = i / 8;
    return [t, Math.round((1 - t * t * (3 - 2 * t)) * 1000) / 1000] as const;
  },
);

/** A blob's centre and radius in canvas px. Radii are fractions of the longer side. */
export function blobCircle(
  blob: MeshBlob,
  width: number,
  height: number,
): { x: number; y: number; r: number } {
  return {
    x: blob.x * width,
    y: blob.y * height,
    r: Math.max(1e-3, blob.r * Math.max(width, height)),
  };
}

type MeshContext = Pick<
  CanvasRenderingContext2D,
  "save" | "restore" | "fillRect" | "createRadialGradient" | "fillStyle"
>;

/**
 * Paints a mesh: the base colour, then each blob as a radial gradient from its
 * colour to transparent. Draws in the context's current coordinates, so under
 * Konva's transform it is sharp at any pixel ratio.
 */
export function drawMesh(
  context: MeshContext,
  preset: MeshPreset,
  width: number,
  height: number,
): void {
  context.save();
  context.fillStyle = preset.base;
  context.fillRect(0, 0, width, height);
  for (const blob of preset.blobs) {
    const { x, y, r } = blobCircle(blob, width, height);
    const gradient = context.createRadialGradient(x, y, 0, x, y, r);
    for (const [offset, alpha] of BLOB_FALLOFF)
      gradient.addColorStop(offset, hexToRgba(blob.color, alpha));
    context.fillStyle = gradient;
    // Outside the circle the gradient is fully transparent: fill only its box.
    const left = Math.max(0, x - r);
    const top = Math.max(0, y - r);
    const right = Math.min(width, x + r);
    const bottom = Math.min(height, y + r);
    if (right > left && bottom > top)
      context.fillRect(left, top, right - left, bottom - top);
  }
  context.restore();
}

/**
 * The same mesh as CSS for a square swatch: one radial gradient per blob (the
 * last blob first, since CSS puts the first layer on top) over the base colour.
 */
export function meshCss(preset: MeshPreset): {
  backgroundColor: string;
  backgroundImage: string;
} {
  const layers = preset.blobs.map((blob) => {
    const size = `${round(blob.r * 100)}%`;
    const stops = BLOB_FALLOFF.map(
      ([offset, alpha]) =>
        `${hexToRgba(blob.color, alpha)} ${round(offset * 100)}%`,
    ).join(", ");
    return `radial-gradient(${size} ${size} at ${round(blob.x * 100)}% ${round(blob.y * 100)}%, ${stops})`;
  });
  return {
    backgroundColor: preset.base,
    backgroundImage: layers.reverse().join(", "),
  };
}

const round = (value: number) => Math.round(value * 10) / 10;
