export const EXPORT_FORMATS = ["png", "jpeg", "webp"] as const;
export type ExportFormat = (typeof EXPORT_FORMATS)[number];

export const EXPORT_SCALES = [1, 2] as const;
export type ExportScale = (typeof EXPORT_SCALES)[number];

export type ExportOptions = {
  format: ExportFormat;
  /** 0.5..1, used by JPEG and WebP. */
  quality: number;
  scale: ExportScale;
};

export const DEFAULT_EXPORT_OPTIONS: ExportOptions = {
  format: "png",
  quality: 0.92,
  scale: 2,
};

export const FORMAT_INFO: Record<
  ExportFormat,
  { label: string; mime: string; extension: string; alpha: boolean }
> = {
  png: { label: "PNG", mime: "image/png", extension: "png", alpha: true },
  jpeg: { label: "JPEG", mime: "image/jpeg", extension: "jpg", alpha: false },
  webp: { label: "WebP", mime: "image/webp", extension: "webp", alpha: true },
};

export function isExportFormat(value: string): value is ExportFormat {
  return (EXPORT_FORMATS as readonly string[]).includes(value);
}

export function isExportScale(value: number): value is ExportScale {
  return (EXPORT_SCALES as readonly number[]).includes(value);
}

/** Options from untrusted storage, falling back to defaults field by field. */
export function sanitizeExportOptions(value: unknown): ExportOptions {
  const input = (value ?? {}) as Partial<Record<keyof ExportOptions, unknown>>;
  const quality =
    typeof input.quality === "number" && Number.isFinite(input.quality)
      ? Math.min(1, Math.max(0.5, input.quality))
      : DEFAULT_EXPORT_OPTIONS.quality;
  return {
    format:
      typeof input.format === "string" && isExportFormat(input.format)
        ? input.format
        : DEFAULT_EXPORT_OPTIONS.format,
    quality: Math.round(quality * 100) / 100,
    scale:
      typeof input.scale === "number" && isExportScale(input.scale)
        ? input.scale
        : DEFAULT_EXPORT_OPTIONS.scale,
  };
}
