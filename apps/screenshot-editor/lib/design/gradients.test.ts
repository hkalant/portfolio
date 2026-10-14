import { describe, expect, it } from "vitest";
import {
  BROOKES_COLORS,
  DEFAULT_GRADIENT,
  getGradientPreset,
  GRADIENT_PRESETS,
  linearGradientPoints,
  normalizeAngle,
  toCssLinearGradient,
  toKonvaColorStops,
} from "./gradients";
import { linearBackgroundSchema } from "./schema";

const close = (
  actual: { x: number; y: number },
  expected: { x: number; y: number },
) => {
  expect(actual.x).toBeCloseTo(expected.x, 6);
  expect(actual.y).toBeCloseTo(expected.y, 6);
};

describe("linearGradientPoints (CSS angle rules)", () => {
  it("90deg runs left to right through the middle", () => {
    const { start, end } = linearGradientPoints(90, 200, 100);
    close(start, { x: 0, y: 50 });
    close(end, { x: 200, y: 50 });
  });

  it("0deg runs bottom to top, 180deg top to bottom", () => {
    let { start, end } = linearGradientPoints(0, 200, 100);
    close(start, { x: 100, y: 100 });
    close(end, { x: 100, y: 0 });
    ({ start, end } = linearGradientPoints(180, 200, 100));
    close(start, { x: 100, y: 0 });
    close(end, { x: 100, y: 100 });
  });

  it("135deg on a square runs corner to corner", () => {
    const { start, end } = linearGradientPoints(135, 300, 300);
    close(start, { x: 0, y: 0 });
    close(end, { x: 300, y: 300 });
  });

  it("135deg on a wide box reaches past the corners like CSS", () => {
    const { start, end } = linearGradientPoints(135, 400, 200);
    // Gradient line length is |w sin a| + |h cos a| = 300 * sqrt(2).
    expect(Math.hypot(end.x - start.x, end.y - start.y)).toBeCloseTo(
      300 * Math.SQRT2,
      6,
    );
    close(start, { x: 50, y: -50 });
    close(end, { x: 350, y: 250 });
  });
});

describe("normalizeAngle", () => {
  it("wraps into [0, 360) as whole degrees", () => {
    expect(normalizeAngle(360)).toBe(0);
    expect(normalizeAngle(-90)).toBe(270);
    expect(normalizeAngle(725.4)).toBe(5);
    expect(Object.is(normalizeAngle(-0), 0)).toBe(true);
    expect(normalizeAngle(Number.NaN)).toBe(0);
  });
});

describe("colour stop helpers", () => {
  const stops = [
    { offset: 0, color: "#112233" },
    { offset: 0.5, color: "#445566" },
    { offset: 1, color: "#778899" },
  ];

  it("builds a CSS gradient", () => {
    expect(toCssLinearGradient(135, stops)).toBe(
      "linear-gradient(135deg, #112233 0%, #445566 50%, #778899 100%)",
    );
  });

  it("flattens stops for Konva", () => {
    expect(toKonvaColorStops(stops)).toEqual([
      0,
      "#112233",
      0.5,
      "#445566",
      1,
      "#778899",
    ]);
  });
});

describe("presets", () => {
  it("are all valid backgrounds with unique ids", () => {
    const ids = new Set<string>();
    for (const preset of GRADIENT_PRESETS) {
      expect(ids.has(preset.id)).toBe(false);
      ids.add(preset.id);
      const parsed = linearBackgroundSchema.safeParse({
        kind: "linear",
        presetId: preset.id,
        angle: preset.angle,
        stops: preset.stops,
      });
      expect(parsed.success).toBe(true);
    }
    expect(GRADIENT_PRESETS.length).toBeGreaterThanOrEqual(6);
  });

  it("are made only from design system colours", () => {
    const brand = new Set<string>(Object.values(BROOKES_COLORS));
    for (const preset of GRADIENT_PRESETS)
      for (const stop of preset.stops)
        expect(brand.has(stop.color), `${preset.id} ${stop.color}`).toBe(true);
  });

  it("can be looked up by id, and the default is Brookes", () => {
    expect(getGradientPreset("stone")?.name).toBe("Stone");
    expect(getGradientPreset("nope")).toBeUndefined();
    expect(DEFAULT_GRADIENT.id).toBe("brookes");
    expect(GRADIENT_PRESETS.slice(0, 10).map((preset) => preset.id)).toEqual([
      "sky",
      "petal",
      "heather",
      "apricot",
      "pebble",
      "rose",
      "lemon",
      "orchid",
      "coral",
      "sorbet",
    ]);
  });
});
