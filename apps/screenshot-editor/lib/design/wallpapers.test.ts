import { describe, expect, it } from "vitest";
import { createFakeContext } from "@/lib/render/fakeContext";
import { isHexColor } from "./colors";
import {
  DEFAULT_WALLPAPER,
  getWallpaper,
  WALLPAPER_SIZE,
  WALLPAPERS,
} from "./wallpapers";

const SIZES = [
  [WALLPAPER_SIZE.width, WALLPAPER_SIZE.height],
  [192, 144],
  [1080, 1920],
  [1, 1],
] as const;

describe("WALLPAPERS", () => {
  it("has unique ids and names, starting with the default", () => {
    expect(WALLPAPERS.length).toBeGreaterThanOrEqual(6);
    expect(WALLPAPERS[0].id).toBe("waves");
    expect(DEFAULT_WALLPAPER).toBe(WALLPAPERS[0]);
    expect(new Set(WALLPAPERS.map((w) => w.id)).size).toBe(WALLPAPERS.length);
    expect(getWallpaper("dunes")?.name).toBe("Dunes");
    expect(getWallpaper("nope")).toBeUndefined();
  });

  it("has names that don't contain one another, so each is easy to find", () => {
    for (const a of WALLPAPERS)
      for (const b of WALLPAPERS)
        if (a !== b)
          expect(b.name.toLowerCase()).not.toContain(a.name.toLowerCase());
  });

  it("has #rrggbb swatch colours", () => {
    for (const wallpaper of WALLPAPERS)
      for (const color of wallpaper.swatch)
        expect(isHexColor(color), wallpaper.id).toBe(true);
  });

  it("draws at any size without calls a canvas would reject", () => {
    for (const wallpaper of WALLPAPERS)
      for (const [width, height] of SIZES) {
        const { context, log, problems } = createFakeContext();
        wallpaper.draw(context, width, height);
        expect(problems, `${wallpaper.id} at ${width}x${height}`).toEqual([]);
        expect(log.length).toBeGreaterThan(0);
      }
  });

  it("draws the same picture every time", () => {
    for (const wallpaper of WALLPAPERS) {
      const first = createFakeContext();
      const second = createFakeContext();
      wallpaper.draw(first.context, 800, 500);
      wallpaper.draw(second.context, 800, 500);
      expect(second.log, wallpaper.id).toEqual(first.log);
    }
  });

  it("still draws where conic gradients are missing", () => {
    for (const wallpaper of WALLPAPERS) {
      const { context, problems } = createFakeContext({ conic: false });
      wallpaper.draw(context, 800, 500);
      expect(problems, wallpaper.id).toEqual([]);
    }
  });
});
