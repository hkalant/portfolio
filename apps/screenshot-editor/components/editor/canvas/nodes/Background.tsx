import { Rect } from "react-konva";
import { DEFAULT_GRADIENT } from "@/lib/design/gradients";
import {
  linearGradientPoints,
  toKonvaColorStops,
} from "@/lib/design/gradients";
import type { Size } from "@/lib/design/layout";
import type { Background, BackgroundFx } from "@/lib/design/schema";
import type { LoadedImage } from "@/lib/image/load";

type Props = {
  canvas: Size;
  background: Background;
  fx: BackgroundFx;
  /** The screenshot, for "fromImage" backgrounds. */
  screenshot: LoadedImage;
  /** The uploaded background image, for "image" backgrounds with an upload. */
  backgroundImage: LoadedImage | null;
};

// Placeholder from the foundation phase: linear gradients and solid colours
// only. The backgrounds work replaces it with every background kind.
export function BackgroundNode({ canvas, background }: Props) {
  const { width, height } = canvas;
  if (background.kind === "transparent") return null;
  if (background.kind === "solid")
    return (
      <Rect
        width={width}
        height={height}
        fill={background.color}
        listening={false}
      />
    );
  const linear =
    background.kind === "linear"
      ? background
      : { angle: DEFAULT_GRADIENT.angle, stops: DEFAULT_GRADIENT.stops };
  const { start, end } = linearGradientPoints(linear.angle, width, height);
  return (
    <Rect
      x={0}
      y={0}
      width={width}
      height={height}
      fillLinearGradientStartPoint={start}
      fillLinearGradientEndPoint={end}
      fillLinearGradientColorStops={toKonvaColorStops(linear.stops)}
      listening={false}
    />
  );
}
