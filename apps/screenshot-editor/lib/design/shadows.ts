import {
  SHADOW_PRESET_IDS,
  type ShadowPresetId,
  type ShadowSpec,
} from "./schema";

/** Values are in design pixels. Konva's shadowBlur matches CSS box-shadow blur. */
export const SHADOW_PRESETS: Record<ShadowPresetId, ShadowSpec> = {
  none: {
    preset: "none",
    offsetX: 0,
    offsetY: 0,
    blur: 0,
    color: "#000000",
    opacity: 0,
  },
  soft: {
    preset: "soft",
    offsetX: 0,
    offsetY: 8,
    blur: 24,
    color: "#000000",
    opacity: 0.18,
  },
  medium: {
    preset: "medium",
    offsetX: 0,
    offsetY: 16,
    blur: 40,
    color: "#000000",
    opacity: 0.28,
  },
  floating: {
    preset: "floating",
    offsetX: 0,
    offsetY: 32,
    blur: 64,
    color: "#000000",
    opacity: 0.35,
  },
  hard: {
    preset: "hard",
    offsetX: 12,
    offsetY: 12,
    blur: 0,
    color: "#000000",
    opacity: 0.9,
  },
};

export const SHADOW_PRESET_ORDER = SHADOW_PRESET_IDS;

export const SHADOW_LABELS: Record<ShadowPresetId, string> = {
  none: "None",
  soft: "Soft",
  medium: "Medium",
  floating: "Floating",
  hard: "Hard",
};

export const DEFAULT_SHADOW: ShadowPresetId = "medium";

export function isShadowPresetId(value: string): value is ShadowPresetId {
  return (SHADOW_PRESET_IDS as readonly string[]).includes(value);
}
