import type Konva from "konva";
import type { KonvaEventObject } from "konva/lib/Node";
import { useEffect, useMemo, useRef } from "react";
import { Group, Image as KonvaImage, Rect } from "react-konva";
import { hexToRgba } from "@/lib/design/colors";
import type { DesignLayout } from "@/lib/design/layout";
import type { ShadowSpec, ShotLayer } from "@/lib/design/schema";
import { edgeColor, sampleImagePixels } from "@/lib/image/colors";
import type { LoadedImage } from "@/lib/image/load";
import {
  contentRadii,
  framePalette,
  hasShadow,
  insideStroke,
  isPlainShot,
  resolveInsetColor,
  roundedRectPath,
} from "@/lib/render/frame";
import { NO_GUIDES, snapDrag } from "@/lib/render/snap";
import { useEditorStore } from "@/lib/store/editor";
import { ChromeNode } from "./Chrome";
import { useGuides } from "./Guides";

type Props = {
  image: LoadedImage;
  shot: ShotLayer;
  layout: DesignLayout;
  /** On-screen zoom of the stage (for screen-pixel snapping distances). */
  zoom: number;
};

/** Konva shadow props. Shadows are canvas px: never multiplied by the shot's scale. */
function shadowProps(shadow: ShadowSpec) {
  return {
    shadowEnabled: hasShadow(shadow),
    shadowColor: shadow.color,
    shadowOpacity: shadow.opacity,
    shadowBlur: shadow.blur,
    shadowOffsetX: shadow.offsetX,
    shadowOffsetY: shadow.offsetY,
  };
}

function setCursor(event: KonvaEventObject<unknown>, cursor: string) {
  const container = event.target.getStage()?.container();
  if (container) container.style.cursor = cursor;
}

/**
 * The framed screenshot, rotated about its centre. On a fixed canvas it can be
 * dragged; it snaps to the canvas centre lines.
 */
export function ShotNode({ image, shot, layout, zoom }: Props) {
  const box = layout.shot;
  const { draggable } = layout;
  const setPosition = useEditorStore((state) => state.setPosition);
  const sealHistory = useEditorStore((state) => state.sealHistory);
  const groupRef = useRef<Konva.Group>(null);
  const dragging = useRef(false);

  const insetSize = shot.inset.size;
  const insetSetting = shot.inset.color;
  const insetColor = useMemo(() => {
    // Only an inset shows this colour, so don't sample the image without one.
    if (insetSetting !== "auto" || insetSize === 0)
      return resolveInsetColor(insetSetting, null);
    const pixels = sampleImagePixels(image.source);
    return resolveInsetColor("auto", pixels && edgeColor(pixels));
  }, [insetSetting, insetSize, image.source]);

  // Leave no guide or grab cursor behind when the shot stops being draggable.
  useEffect(() => {
    if (!draggable) return;
    const group = groupRef.current;
    const drag = dragging;
    return () => {
      drag.current = false;
      useGuides.setState(NO_GUIDES);
      const container = group?.getStage()?.container();
      if (container) container.style.cursor = "";
    };
  }, [draggable]);

  const onDragMove = (event: KonvaEventObject<DragEvent>) => {
    const node = event.target;
    if (node !== event.currentTarget) return;
    const snap = snapDrag(node.position(), layout.canvas, zoom);
    node.position(snap.centre);
    useGuides.setState(snap.guides);
    // Every move of one drag merges into one undo step.
    setPosition(snap.position.x, snap.position.y);
  };

  const dragProps = draggable
    ? {
        draggable: true,
        onDragStart: (event: KonvaEventObject<DragEvent>) => {
          dragging.current = true;
          sealHistory();
          setCursor(event, "grabbing");
        },
        onDragMove,
        onDragEnd: (event: KonvaEventObject<DragEvent>) => {
          dragging.current = false;
          useGuides.setState(NO_GUIDES);
          sealHistory();
          setCursor(event, "grab");
        },
        onMouseEnter: (event: KonvaEventObject<MouseEvent>) =>
          setCursor(event, dragging.current ? "grabbing" : "grab"),
        onMouseLeave: (event: KonvaEventObject<MouseEvent>) => {
          if (!dragging.current) setCursor(event, "");
        },
      }
    : {};

  const shadow = shadowProps(shot.shadow);
  const { border, frame } = shot;
  const size = { width: box.width, height: box.height };
  const borderBox = insideStroke(size, box.radius, border.width);
  const borderNode = borderBox && (
    <Rect
      {...borderBox}
      stroke={hexToRgba(border.color, border.opacity)}
      listening={false}
    />
  );
  const imageNode = (withShadow: boolean) => (
    <KonvaImage
      image={image.source}
      x={box.image.x}
      y={box.image.y}
      width={box.image.width}
      height={box.image.height}
      cornerRadius={box.imageRadii}
      {...shadow}
      shadowEnabled={withShadow && shadow.shadowEnabled}
      listening={draggable}
    />
  );

  let body;
  if (isPlainShot(shot)) {
    // One Konva Image with rounded corners and a shadow. With both set, Konva
    // draws the rounded image into a buffer first, so the shadow follows the
    // corners and a transparent PNG's alpha. Don't clip it with a Group (that
    // removes the shadow) and don't turn off perfectDrawEnabled (that skips
    // the buffer). konva is pinned for this reason.
    body = imageNode(true);
  } else if (frame.kind === "glass") {
    const ring = framePalette(frame.theme);
    const hairline = insideStroke(size, box.radius, box.unit);
    const { content } = box;
    body = (
      <>
        {/* Translucent glass with no shadow; the content casts it. */}
        <Rect
          width={box.width}
          height={box.height}
          cornerRadius={box.radius}
          fill={ring.ringFill}
          listening={draggable}
        />
        {hairline && (
          <Rect {...hairline} stroke={ring.ringStroke} listening={false} />
        )}
        {insetSize > 0 ? (
          <>
            <Rect
              x={content.x}
              y={content.y}
              width={content.width}
              height={content.height}
              cornerRadius={contentRadii(box)}
              fill={insetColor}
              {...shadow}
              listening={false}
            />
            {imageNode(false)}
          </>
        ) : (
          // Without an inset the image itself casts the shadow, as with no frame.
          imageNode(true)
        )}
      </>
    );
  } else {
    const { chrome, content } = box;
    body = (
      <>
        {/* Opaque, so it can carry the shadow. */}
        <Rect
          width={box.width}
          height={box.height}
          cornerRadius={box.radius}
          fill={
            frame.kind === "none" ? insetColor : framePalette(frame.theme).body
          }
          {...shadow}
          listening={draggable}
        />
        {chrome && (
          <Group
            clipFunc={(context) =>
              roundedRectPath(context, box.width, box.height, box.radius)
            }
            listening={false}
          >
            <ChromeNode frame={frame} rect={chrome} unit={box.unit} />
          </Group>
        )}
        {insetSize > 0 && frame.kind !== "none" && (
          <Rect
            x={content.x}
            y={content.y}
            width={content.width}
            height={content.height}
            cornerRadius={contentRadii(box)}
            fill={insetColor}
            listening={false}
          />
        )}
        {imageNode(false)}
      </>
    );
  }

  return (
    <Group
      ref={groupRef}
      x={box.x + box.width / 2}
      y={box.y + box.height / 2}
      offsetX={box.width / 2}
      offsetY={box.height / 2}
      rotation={box.rotation}
      listening={draggable}
      {...dragProps}
    >
      {body}
      {borderNode}
    </Group>
  );
}
