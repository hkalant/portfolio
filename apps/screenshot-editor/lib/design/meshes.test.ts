import { describe, expect, it } from "vitest";
import { isHexColor } from "./colors";
import { DEFAULT_MESH, getMeshPreset, MESH_PRESETS } from "./meshes";

describe("MESH_PRESETS", () => {
  it("has unique ids and names", () => {
    expect(MESH_PRESETS.length).toBeGreaterThanOrEqual(6);
    expect(new Set(MESH_PRESETS.map((preset) => preset.id)).size).toBe(
      MESH_PRESETS.length,
    );
    expect(new Set(MESH_PRESETS.map((preset) => preset.name)).size).toBe(
      MESH_PRESETS.length,
    );
  });

  it("uses #rrggbb colours and blobs within the canvas", () => {
    for (const preset of MESH_PRESETS) {
      expect(isHexColor(preset.base), preset.id).toBe(true);
      expect(preset.blobs.length, preset.id).toBeGreaterThan(0);
      for (const blob of preset.blobs) {
        expect(isHexColor(blob.color), preset.id).toBe(true);
        for (const fraction of [blob.x, blob.y]) {
          expect(fraction).toBeGreaterThanOrEqual(0);
          expect(fraction).toBeLessThanOrEqual(1);
        }
        expect(blob.r).toBeGreaterThan(0);
        expect(blob.r).toBeLessThanOrEqual(1.5);
      }
    }
  });

  it("starts with the default and finds presets by id", () => {
    expect(DEFAULT_MESH).toBe(MESH_PRESETS[0]);
    expect(getMeshPreset("lagoon")?.name).toBe("Lagoon");
    expect(getMeshPreset("nope")).toBeUndefined();
  });
});
