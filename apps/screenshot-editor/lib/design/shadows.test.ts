import { describe, expect, it } from "vitest";
import { shadowSpecSchema, SHADOW_PRESET_IDS } from "./schema";
import { isShadowPresetId, SHADOW_LABELS, SHADOW_PRESETS } from "./shadows";

describe("shadow presets", () => {
  it("are valid and named after their key", () => {
    for (const id of SHADOW_PRESET_IDS) {
      expect(shadowSpecSchema.safeParse(SHADOW_PRESETS[id]).success).toBe(true);
      expect(SHADOW_PRESETS[id].preset).toBe(id);
      expect(SHADOW_LABELS[id]).toBeTruthy();
    }
  });

  it("'none' is fully transparent", () => {
    expect(SHADOW_PRESETS.none.opacity).toBe(0);
  });

  it("recognises preset ids", () => {
    expect(isShadowPresetId("floating")).toBe(true);
    expect(isShadowPresetId("")).toBe(false);
    expect(isShadowPresetId("toString")).toBe(false);
  });
});
