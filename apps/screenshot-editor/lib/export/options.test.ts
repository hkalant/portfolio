import { describe, expect, it } from "vitest";
import {
  DEFAULT_EXPORT_OPTIONS,
  FORMAT_INFO,
  sanitizeExportOptions,
} from "./options";

describe("export options", () => {
  it("falls back to defaults for junk", () => {
    expect(sanitizeExportOptions(null)).toEqual(DEFAULT_EXPORT_OPTIONS);
    expect(
      sanitizeExportOptions({ format: "gif", scale: 7, quality: "x" }),
    ).toEqual(DEFAULT_EXPORT_OPTIONS);
  });

  it("turns a remembered 4x, which was removed, into the default scale", () => {
    expect(sanitizeExportOptions({ format: "png", scale: 4 }).scale).toBe(
      DEFAULT_EXPORT_OPTIONS.scale,
    );
  });

  it("keeps valid values and clamps quality", () => {
    expect(
      sanitizeExportOptions({ format: "webp", scale: 3, quality: 2 }),
    ).toEqual({
      format: "webp",
      scale: 3,
      quality: 1,
    });
    expect(
      sanitizeExportOptions({ format: "jpeg", scale: 1, quality: 0.1 }).quality,
    ).toBe(0.5);
  });

  it("knows which formats keep transparency", () => {
    expect(FORMAT_INFO.jpeg.alpha).toBe(false);
    expect(FORMAT_INFO.png.alpha && FORMAT_INFO.webp.alpha).toBe(true);
    expect(FORMAT_INFO.jpeg.extension).toBe("jpg");
  });
});
