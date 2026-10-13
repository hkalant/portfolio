import { FRAME_KINDS, type FrameKind } from "./schema";

export { FRAME_KINDS };

export const FRAME_LABELS: Record<FrameKind, string> = {
  none: "None",
  macos: "macOS",
  browser: "Browser",
  windows: "Windows",
  minimal: "Minimal",
  glass: "Glass",
};

/** Frames with a title bar that shows `frame.title`. */
export const FRAMES_WITH_TITLE: readonly FrameKind[] = ["macos", "windows"];
/** Frames with an address bar that shows `frame.url`. */
export const FRAMES_WITH_URL: readonly FrameKind[] = ["browser"];

// Sizes at unit 1, in design px: a 1000 px wide screenshot.
const BASE: Record<FrameKind, { chromeTop: number; ring: number }> = {
  none: { chromeTop: 0, ring: 0 },
  macos: { chromeTop: 34, ring: 0 },
  browser: { chromeTop: 48, ring: 0 },
  windows: { chromeTop: 34, ring: 0 },
  minimal: { chromeTop: 22, ring: 0 },
  glass: { chromeTop: 0, ring: 10 },
};

export type FrameMetrics = {
  /** Height of the title or address bar above the content. */
  chromeTop: number;
  /** Frame material around the content on every side. */
  ring: number;
  /**
   * Multiplier for every chrome detail (buttons, text, gaps), so a frame looks
   * the same whatever the screenshot's size.
   */
  unit: number;
};

export function frameUnit(imageWidth: number): number {
  return Math.min(1.6, Math.max(0.6, imageWidth / 1000));
}

/** Natural chrome sizes for a screenshot `imageWidth` design px wide (before the shot is scaled). */
export function frameMetrics(
  kind: FrameKind,
  imageWidth: number,
): FrameMetrics {
  const unit = frameUnit(imageWidth);
  const base = BASE[kind];
  return {
    chromeTop: Math.round(base.chromeTop * unit),
    ring: Math.round(base.ring * unit),
    unit,
  };
}

export function isFrameKind(value: string): value is FrameKind {
  return (FRAME_KINDS as readonly string[]).includes(value);
}
