import { describe, expect, it } from "vitest";
import {
  aspectLabel,
  getSizePreset,
  isSizePresetId,
  lockedSize,
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

describe("lockedSize", () => {
  const wide = { width: 1600, height: 900 };

  it("follows the ratio from the typed side", () => {
    expect(lockedSize(wide, "width", 800)).toEqual({ width: 800, height: 450 });
    expect(lockedSize(wide, "height", 450)).toEqual({
      width: 800,
      height: 450,
    });
  });

  it("limits the typed side so the ratio survives the size limits", () => {
    expect(lockedSize(wide, "width", 100)).toEqual({ width: 178, height: 100 });
    expect(lockedSize(wide, "height", 3000)).toEqual({
      width: 4000,
      height: 2250,
    });
    const story = { width: 1080, height: 1920 };
    expect(lockedSize(story, "width", 3000)).toEqual({
      width: 2250,
      height: 4000,
    });
    expect(lockedSize(story, "height", 50)).toEqual({
      width: 100,
      height: 178,
    });
  });

  it("uses the ratio it was locked at, so rounding doesn't drift", () => {
    // 1000 × 630 locked, then shrunk to 159 × 100: that size's own ratio is
    // a little off, and growing back from it would give 1000 × 629.
    const shrunk = { width: 159, height: 100 };
    expect(lockedSize(shrunk, "width", 1000)).toEqual({
      width: 1000,
      height: 629,
    });
    expect(lockedSize(shrunk, "width", 1000, 1000 / 630)).toEqual({
      width: 1000,
      height: 630,
    });
    expect(lockedSize(shrunk, "height", 630, 1000 / 630)).toEqual({
      width: 1000,
      height: 630,
    });
  });

  it("keeps an extreme ratio at its only possible size", () => {
    const strip = { width: 4000, height: 100 };
    expect(lockedSize(strip, "width", 500)).toEqual({
      width: 4000,
      height: 100,
    });
  });
});
