import { describe, expect, it } from "vitest";
import { normalizeHex } from "./colors";
import { FRAME_KINDS, FRAME_LABELS, frameMetrics, frameUnit } from "./frames";

describe("frameMetrics", () => {
  it("has no chrome for none and a ring only for glass", () => {
    expect(frameMetrics("none", 1000)).toEqual({
      chromeTop: 0,
      ring: 0,
      unit: 1,
    });
    expect(frameMetrics("glass", 1000)).toMatchObject({
      chromeTop: 0,
      ring: 16,
    });
    expect(frameMetrics("browser", 1000)).toMatchObject({
      chromeTop: 48,
      ring: 0,
    });
  });

  it("scales with the screenshot width within limits", () => {
    expect(frameUnit(500)).toBe(0.6);
    expect(frameUnit(1200)).toBe(1.2);
    expect(frameUnit(5000)).toBe(1.6);
    expect(frameMetrics("macos", 1200).chromeTop).toBe(Math.round(34 * 1.2));
  });

  it("labels every frame kind", () => {
    for (const kind of FRAME_KINDS) expect(FRAME_LABELS[kind]).toBeTruthy();
  });
});

describe("normalizeHex", () => {
  it("accepts typed colours with or without # and in short form", () => {
    expect(normalizeHex("ABC")).toBe("#aabbcc");
    expect(normalizeHex(" #A1B2C3 ")).toBe("#a1b2c3");
    expect(normalizeHex("12345")).toBeNull();
    expect(normalizeHex("red")).toBeNull();
  });
});
