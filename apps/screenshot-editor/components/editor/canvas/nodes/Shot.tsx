import { Image as KonvaImage } from "react-konva";
import type { Rect } from "@/lib/design/layout";
import type { ShadowSpec } from "@/lib/design/schema";
import type { LoadedImage } from "@/lib/image/load";

type Props = {
  image: LoadedImage;
  rect: Rect;
  radius: number;
  shadow: ShadowSpec;
};

/**
 * One Konva Image with rounded corners and a shadow. With both set, Konva draws
 * the rounded image into a buffer first, so the shadow follows the corners.
 * Don't clip it with a Group (that removes the shadow) and don't turn off
 * perfectDrawEnabled (that skips the buffer). konva is pinned for this reason.
 */
export function ShotNode({ image, rect, radius, shadow }: Props) {
  return (
    <KonvaImage
      image={image.source}
      x={rect.x}
      y={rect.y}
      width={rect.width}
      height={rect.height}
      cornerRadius={radius}
      shadowEnabled={shadow.preset !== "none" && shadow.opacity > 0}
      shadowColor={shadow.color}
      shadowOpacity={shadow.opacity}
      shadowBlur={shadow.blur}
      shadowOffsetX={shadow.offsetX}
      shadowOffsetY={shadow.offsetY}
      listening={false}
    />
  );
}
