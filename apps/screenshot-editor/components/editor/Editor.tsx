"use client";

import type Konva from "konva";
import { useCallback, useRef, type ChangeEvent } from "react";
import sample from "@/assets/samples/sample-screenshot.png";
import { computeLayout } from "@/lib/design/layout";
import { EXPORT_SCALE } from "@/lib/design/limits";
import { exportDesignPng, nextPaint } from "@/lib/export/exportImage";
import { useWindowFileDrop } from "@/lib/hooks/useWindowFileDrop";
import { useWindowPaste } from "@/lib/hooks/useWindowPaste";
import { ACCEPT_ATTR, IMAGE_MESSAGES, pickImageFile } from "@/lib/image/accept";
import { ingestFile, ingestSample } from "@/lib/image/ingest";
import {
  selectActiveImage,
  selectShot,
  useEditorStore,
} from "@/lib/store/editor";
import { CanvasViewport } from "./canvas/CanvasViewport";
import { DropOverlay } from "./DropOverlay";
import { Notice } from "./Notice";
import { SmallScreenBanner } from "./SmallScreenBanner";
import { ToolRail } from "./ToolRail";
import { TopBar } from "./TopBar";

function handleIncomingFiles(files: File[]) {
  // The first usable file wins; otherwise the first file explains what went wrong.
  const file = pickImageFile(files) ?? files[0];
  if (file) void ingestFile(file);
  else useEditorStore.getState().showError(IMAGE_MESSAGES.dropHint);
}

export default function Editor() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const stageRef = useRef<Konva.Stage | null>(null);
  const layerRef = useRef<Konva.Layer | null>(null);
  const exportingRef = useRef(false);
  const { isDragging } = useWindowFileDrop(handleIncomingFiles);
  useWindowPaste(handleIncomingFiles);

  const openFilePicker = useCallback(() => fileInputRef.current?.click(), []);
  const loadSample = useCallback(() => void ingestSample(sample.src), []);

  const onFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = ""; // so picking the same file again still fires change
    if (file) void ingestFile(file);
  };

  const onExport = useCallback(async () => {
    const initial = useEditorStore.getState();
    // Not while an image is loading: the canvas is about to change.
    if (exportingRef.current || initial.loading || !selectActiveImage(initial))
      return;
    exportingRef.current = true;
    initial.setExporting(true);
    try {
      await nextPaint();
      // Read everything after the paint, so the size, the file name and the
      // drawn canvas all describe the same design.
      const state = useEditorStore.getState();
      const image = selectActiveImage(state);
      const stage = stageRef.current;
      const layer = layerRef.current;
      if (state.loading || !image || !stage || !layer) return;
      const shot = selectShot(state);
      const { canvas } = computeLayout(image, shot.padding, shot.radius);
      await exportDesignPng({
        stage,
        layer,
        size: canvas,
        scale: EXPORT_SCALE,
        sourceName: image.name,
      });
    } catch {
      useEditorStore
        .getState()
        .showError("Export failed. Try a smaller image.");
    } finally {
      exportingRef.current = false;
      useEditorStore.getState().setExporting(false);
    }
  }, []);

  return (
    <div className="flex h-dvh flex-col bg-background">
      <SmallScreenBanner />
      <div className="min-h-0 flex-1 overflow-auto">
        <div className="flex h-full min-w-[960px] flex-col">
          <TopBar onReplace={openFilePicker} onExport={onExport} />
          <div className="flex min-h-0 flex-1">
            <ToolRail />
            <main
              className="relative min-w-0 flex-1 bg-workspace"
              aria-label="Canvas"
            >
              <CanvasViewport
                stageRef={stageRef}
                layerRef={layerRef}
                onUpload={openFilePicker}
                onSample={loadSample}
              />
              {isDragging && <DropOverlay />}
            </main>
          </div>
        </div>
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPT_ATTR}
        className="sr-only"
        tabIndex={-1}
        aria-label="Upload image"
        data-testid="file-input"
        onChange={onFileChange}
      />
      <Notice />
    </div>
  );
}
