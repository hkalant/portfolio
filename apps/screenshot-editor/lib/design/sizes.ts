// Canvas sizes for common destinations, in design pixels (the 1x export size).

export type SizePreset = {
  id: string;
  label: string;
  width: number;
  height: number;
};

export const SIZE_PRESETS = [
  { id: "x-post", label: "X post", width: 1600, height: 900 },
  { id: "linkedin", label: "LinkedIn post", width: 1200, height: 627 },
  { id: "og", label: "Open Graph image", width: 1200, height: 630 },
  {
    id: "instagram-square",
    label: "Instagram square",
    width: 1080,
    height: 1080,
  },
  {
    id: "instagram-portrait",
    label: "Instagram portrait",
    width: 1080,
    height: 1350,
  },
  { id: "story", label: "Story", width: 1080, height: 1920 },
  { id: "product-hunt", label: "Product Hunt", width: 1270, height: 760 },
  { id: "dribbble", label: "Dribbble shot", width: 1600, height: 1200 },
  { id: "youtube", label: "YouTube thumbnail", width: 1280, height: 720 },
] as const satisfies readonly SizePreset[];

export type SizePresetId = (typeof SIZE_PRESETS)[number]["id"];

export const SIZE_PRESET_IDS = SIZE_PRESETS.map((preset) => preset.id) as [
  SizePresetId,
  ...SizePresetId[],
];

/** Limits for a custom canvas size, per side. */
export const CUSTOM_SIZE = { min: 100, max: 4000 } as const;

export function getSizePreset(
  id: string,
): (typeof SIZE_PRESETS)[number] | undefined {
  return SIZE_PRESETS.find((preset) => preset.id === id);
}

export function isSizePresetId(id: string): id is SizePresetId {
  return SIZE_PRESETS.some((preset) => preset.id === id);
}

/**
 * "16:9" style ratio for a size, reduced by the greatest common divisor.
 * Ratios that don't reduce to small numbers read better as "1.91:1".
 */
export function aspectLabel(width: number, height: number): string {
  const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
  const w = Math.round(width);
  const h = Math.round(height);
  const divisor = gcd(w, h) || 1;
  if (Math.max(w, h) / divisor <= 21) return `${w / divisor}:${h / divisor}`;
  const ratio = (value: number) => String(Math.round(value * 100) / 100);
  return w >= h ? `${ratio(w / h)}:1` : `1:${ratio(h / w)}`;
}
