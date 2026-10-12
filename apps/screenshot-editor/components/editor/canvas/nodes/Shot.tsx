import { Group, Image as KonvaImage } from "react-konva";
import type { DesignLayout } from "@/lib/design/layout";
import type { ShotLayer } from "@/lib/design/schema";
import type { LoadedImage } from "@/lib/image/load";

type Props = {
  image: LoadedImage;
  shot: ShotLayer;
  layout: DesignLayout;
  /** On-screen zoom of the stage (for screen-pixel snapping distances). */
  zoom: number;
};

// Placeholder from the foundation phase: the M1 drawing (no frame, inset,
// border or drag). The frames work replaces it.
//
// One Konva Image with rounded corners and a shadow. With both set, Konva draws
// the rounded image into a buffer first, so the shadow follows the corners.
// Don't clip it with a Group (that removes the shadow) and don't turn off
// perfectDrawEnabled (that skips the buffer). konva is pinned for this reason.
export function ShotNode({ image, shot, layout }: Props) {
  const box = layout.shot;
  const { shadow } = shot;
  return (
    <Group
      x={box.x + box.width / 2}
      y={box.y + box.height / 2}
      offsetX={box.width / 2}
      offsetY={box.height / 2}
      rotation={box.rotation}
      listening={false}
    >
      <KonvaImage
        image={image.source}
        x={box.image.x}
        y={box.image.y}
        width={box.image.width}
        height={box.image.height}
        cornerRadius={box.imageRadii}
        shadowEnabled={shadow.preset !== "none" && shadow.opacity > 0}
        shadowColor={shadow.color}
        shadowOpacity={shadow.opacity}
        shadowBlur={shadow.blur}
        shadowOffsetX={shadow.offsetX}
        shadowOffsetY={shadow.offsetY}
        listening={false}
      />
    </Group>
  );
}
