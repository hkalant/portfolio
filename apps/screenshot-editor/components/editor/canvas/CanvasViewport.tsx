"use client";

import { LoaderCircle } from "lucide-react";
import { useEffect } from "react";
import { computePreviewScale } from "@/lib/design/layout";
import { planExport } from "@/lib/export/exportImage";
import { useElementSize } from "@/lib/hooks/useElementSize";
import { CANVAS_FOCUS_ATTRIBUTE } from "@/lib/hooks/useShortcuts";
import { selectActiveImage, useEditorStore } from "@/lib/store/editor";
import { useDesignLayout } from "@/lib/store/hooks";
import { cn } from "@/lib/utils";
import { EmptyState } from "../EmptyState";
import { DesignStage } from "./DesignStage";

// Room kept free at the bottom of the workspace for the size readout: two
// lines, since a capped export's note wraps in a narrow workspace.
const READOUT_SPACE = 40;
// Below this workspace height (a phone in landscape with a panel open) the
// readout would crowd out the canvas, so only screen readers get it.
const READOUT_MIN_HEIGHT = 160;

type Props = {
  onUpload: () => void;
  onSample: () => void;
};

export function CanvasViewport({ onUpload, onSample }: Props) {
  const image = useEditorStore(selectActiveImage);
  const layout = useDesignLayout();
  const revision = useEditorStore((state) => state.revision);
  const loading = useEditorStore((state) => state.loading);
  const restoring = useEditorStore((state) => state.restoring);
  const transparent = useEditorStore(
    (state) => state.design.background.kind === "transparent",
  );
  const scaleOption = useEditorStore((state) => state.exportOptions.scale);
  const pruneImages = useEditorStore((state) => state.pruneImages);
  // An absolutely positioned box: its size never depends on the stage inside it.
  const [measureRef, size] = useElementSize<HTMLDivElement>();

  // Free images nothing refers to any more, once the new design is on screen.
  useEffect(() => {
    pruneImages();
  }, [revision, pruneImages]);

  if (!image || !layout) {
    return (
      <div ref={measureRef} className="absolute inset-0 overflow-auto">
        <EmptyState
          loading={loading}
          restoring={restoring}
          onUpload={onUpload}
          onSample={onSample}
        />
      </div>
    );
  }

  const readoutSpace = size.height >= READOUT_MIN_HEIGHT ? READOUT_SPACE : 0;
  const scale = computePreviewScale(
    { width: size.width, height: size.height - readoutSpace },
    layout.canvas,
    size.width < 480 ? 16 : 32,
  );
  const { width, height } = layout.canvas;
  const plan = planExport(layout.canvas, scaleOption);

  return (
    <div ref={measureRef} className="absolute inset-0 overflow-hidden">
      {size.width > 0 && (
        <div
          className="flex h-full items-center justify-center"
          style={{ paddingBottom: readoutSpace }}
        >
          <div
            {...{ [CANVAS_FOCUS_ATTRIBUTE]: "" }}
            tabIndex={layout.draggable ? 0 : -1}
            aria-label={
              layout.draggable
                ? "Design canvas. Drag the screenshot or use the arrow keys to move it."
                : "Design canvas"
            }
            className={cn(
              "rounded-[2px] outline-none focus-visible:ring-[3px] focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-workspace",
              transparent && "checkerboard",
            )}
          >
            <DesignStage image={image} layout={layout} scale={scale} />
          </div>
        </div>
      )}
      <p
        className={cn(
          "absolute inset-x-0 bottom-2 px-3 text-center text-xs/4 text-balance text-muted-foreground tabular-nums",
          readoutSpace === 0 && "sr-only",
        )}
        data-testid="size-readout"
      >
        {width} × {height} · {Math.round(scale * 100)}% · exports{" "}
        {plan.pixels.width} × {plan.pixels.height}
        {plan.capped && " (largest size this browser allows)"}
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
