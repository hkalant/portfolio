import { mixHex } from "@/lib/render/color";
import { createRandom } from "@/lib/render/random";
import { hexToRgba } from "./colors";

/**
 * Alpha along a blob's radius, centre to edge: a smoothstep fall-off, so a
 * blob has no visible rim. [offset, alpha] pairs.
 */
export const BLOB_FALLOFF: readonly (readonly [number, number])[] = Array.from(
  { length: 9 },
  (_, i) => {
    const t = i / 8;
    return [t, Math.round((1 - t * t * (3 - 2 * t)) * 1000) / 1000] as const;
  },
);

// Built-in wallpapers, drawn by code (no image files). Each is rendered once
// into a WALLPAPER_SIZE canvas and then used like an uploaded background.
//
// A drawing works at any size: positions and sizes are fractions of the
// canvas, and each draw starts its own seeded random sequence, so a thumbnail
// and the full-size render show the same picture.

export const WALLPAPER_SIZE = { width: 2400, height: 1500 } as const;

export type Wallpaper = {
  id: string;
  name: string;
  /** Two colours for the picker swatch while the real thumbnail renders. */
  swatch: readonly [string, string];
  draw: (ctx: CanvasRenderingContext2D, width: number, height: number) => void;
};

type Draw = Wallpaper["draw"];
type Stops = readonly (readonly [offset: number, color: string])[];

const TAU = Math.PI * 2;

function fillLinear(
  ctx: CanvasRenderingContext2D,
  [x0, y0, x1, y1]: readonly [number, number, number, number],
  stops: Stops,
  width: number,
  height: number,
) {
  const gradient = ctx.createLinearGradient(x0, y0, x1, y1);
  for (const [offset, color] of stops) gradient.addColorStop(offset, color);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
}

/** A soft round light: `color` fading to transparent with no visible edge. */
function glow(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  color: string,
  alpha: number,
) {
  const r = Math.max(1e-3, radius);
  const gradient = ctx.createRadialGradient(x, y, 0, x, y, r);
  for (const [offset, falloff] of BLOB_FALLOFF)
    gradient.addColorStop(offset, hexToRgba(color, alpha * falloff));
  ctx.fillStyle = gradient;
  ctx.fillRect(x - r, y - r, r * 2, r * 2);
}

/** Darkens the corners a little, which pulls the eye to the middle. */
function vignette(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  strength: number,
) {
  const outer = Math.hypot(width, height) / 2;
  const gradient = ctx.createRadialGradient(
    width / 2,
    height / 2,
    outer * 0.45,
    width / 2,
    height / 2,
    outer,
  );
  gradient.addColorStop(0, "rgba(0, 0, 0, 0)");
  gradient.addColorStop(1, `rgba(0, 0, 0, ${strength})`);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
}

/** Traces y = edge(x) across the canvas and closes the shape along the bottom. */
function traceEdge(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  edge: (x: number) => number,
  close: boolean,
) {
  const segments = 120;
  ctx.beginPath();
  ctx.moveTo(0, edge(0));
  for (let i = 1; i <= segments; i += 1) {
    const x = (i / segments) * width;
    ctx.lineTo(x, edge(x));
  }
  if (close) {
    ctx.lineTo(width, height);
    ctx.lineTo(0, height);
    ctx.closePath();
  }
}

/**
 * Layered hills or waves, back to front. Each layer casts a soft shadow onto
 * the one behind it and gets a thin highlight along its top edge.
 */
function drawLayers(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  layers: readonly {
    color: string;
    shade: string;
    edge: (x: number) => number;
  }[],
  shadow: string,
  highlight: string,
) {
  const unit = Math.min(width, height);
  for (const { color, shade, edge } of layers) {
    let top = height;
    for (let i = 0; i <= 24; i += 1)
      top = Math.min(top, edge((i / 24) * width));
    ctx.save();
    traceEdge(ctx, width, height, edge, true);
    const fill = ctx.createLinearGradient(0, top, 0, height);
    fill.addColorStop(0, color);
    fill.addColorStop(1, shade);
    ctx.fillStyle = fill;
    ctx.shadowColor = shadow;
    ctx.shadowBlur = unit * 0.05;
    ctx.shadowOffsetY = -unit * 0.008;
    ctx.fill();
    ctx.restore();

    ctx.save();
    traceEdge(ctx, width, height, edge, false);
    ctx.strokeStyle = highlight;
    ctx.lineWidth = Math.max(0.5, unit * 0.002);
    ctx.stroke();
    ctx.restore();
  }
}

const waves: Draw = (ctx, width, height) => {
  const random = createRandom(0x77617665);
  const size = Math.max(width, height);
  fillLinear(
    ctx,
    [0, 0, width * 0.3, height],
    [
      [0, "#0b1442"],
      [1, "#1d2f7a"],
    ],
    width,
    height,
  );
  glow(ctx, width * 0.85, height * 0.05, size * 0.6, "#38bdf8", 0.55);
  glow(ctx, width * 0.1, height * 0.2, size * 0.45, "#818cf8", 0.4);

  const colors = [
    "#3730a3",
    "#4338ca",
    "#4f46e5",
    "#4c6ef5",
    "#3b82f6",
    "#0ea5e9",
    "#38bdf8",
  ];
  const layers = colors.map((color, i) => {
    const base = height * (0.3 + (i / (colors.length - 1)) * 0.58);
    const amp1 = height * (0.03 + random() * 0.03);
    const freq1 = 0.6 + random() * 0.9;
    const phase1 = random() * TAU;
    const amp2 = height * (0.008 + random() * 0.012);
    const freq2 = 2 + random() * 1.5;
    const phase2 = random() * TAU;
    return {
      color,
      shade: mixHex(color, "#0b1442", 0.55),
      edge: (x: number) =>
        base +
        amp1 * Math.sin((x / width) * TAU * freq1 + phase1) +
        amp2 * Math.sin((x / width) * TAU * freq2 + phase2),
    };
  });
  drawLayers(
    ctx,
    width,
    height,
    layers,
    "rgba(4, 8, 40, 0.5)",
    "rgba(255, 255, 255, 0.22)",
  );
};

const glowLights: Draw = (ctx, width, height) => {
  const random = createRandom(0x676c6f77);
  const size = Math.max(width, height);
  fillLinear(
    ctx,
    [0, 0, width, height],
    [
      [0, "#160b33"],
      [1, "#070b1f"],
    ],
    width,
    height,
  );
  const lights: readonly [string, number, number, number][] = [
    ["#ff3d8b", 0.18, 0.28, 0.48],
    ["#ff8a3d", 0.76, 0.2, 0.4],
    ["#6d4dff", 0.65, 0.72, 0.52],
    ["#1fc8e6", 0.1, 0.9, 0.38],
    ["#e649c9", 0.98, 0.62, 0.32],
  ];
  ctx.save();
  // Overlapping lights mix brighter, like light does.
  ctx.globalCompositeOperation = "screen";
  for (const [color, x, y, r] of lights) {
    const wobbleX = (random() - 0.5) * 0.1;
    const wobbleY = (random() - 0.5) * 0.1;
    glow(
      ctx,
      (x + wobbleX) * width,
      (y + wobbleY) * height,
      r * size,
      color,
      0.9,
    );
  }
  ctx.restore();
  vignette(ctx, width, height, 0.2);
};

const sunrise: Draw = (ctx, width, height) => {
  const random = createRandom(0x73756e72);
  const unit = Math.min(width, height);
  const size = Math.max(width, height);
  fillLinear(
    ctx,
    [0, 0, 0, height],
    [
      [0, "#26185a"],
      [0.42, "#93307e"],
      [0.72, "#ef5f5c"],
      [1, "#ffb56b"],
    ],
    width,
    height,
  );

  const cx = width * 0.5;
  const cy = height * 1.04;
  const rays = 18;
  const turn = random() * (TAU / rays);
  ctx.save();
  ctx.globalCompositeOperation = "screen";
  if (typeof ctx.createConicGradient === "function") {
    // Soft-edged rays: the light rises and falls around the circle.
    const conic = ctx.createConicGradient(turn, cx, cy);
    for (let i = 0; i <= rays * 2; i += 1)
      conic.addColorStop(
        i / (rays * 2),
        i % 2 === 0 ? "rgba(255, 214, 170, 0.2)" : "rgba(255, 214, 170, 0)",
      );
    ctx.fillStyle = conic;
    ctx.fillRect(0, 0, width, height);
  } else {
    // Older browsers: hard-edged wedges.
    ctx.fillStyle = "rgba(255, 214, 170, 0.1)";
    const reach = Math.hypot(width, height) * 1.2;
    for (let i = 0; i < rays; i += 1) {
      const start = turn + (i / rays) * TAU;
      const end = start + TAU / rays / 2;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(start) * reach, cy + Math.sin(start) * reach);
      ctx.lineTo(cx + Math.cos(end) * reach, cy + Math.sin(end) * reach);
      ctx.closePath();
      ctx.fill();
    }
  }
  ctx.restore();

  // The rays fade out into the night sky.
  fillLinear(
    ctx,
    [0, 0, 0, height],
    [
      [0, "rgba(38, 24, 90, 0.85)"],
      [0.5, "rgba(38, 24, 90, 0)"],
    ],
    width,
    height,
  );
  glow(ctx, cx, cy, size * 0.75, "#ff9a62", 0.55);
  glow(ctx, cx, cy, unit * 0.6, "#ffe0b0", 0.85);
  glow(ctx, cx, cy, unit * 0.32, "#fff6e6", 1);
};

const dunes: Draw = (ctx, width, height) => {
  const random = createRandom(0x64756e65);
  const unit = Math.min(width, height);
  const size = Math.max(width, height);
  fillLinear(
    ctx,
    [0, 0, 0, height],
    [
      [0, "#fde3d3"],
      [0.6, "#f8b9a0"],
      [1, "#f29d86"],
    ],
    width,
    height,
  );
  const sunX = width * 0.7;
  const sunY = height * 0.32;
  glow(ctx, sunX, sunY, size * 0.38, "#fff4e8", 0.95);
  ctx.fillStyle = "#fffaf3";
  ctx.beginPath();
  ctx.arc(sunX, sunY, unit * 0.075, 0, TAU);
  ctx.fill();

  const colors = ["#eea084", "#de8068", "#c76455", "#a5494a", "#77303f"];
  const layers = colors.map((color, i) => {
    const t = i / (colors.length - 1);
    const base = height * (0.6 + t * 0.34);
    const amplitude = height * (0.16 - t * 0.04);
    const wavelength = 0.55 + random() * 0.45; // in canvas widths
    const phase = random() * Math.PI;
    const skew = 0.45 + random() * 0.3;
    const swell = random() * TAU;
    return {
      color,
      shade: mixHex(color, "#3b1726", 0.35),
      edge: (x: number) => {
        const theta = ((x / width) * Math.PI) / wavelength + phase;
        // 1 - |sin| has sharp crests and round hollows, like dunes. Warping
        // the phase makes the side after each crest steep (the slip face).
        const warped = theta + (skew * (1 - Math.cos(2 * theta))) / 2;
        const crest = (1 - Math.abs(Math.sin(warped))) ** 1.5;
        const variation = 0.7 + 0.3 * Math.sin((x / width) * 2.2 + swell);
        return base - amplitude * (0.2 + 0.8 * crest) * variation;
      },
    };
  });
  drawLayers(
    ctx,
    width,
    height,
    layers,
    "rgba(80, 20, 30, 0.28)",
    "rgba(255, 238, 222, 0.35)",
  );
};

const dots: Draw = (ctx, width, height) => {
  const size = Math.max(width, height);
  fillLinear(
    ctx,
    [0, 0, width, height],
    [
      [0, "#0e1330"],
      [0.6, "#1a1446"],
      [1, "#0b2a3a"],
    ],
    width,
    height,
  );
  glow(ctx, width * 0.15, height * 0.1, size * 0.55, "#6d5dfc", 0.4);
  glow(ctx, width * 0.9, height * 0.95, size * 0.5, "#14b8a6", 0.35);

  // A halftone ripple: each dot's size follows a smooth wave across the canvas.
  const spacing = size / 56;
  const columns = Math.ceil(width / spacing) + 1;
  const rows = Math.ceil(height / spacing) + 1;
  const left = (width - (columns - 1) * spacing) / 2;
  const top = (height - (rows - 1) * spacing) / 2;
  ctx.fillStyle = (() => {
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, "#f0abfc");
    gradient.addColorStop(0.5, "#a5b4fc");
    gradient.addColorStop(1, "#67e8f9");
    return gradient;
  })();
  ctx.beginPath();
  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const x = left + column * spacing;
      const y = top + row * spacing;
      const nx = x / size;
      const ny = y / size;
      const wave =
        0.5 +
        0.5 * Math.sin(nx * 6.5 - ny * 3 + Math.sin(ny * 5 + nx * 2) * 1.3);
      const radius = spacing * (0.05 + 0.33 * wave ** 1.8);
      ctx.moveTo(x + radius, y);
      ctx.arc(x, y, radius, 0, TAU);
    }
  }
  ctx.fill();
  vignette(ctx, width, height, 0.3);
};

const bokeh: Draw = (ctx, width, height) => {
  const random = createRandom(0x626f6b65);
  const unit = Math.min(width, height);
  const size = Math.max(width, height);
  fillLinear(
    ctx,
    [0, 0, width, height],
    [
      [0, "#140c2a"],
      [0.55, "#220e38"],
      [1, "#08131f"],
    ],
    width,
    height,
  );
  glow(ctx, width * 0.25, height * 0.7, size * 0.6, "#6d28d9", 0.3);
  glow(ctx, width * 0.8, height * 0.25, size * 0.55, "#be185d", 0.25);

  const palette = ["#ffc857", "#ff7b54", "#ff4d8d", "#ffd6a5", "#b388ff"];
  ctx.save();
  ctx.globalCompositeOperation = "screen";
  for (let i = 0; i < 72; i += 1) {
    // Depth 0 is far away (small, bright); 1 is close (large, faint).
    const depth = random();
    const r = unit * (0.01 + depth * depth * 0.11);
    // Most lights gather along a diagonal band, like a street at night.
    const x = random() * width;
    const band = (random() + random() - 1) * 0.42;
    const y = height * (0.78 - 0.56 * (x / width) + band);
    const color = palette[Math.floor(random() * palette.length)];
    const alpha = 0.12 + (1 - depth) ** 2 * 0.6;
    // Out-of-focus lights are even discs with a slightly brighter rim.
    const disc = ctx.createRadialGradient(x, y, 0, x, y, r);
    disc.addColorStop(0, hexToRgba(color, alpha * 0.7));
    disc.addColorStop(0.82, hexToRgba(color, alpha * 0.8));
    disc.addColorStop(0.94, hexToRgba(color, alpha));
    disc.addColorStop(1, hexToRgba(color, 0));
    ctx.fillStyle = disc;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
  vignette(ctx, width, height, 0.35);
};

/** The first wallpaper is the default when switching to Image. */
export const WALLPAPERS: readonly Wallpaper[] = [
  { id: "waves", name: "Waves", swatch: ["#38bdf8", "#3730a3"], draw: waves },
  {
    id: "glow",
    name: "Glow",
    swatch: ["#ff4fa3", "#7c5cff"],
    draw: glowLights,
  },
  {
    id: "sunrise",
    name: "Sunrise",
    swatch: ["#26185a", "#ffb56b"],
    draw: sunrise,
  },
  { id: "dunes", name: "Dunes", swatch: ["#fde3d3", "#9c4246"], draw: dunes },
  { id: "dots", name: "Dots", swatch: ["#1a1446", "#67e8f9"], draw: dots },
  { id: "bokeh", name: "Bokeh", swatch: ["#2b1142", "#fcd34d"], draw: bokeh },
];

export const DEFAULT_WALLPAPER = WALLPAPERS[0];

export function getWallpaper(id: string): Wallpaper | undefined {
  return WALLPAPERS.find((wallpaper) => wallpaper.id === id);
}
