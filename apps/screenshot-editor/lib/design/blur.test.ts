import { describe, expect, it } from "vitest";
import { blurArea, blurRadius } from "./blur";

describe("blur", () => {
  it("gets stronger with intensity, within limits", () => {
    expect(blurRadius(0)).toBeLessThan(blurRadius(0.5));
    expect(blurRadius(0.5)).toBeLessThan(blurRadius(1));
    expect(blurRadius(2)).toBe(blurRadius(1));
  });

  it("covers only the part of a box over the screenshot", () => {
    const area = blurArea({ x: -0.1, y: 0.5, width: 0.3, height: 0.5 }, 0.75)!;
    expect(area.x).toBe(0);
    expect(area.y).toBe(0.5);
    expect(area.width).toBeCloseTo(0.2);
    expect(area.height).toBeCloseTo(0.25);
    expect(
      blurArea({ x: 1.1, y: 0, width: 0.2, height: 0.2 }, 0.75),
    ).toBeNull();
  });
});
