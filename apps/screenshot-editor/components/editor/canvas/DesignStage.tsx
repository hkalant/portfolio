"use client";

import type Konva from "konva";
import { useEffect, type RefObject } from "react";
import { Layer, Stage } from "react-konva";
import type { DesignLayout } from "@/lib/design/layout";
import type { LinearBackground, ShadowSpec } from "@/lib/design/schema";
import { useDevicePixelRatio } from "@/lib/hooks/useDevicePixelRatio";
import type { LoadedImage } from "@/lib/image/load";
import { BackgroundNode } from "./nodes/Background";
import { ShotNode } from "./nodes/Shot";

type Props = {
  image: LoadedImage;
  layout: DesignLayout;
  background: LinearBackground;
  shadow: ShadowSpec;
  /** On-screen zoom. The export ignores it and renders at true size. */
  scale: number;
  stageRef: RefObject<Konva.Stage | null>;
  layerRef: RefObject<Konva.Layer | null>;
};

export function DesignStage({
  image,
  layout,
  background,
  shadow,
  scale,
  stageRef,
  layerRef,
}: Props) {
  const pixelRatio = useDevicePixelRatio();
  // Whole pixels: Konva rounds bitmap sizes down, which would blur fractional sizes.
  const width = Math.max(1, Math.floor(layout.canvas.width * scale));
  const height = Math.max(1, Math.floor(layout.canvas.height * scale));

  // Large screenshots are drawn much smaller than their size in the preview.
  // "high" smoothing keeps them sharp; canvases reset it whenever they resize.
  useEffect(() => {
    const layer = layerRef.current;
    if (!layer) return;
    layer.on("beforeDraw.quality", () => {
      layer.getContext()._context.imageSmoothingQuality = "high";
    });
    layer.batchDraw();
    return () => {
      layer.off("beforeDraw.quality");
    };
  }, [layerRef, pixelRatio]);

  return (
    <div
      role="img"
      aria-label="Design preview"
      data-testid="design-stage"
      data-width={layout.canvas.width}
      data-height={layout.canvas.height}
      className="shadow-[0_1px_2px_rgba(0,0,0,0.06),0_8px_24px_rgba(0,0,0,0.08)]"
      style={{ width, height }}
    >
      <Stage
        key={pixelRatio}
        ref={stageRef}
        width={width}
        height={height}
        scaleX={scale}
        scaleY={scale}
        listening={false}
      >
        <Layer ref={layerRef} listening={false}>
          <BackgroundNode
            width={layout.canvas.width}
            height={layout.canvas.height}
            background={background}
          />
          <ShotNode
            image={image}
            rect={layout.imageRect}
            radius={layout.radius}
            shadow={shadow}
          />
        </Layer>
      </Stage>
    </div>
  );
}
