import type { GradientStop } from "./schema";

/** Which section of the presets a gradient is shown in. */
export type GradientGroup = "brookes" | "generic";

export type GradientPreset = {
  id: string;
  name: string;
  group: GradientGroup;
  angle: number;
  stops: readonly GradientStop[];
};

/** The Oxford Brookes design system's colours (app/globals.css, --obu-*). */
export const BROOKES_COLORS = {
  charcoal: "#424a52",
  charcoal60: "#8e9297",
  charcoal20: "#d9dbdc",
  charcoal10: "#eceded",
  pink: "#d10373",
  yellow: "#f9c909",
  red: "#c70540",
  red20: "#f2ced9",
  green: "#006338",
  green20: "#cedfd8",
} as const;

const twoStop = (
  id: string,
  name: string,
  from: string,
  to: string,
  group: GradientGroup = "generic",
): GradientPreset => ({
  id,
  name,
  group,
  angle: 135,
  stops: [
    { offset: 0, color: from },
    { offset: 1, color: to },
  ],
});

const brookes = (id: string, name: string, from: string, to: string) =>
  twoStop(id, name, from, to, "brookes");
const c = BROOKES_COLORS;

/**
 * Oxford Brookes gradients first, made only from the design system's colours,
 * then generic ones. The first preset is the default background.
 */
export const GRADIENT_PRESETS: readonly GradientPreset[] = [
  brookes("brookes", "Brookes", c.charcoal, c.pink),
  brookes("sunrise", "Sunrise", c.yellow, c.pink),
  brookes("marigold", "Marigold", c.yellow, c.red),
  brookes("blush", "Blush", c.red20, c.pink),
  brookes("crimson", "Crimson", c.red, c.charcoal),
  brookes("evergreen", "Evergreen", c.green, c.charcoal),
  brookes("sage", "Sage", c.green20, c.green),
  brookes("stone", "Stone", c.charcoal10, c.charcoal60),
  twoStop("lavender", "Lavender", "#c471f5", "#fa71cd"),
  twoStop("sunset", "Sunset", "#ff7e5f", "#feb47b"),
  twoStop("ocean", "Ocean", "#2193b0", "#6dd5ed"),
  twoStop("aurora", "Aurora", "#43cea2", "#185a9d"),
  twoStop("flamingo", "Flamingo", "#f857a6", "#ff5858"),
  twoStop("grape", "Grape", "#8e2de2", "#4a00e0"),
  {
    id: "midnight",
    name: "Midnight",
    group: "generic",
    angle: 135,
    stops: [
      { offset: 0, color: "#0f2027" },
      { offset: 0.5, color: "#203a43" },
      { offset: 1, color: "#2c5364" },
    ],
  },
  twoStop("slate", "Slate", "#475569", "#0f172a"),
  twoStop("peach", "Peach", "#ffecd2", "#fcb69f"),
  twoStop("mist", "Mist", "#e0eafc", "#cfdef3"),
  twoStop("sky", "Sky", "#a1c4fd", "#c2e9fb"),
  twoStop("lime", "Lime", "#d4fc79", "#96e6a1"),
];

export const DEFAULT_GRADIENT = GRADIENT_PRESETS[0];

export function getGradientPreset(id: string): GradientPreset | undefined {
  return GRADIENT_PRESETS.find((preset) => preset.id === id);
}

/** Whole degrees in [0, 360). */
export function normalizeAngle(degrees: number): number {
  if (!Number.isFinite(degrees)) return 0;
  const whole = Math.round(degrees) % 360;
  return whole < 0 ? whole + 360 : whole + 0; // "+ 0" turns -0 into 0
}

export type Point = { x: number; y: number };

/**
 * Start and end points of a linear gradient over a w x h box, using the CSS
 * rule: the gradient line passes through the centre at `angle` (0 = up,
 * 90 = right) and is long enough that the corners get the first and last colours.
 */
export function linearGradientPoints(
  angle: number,
  width: number,
  height: number,
): { start: Point; end: Point } {
  const radians = (angle * Math.PI) / 180;
  const dx = Math.sin(radians);
  const dy = -Math.cos(radians);
  const half = (Math.abs(width * dx) + Math.abs(height * dy)) / 2;
  const cx = width / 2;
  const cy = height / 2;
  return {
    start: { x: cx - dx * half, y: cy - dy * half },
    end: { x: cx + dx * half, y: cy + dy * half },
  };
}

/**
 * A radial gradient centred on a w x h box that reaches the farthest corner,
 * like CSS `radial-gradient(circle farthest-corner, ...)`.
 */
export function radialGradientGeometry(
  width: number,
  height: number,
): { center: Point; radius: number } {
  return {
    center: { x: width / 2, y: height / 2 },
    radius: Math.hypot(width, height) / 2,
  };
}

const cssStops = (stops: readonly GradientStop[]) =>
  stops
    .map((stop) => `${stop.color} ${Math.round(stop.offset * 1000) / 10}%`)
    .join(", ");

export function toCssLinearGradient(
  angle: number,
  stops: readonly GradientStop[],
): string {
  return `linear-gradient(${angle}deg, ${cssStops(stops)})`;
}

export function toCssRadialGradient(stops: readonly GradientStop[]): string {
  return `radial-gradient(circle farthest-corner, ${cssStops(stops)})`;
}

/** Konva wants a flat [offset, colour, offset, colour, ...] array. */
export function toKonvaColorStops(
  stops: readonly GradientStop[],
): (number | string)[] {
  return stops.flatMap((stop) => [stop.offset, stop.color]);
}
