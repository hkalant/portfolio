"use client";

import type Konva from "konva";
import { LoaderCircle } from "lucide-react";
import { useEffect, type RefObject } from "react";
import { computeLayout, computePreviewScale } from "@/lib/design/layout";
import { EXPORT_SCALE } from "@/lib/design/limits";
import { useElementSize } from "@/lib/hooks/useElementSize";
import {
  selectActiveImage,
  selectShot,
  useEditorStore,
} from "@/lib/store/editor";
import { EmptyState } from "../EmptyState";
import { DesignStage } from "./DesignStage";

// Room kept free at the bottom of the workspace for the size readout.
const READOUT_SPACE = 40;

type Props = {
  stageRef: RefObject<Konva.Stage | null>;
  layerRef: RefObject<Konva.Layer | null>;
  onUpload: () => void;
  onSample: () => void;
};

export function CanvasViewport({
  stageRef,
  layerRef,
  onUpload,
  onSample,
}: Props) {
  const image = useEditorStore(selectActiveImage);
  const shot = useEditorStore(selectShot);
  const background = useEditorStore((state) => state.design.background);
  const loading = useEditorStore((state) => state.loading);
  const pruneImages = useEditorStore((state) => state.pruneImages);
  // An absolutely positioned box: its size never depends on the stage inside it.
  const [measureRef, size] = useElementSize<HTMLDivElement>();

  // Free the previous image once the new one is on screen.
  useEffect(() => {
    pruneImages();
  }, [shot.imageId, pruneImages]);

  if (!image) {
    return (
      <div ref={measureRef} className="absolute inset-0 overflow-auto">
        <EmptyState loading={loading} onUpload={onUpload} onSample={onSample} />
      </div>
    );
  }

  const layout = computeLayout(image, shot.padding, shot.radius);
  const scale = computePreviewScale(
    { width: size.width, height: size.height - READOUT_SPACE },
    layout.canvas,
  );
  const { width, height } = layout.canvas;

  return (
    <div ref={measureRef} className="absolute inset-0 overflow-hidden">
      {size.width > 0 && (
        <div
          className="flex h-full items-center justify-center"
          style={{ paddingBottom: READOUT_SPACE }}
        >
          <DesignStage
            image={image}
            layout={layout}
            background={background}
            shadow={shot.shadow}
            scale={scale}
            stageRef={stageRef}
            layerRef={layerRef}
          />
        </div>
      )}
      <p className="absolute inset-x-0 bottom-3 text-center text-xs text-muted-foreground tabular-nums">
        {width} × {height} · {Math.round(scale * 100)}% · exports{" "}
        {width * EXPORT_SCALE} × {height * EXPORT_SCALE}
      </p>
      {loading && (
        <div className="absolute top-3 right-3 flex items-center gap-2 rounded-md bg-background/90 px-3 py-1.5 text-xs shadow-sm">
          <LoaderCircle className="size-3.5 animate-spin" aria-hidden />
          Loading image…
        </div>
      )}
    </div>
  );
}
