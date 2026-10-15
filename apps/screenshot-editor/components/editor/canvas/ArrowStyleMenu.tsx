"use client";

import { useEffect, useRef } from "react";
import { arrowShape, paintArrow } from "@/lib/design/arrowShape";
import { ARROW_STYLES, type ArrowStyle } from "@/lib/design/schema";
import { CANVAS_FOCUS_ATTRIBUTE } from "@/lib/hooks/useShortcuts";
import { useEditorStore } from "@/lib/store/editor";
import { clamp } from "@/lib/utils";
import {
  endArrowHover,
  keepArrowHover,
  useArrowHover,
  useSelectionFrame,
} from "./nodes/Annotations";

export const ARROW_STYLE_NAMES: Record<ArrowStyle, string> = {
  tapered: "Tapered",
  chevron: "Open",
  halo: "Outlined",
  refined: "Classic",
};

// The menu's size, and its distance below the arrow.
const BUTTON = 32;
const PADDING = 4;
const GAP = 10;
const WIDTH = ARROW_STYLES.length * BUTTON + 2 * PADDING;
const HEIGHT = BUTTON + 2 * PADDING;
const PREVIEW = 22;

/** A small picture of an arrow style, in the arrow's colour. */
function StylePreview({ style, color }: { style: ArrowStyle; color: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;
    const ratio = window.devicePixelRatio || 1;
    canvas.width = PREVIEW * ratio;
    canvas.height = PREVIEW * ratio;
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.clearRect(0, 0, PREVIEW, PREVIEW);
    // Sized as on a screenshot about 300 px wide, so the head shows.
    const shape = arrowShape(
      style,
      { x: 3, y: PREVIEW - 4 },
      { x: PREVIEW - 3, y: 4 },
      0,
      300,
    );
    if (shape) paintArrow(context, shape, color);
  }, [style, color]);
  return (
    <canvas ref={ref} aria-hidden style={{ width: PREVIEW, height: PREVIEW }} />
  );
}

type Props = {
  /** The stage's size on screen: the menu stays over the canvas. */
  width: number;
  height: number;
};

/**
 * Arrow styles, just below the arrow under the mouse (or the selected arrow,
 * for touch screens).
 */
export function ArrowStyleMenu({ width, height }: Props) {
  const hover = useArrowHover((state) => state.frame);
  const selection = useSelectionFrame((state) => state.frame);
  const annotations = useEditorStore((state) => state.design.annotations);
  const selectedId = useEditorStore((state) => state.selectedAnnotationId);
  const setArrowStyle = useEditorStore((state) => state.setArrowStyle);

  const frame =
    hover ?? (selection && selection.id === selectedId ? selection : null);
  const arrow = frame
    ? annotations.find((item) => item.id === frame.id)
    : undefined;
  if (!frame || arrow?.kind !== "arrow") return null;

  const below = frame.y + frame.height + GAP;
  const top =
    below + HEIGHT <= height
      ? below
      : clamp(frame.y - GAP - HEIGHT, 0, Math.max(0, height - HEIGHT));
  const left = clamp(
    frame.x + frame.width / 2 - WIDTH / 2,
    0,
    Math.max(0, width - WIDTH),
  );

  return (
    <div
      role="radiogroup"
      aria-label="Arrow style"
      onPointerEnter={keepArrowHover}
      onPointerLeave={() => endArrowHover()}
      className="absolute flex items-center rounded-full glass p-1"
      style={{ left, top }}
    >
      {ARROW_STYLES.map((style) => (
        <button
          key={style}
          type="button"
          role="radio"
          aria-checked={arrow.style === style}
          aria-label={`${ARROW_STYLE_NAMES[style]} arrow`}
          title={`${ARROW_STYLE_NAMES[style]} arrow`}
          onClick={(event) => {
            // Keep the keys on the canvas.
            event.currentTarget
              .closest<HTMLElement>(`[${CANVAS_FOCUS_ATTRIBUTE}]`)
              ?.focus({ preventScroll: true });
            setArrowStyle(arrow.id, style);
          }}
          className="flex size-8 shrink-0 items-center justify-center rounded-full transition-colors outline-none hover:bg-accent focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ring aria-checked:bg-accent aria-checked:ring-2 aria-checked:ring-foreground/25 aria-checked:ring-inset"
        >
          <StylePreview style={style} color={arrow.color} />
        </button>
      ))}
    </div>
  );
}
