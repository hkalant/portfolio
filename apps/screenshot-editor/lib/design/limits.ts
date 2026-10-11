// Sizes are in design pixels unless the name says otherwise.

/** Screenshots are shrunk (never enlarged) so their longest side fits this. */
export const MAX_DESIGN_SIDE = 1600;

/** M1 exports at 2x the design size. */
export const EXPORT_SCALE = 2;

export const PADDING = { min: 0, max: 200, step: 4, default: 64 } as const;
export const RADIUS = { min: 0, max: 64, step: 1, default: 12 } as const;
export const ANGLE = { min: 0, max: 359, step: 1 } as const;

export const MAX_FILE_BYTES = 50 * 1024 * 1024;

/** Larger images are rejected before they are decoded, to protect memory. */
export const MAX_SOURCE_PIXELS = 50_000_000;

/** Sources bigger than this are downscaled on load; it is all a 2x export can use. */
export const MAX_SOURCE_SIDE = MAX_DESIGN_SIDE * EXPORT_SCALE;

/** Safari refuses canvases larger than 4096 x 4096 pixels in area. */
export const MAX_CANVAS_AREA = 16_777_216;
export const MAX_CANVAS_SIDE = 16_384;
