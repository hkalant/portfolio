import { Rect } from "react-konva";
import {
  linearGradientPoints,
  toKonvaColorStops,
} from "@/lib/design/gradients";
import type { LinearBackground } from "@/lib/design/schema";

type Props = { width: number; height: number; background: LinearBackground };

export function BackgroundNode({ width, height, background }: Props) {
  const { start, end } = linearGradientPoints(background.angle, width, height);
  return (
    <Rect
      x={0}
      y={0}
      width={width}
      height={height}
      fillLinearGradientStartPoint={start}
      fillLinearGradientEndPoint={end}
      fillLinearGradientColorStops={toKonvaColorStops(background.stops)}
      listening={false}
    />
  );
}
