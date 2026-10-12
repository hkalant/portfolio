import { describe, expect, it } from "vitest";
import {
  aspectLabel,
  getSizePreset,
  isSizePresetId,
  SIZE_PRESETS,
} from "./sizes";

describe("size presets", () => {
  it("have unique ids and whole-pixel sizes", () => {
    expect(new Set(SIZE_PRESETS.map((p) => p.id)).size).toBe(
      SIZE_PRESETS.length,
    );
    for (const preset of SIZE_PRESETS) {
      expect(
        Number.isInteger(preset.width) && Number.isInteger(preset.height),
      ).toBe(true);
    }
  });

  it("can be looked up", () => {
    expect(getSizePreset("x-post")).toMatchObject({ width: 1600, height: 900 });
    expect(isSizePresetId("story")).toBe(true);
    expect(isSizePresetId("auto")).toBe(false);
  });

  it("labels aspect ratios", () => {
    expect(aspectLabel(1600, 900)).toBe("16:9");
    expect(aspectLabel(1080, 1350)).toBe("4:5");
    expect(aspectLabel(1080, 1920)).toBe("9:16");
    expect(aspectLabel(1200, 627)).toBe("1.91:1");
    expect(aspectLabel(1270, 760)).toBe("1.67:1");
    expect(aspectLabel(760, 1270)).toBe("1:1.67");
  });
});
