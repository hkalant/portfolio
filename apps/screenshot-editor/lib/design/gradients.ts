import type { GradientStop } from "./schema";

export type GradientPreset = {
  id: string;
  name: string;
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
  pinkTint: "#fae5f1",
  yellowTint: "#fef9e6",
  mauveTint: "#f0e9ee",
  peachTint: "#fdf3e7",
  pink20: "#f6cde3",
  yellow20: "#fef4ce",
  mauve20: "#e1d3dc",
  peach20: "#fae7ce",
  blue20: "#cfdeec",
} as const;

const c = BROOKES_COLORS;

const brookes = (
  id: string,
  name: string,
  from: string,
  to: string,
): GradientPreset => ({
  id,
  name,
  angle: 135,
  stops: [
    { offset: 0, color: from },
    { offset: 1, color: to },
  ],
});

/** Gradients made only from the Oxford Brookes design system's colours. */
export const GRADIENT_PRESETS: readonly GradientPreset[] = [
  // Tints first.
  brookes("sky", "Sky", c.blue20, c.mauve20),
  brookes("petal", "Petal", c.pinkTint, c.yellowTint),
  brookes("heather", "Heather", c.mauveTint, c.pinkTint),
  brookes("apricot", "Apricot", c.peachTint, c.pinkTint),
  brookes("pebble", "Pebble", c.charcoal20, c.blue20),
  brookes("rose", "Rose", c.pink20, c.yellow20),
  brookes("lemon", "Lemon", c.yellow20, c.peach20),
  brookes("orchid", "Orchid", c.mauve20, c.pink20),
  brookes("coral", "Coral", c.red20, c.peach20),
  brookes("sorbet", "Sorbet", c.peach20, c.pink20),
  brookes("brookes", "Brookes", c.charcoal, c.pink),
  brookes("sunrise", "Sunrise", c.yellow, c.pink),
  brookes("blush", "Blush", c.red20, c.pink),
  brookes("crimson", "Crimson", c.red, c.charcoal),
  brookes("stone", "Stone", c.charcoal10, c.charcoal60),
];

export function getGradientPreset(id: string): GradientPreset | undefined {
  return GRADIENT_PRESETS.find((preset) => preset.id === id);
}

export const DEFAULT_GRADIENT = getGradientPreset("brookes")!;

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
