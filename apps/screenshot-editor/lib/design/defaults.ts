import { DEFAULT_GRADIENT } from "./gradients";
import { PADDING, RADIUS } from "./limits";
import type { Design } from "./schema";
import { DEFAULT_SHADOW, SHADOW_PRESETS } from "./shadows";

export const SHOT_LAYER_ID = "shot-1";

export function createDefaultDesign(): Design {
  return {
    version: 1,
    canvas: { preset: "auto" },
    background: {
      kind: "linear",
      presetId: DEFAULT_GRADIENT.id,
      angle: DEFAULT_GRADIENT.angle,
      stops: DEFAULT_GRADIENT.stops.map((stop) => ({ ...stop })),
    },
    layers: [
      {
        id: SHOT_LAYER_ID,
        kind: "shot",
        imageId: null,
        padding: PADDING.default,
        radius: RADIUS.default,
        shadow: { ...SHADOW_PRESETS[DEFAULT_SHADOW] },
      },
    ],
  };
}
