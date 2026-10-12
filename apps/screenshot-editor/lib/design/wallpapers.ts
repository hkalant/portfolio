// Built-in wallpapers, drawn by code (no image files). Each is rendered once
// into a WALLPAPER_SIZE canvas and then used like an uploaded background.

export const WALLPAPER_SIZE = { width: 2400, height: 1500 } as const;

export type Wallpaper = {
  id: string;
  name: string;
  /** Two colours for the picker swatch while the real thumbnail renders. */
  swatch: readonly [string, string];
  draw: (ctx: CanvasRenderingContext2D, width: number, height: number) => void;
};

// The backgrounds work replaces these placeholder drawings.
const placeholder =
  (from: string, to: string): Wallpaper["draw"] =>
  (ctx, width, height) => {
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, from);
    gradient.addColorStop(1, to);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
  };

/** The first wallpaper is the default when switching to Image. */
export const WALLPAPERS: readonly Wallpaper[] = [
  {
    id: "waves",
    name: "Waves",
    swatch: ["#38bdf8", "#6366f1"],
    draw: placeholder("#38bdf8", "#6366f1"),
  },
];

export const DEFAULT_WALLPAPER = WALLPAPERS[0];

export function getWallpaper(id: string): Wallpaper | undefined {
  return WALLPAPERS.find((wallpaper) => wallpaper.id === id);
}
