import { describe, expect, it } from "vitest";
import { createDefaultDesign } from "@/lib/design/defaults";
import { computeLayout } from "@/lib/design/layout";
import type { Design, FrameKind, ShotLayer } from "@/lib/design/schema";
import { SHADOW_PRESETS } from "@/lib/design/shadows";
import {
  addressContents,
  addressPill,
  chromeLayout,
  contentRadii,
  framePalette,
  hasShadow,
  insideStroke,
  isPlainShot,
  resolveInsetColor,
  roundedRectPath,
  TRAFFIC_LIGHT_COLORS,
  trafficLights,
  trafficLightsEnd,
} from "./frame";

function designWith(patch: Partial<ShotLayer>): Design {
  const design = createDefaultDesign();
  return { ...design, layers: [{ ...design.layers[0], ...patch }] };
}

const frame = (kind: FrameKind) => ({
  kind,
  theme: "light" as const,
  title: "",
  url: "",
});

describe("framePalette", () => {
  it("has light and dark colours that differ", () => {
    const light = framePalette("light");
    const dark = framePalette("dark");
    expect(light.body).toBe("#ffffff");
    for (const key of Object.keys(light) as (keyof typeof light)[])
      expect(dark[key], key).not.toBe(light[key]);
  });

  it("makes the glass ring translucent white or black", () => {
    expect(framePalette("light").ringFill).toBe("rgba(255, 255, 255, 0.28)");
    expect(framePalette("dark").ringFill).toBe("rgba(0, 0, 0, 0.3)");
  });
});

describe("resolveInsetColor", () => {
  it("uses the edge colour for auto, white without one, or the custom colour", () => {
    expect(resolveInsetColor("auto", "#123456")).toBe("#123456");
    expect(resolveInsetColor("auto", null)).toBe("#ffffff");
    expect(resolveInsetColor("#abcdef", "#123456")).toBe("#abcdef");
  });
});

describe("isPlainShot and hasShadow", () => {
  it("draws one image only without a frame or inset", () => {
    expect(
      isPlainShot({ frame: frame("none"), inset: { size: 0, color: "auto" } }),
    ).toBe(true);
    expect(
      isPlainShot({ frame: frame("none"), inset: { size: 4, color: "auto" } }),
    ).toBe(false);
    expect(
      isPlainShot({ frame: frame("glass"), inset: { size: 0, color: "auto" } }),
    ).toBe(false);
  });

  it("has no shadow for None or opacity 0", () => {
    expect(hasShadow(SHADOW_PRESETS.none)).toBe(false);
    expect(hasShadow(SHADOW_PRESETS.medium)).toBe(true);
    expect(
      hasShadow({ ...SHADOW_PRESETS.medium, preset: "custom", opacity: 0 }),
    ).toBe(false);
  });
});

describe("contentRadii", () => {
  const source = { width: 1000, height: 600 };

  it("rounds the inset like the outer shape, square under a title bar", () => {
    const plain = computeLayout(
      source,
      designWith({ radius: 20, inset: { size: 10, color: "auto" } }),
    ).shot;
    expect(contentRadii(plain)).toEqual([20, 20, 20, 20]);

    const mac = computeLayout(
      source,
      designWith({
        radius: 20,
        inset: { size: 10, color: "auto" },
        frame: frame("macos"),
      }),
    ).shot;
    expect(contentRadii(mac)).toEqual([0, 0, 20, 20]);
  });

  it("takes the glass ring off the radius", () => {
    const glass = computeLayout(
      source,
      designWith({
        radius: 40,
        inset: { size: 10, color: "auto" },
        frame: frame("glass"),
      }),
    ).shot;
    // Ring 16 at unit 1.
    expect(contentRadii(glass)).toEqual([24, 24, 24, 24]);
    const small = { ...glass, radius: 8 };
    expect(contentRadii(small)).toEqual([0, 0, 0, 0]);
  });
});

describe("insideStroke", () => {
  it("insets the path by half the width so the stroke stays inside", () => {
    expect(insideStroke({ width: 200, height: 100 }, 12, 4)).toEqual({
      x: 2,
      y: 2,
      width: 196,
      height: 96,
      cornerRadius: 10,
      strokeWidth: 4,
    });
    expect(insideStroke({ width: 200, height: 100 }, 1, 4)?.cornerRadius).toBe(
      0,
    );
  });

  it("draws nothing for width 0", () => {
    expect(insideStroke({ width: 200, height: 100 }, 12, 0)).toBeNull();
  });
});

describe("roundedRectPath", () => {
  it("traces a closed path with four corner arcs, clamped to the size", () => {
    const calls: string[] = [];
    const arcs: number[] = [];
    roundedRectPath(
      {
        moveTo: (x, y) => calls.push(`M${x},${y}`),
        lineTo: (x, y) => calls.push(`L${x},${y}`),
        arc: (_x, _y, radius) => {
          calls.push("A");
          arcs.push(radius);
        },
        closePath: () => calls.push("Z"),
      },
      100,
      40,
      50,
    );
    expect(calls[0]).toBe("M20,0");
    expect(calls.at(-1)).toBe("Z");
    expect(arcs).toEqual([20, 20, 20, 20]);
  });
});

describe("traffic lights", () => {
  it("sits 12 units from the left with radius 6 and gap 8, centred in the bar", () => {
    const lights = trafficLights(34, 1);
    expect(lights.map((light) => light.color)).toEqual([
      ...TRAFFIC_LIGHT_COLORS,
    ]);
    expect(lights.map((light) => light.x)).toEqual([18, 38, 58]);
    expect(lights.every((light) => light.y === 17 && light.radius === 6)).toBe(
      true,
    );
    expect(trafficLightsEnd(1)).toBe(64);
  });

  it("scales every detail by the unit", () => {
    const lights = trafficLights(68, 2);
    expect(lights[0]).toMatchObject({ x: 36, y: 34, radius: 12 });
    expect(trafficLightsEnd(2)).toBe(128);
  });
});

describe("chromeLayout", () => {
  const bar = { width: 1000, height: 34 };

  it("has no chrome for none and glass", () => {
    expect(chromeLayout("none", bar, 1, "light")).toBeNull();
    expect(chromeLayout("glass", bar, 1, "light")).toBeNull();
  });

  it("centres the macOS title between margins clear of the lights", () => {
    const mac = chromeLayout("macos", bar, 1, "light");
    expect(mac?.dots).toHaveLength(3);
    expect(mac?.title).toMatchObject({ align: "center", fontSize: 13 });
    const title = mac!.title!;
    expect(title.x).toBeGreaterThanOrEqual(trafficLightsEnd(1));
    expect(title.x + title.width / 2).toBe(500);
  });

  it("puts the Windows title on the left and three glyphs on the right", () => {
    const win = chromeLayout("windows", bar, 1, "dark");
    expect(win?.dots).toEqual([]);
    expect(win?.title).toMatchObject({ x: 14, align: "left" });
    const captions = win!.captions!;
    // Close is centred in the last 46 px button.
    expect(captions.close[0]).toEqual([972, 12, 982, 22]);
    expect(captions.maximise).toEqual({ x: 926, y: 12, width: 10, height: 10 });
    expect(captions.minimise).toEqual([880, 17, 890, 17]);
    expect(win!.title!.x + win!.title!.width).toBeLessThan(880 - 23);
  });

  it("gives the minimal frame three grey dots in the theme colour", () => {
    const minimal = chromeLayout(
      "minimal",
      { width: 600, height: 22 },
      1,
      "dark",
    );
    expect(minimal?.dots).toHaveLength(3);
    expect(
      minimal?.dots.every((dot) => dot.color === framePalette("dark").dot),
    ).toBe(true);
    expect(minimal?.title).toBeNull();
  });

  it("draws a hairline separator along the bottom of the bar", () => {
    expect(chromeLayout("macos", bar, 1.5, "light")?.separator).toEqual({
      x: 0,
      y: 34 - 1.5,
      width: 1000,
      height: 1.5,
    });
  });

  it("drops a title that has no room", () => {
    expect(
      chromeLayout("macos", { width: 150, height: 34 }, 1, "light")?.title,
    ).toBeNull();
  });
});

describe("address bar", () => {
  it("is a centred pill 60 % wide", () => {
    const pill = addressPill({ width: 1000, height: 48 }, 1);
    expect(pill).toEqual({
      x: 200,
      y: 10,
      width: 600,
      height: 28,
      cornerRadius: 14,
    });
  });

  it("narrows to stay clear of the traffic lights, and goes when there's no room", () => {
    const pill = addressPill({ width: 300, height: 48 }, 1)!;
    expect(pill.x).toBe(80);
    expect(pill.width).toBe(140);
    expect(addressPill({ width: 200, height: 48 }, 1)).toBeNull();
  });

  it("centres the lock and the text together", () => {
    const pill = { x: 200, y: 10, width: 600, height: 28 };
    const { lock, text } = addressContents(pill, 100, 1);
    // 9 lock + 6 gap + 100 text = 115, centred in the pill.
    expect(lock.body.x).toBeCloseTo(200 + (600 - 115) / 2);
    expect(text.x).toBeCloseTo(lock.body.x + 15);
    expect(text.x + text.width).toBe(800 - 12);
    expect(lock.shackle.y + lock.shackle.height).toBeGreaterThan(lock.body.y);
  });

  it("keeps long text inside the pill's padding", () => {
    const pill = { x: 0, y: 0, width: 200, height: 28 };
    const { lock, text } = addressContents(pill, 5000, 1);
    expect(lock.body.x).toBe(12);
    expect(text.x + text.width).toBe(188);
  });

  it("scales with the unit", () => {
    const pill = { x: 0, y: 0, width: 1200, height: 56 };
    const { text, lock } = addressContents(pill, 0, 2);
    expect(text.fontSize).toBe(26);
    expect(lock.body.width).toBe(18);
  });
});
