"use client";

import { useCallback, useRef, type ChangeEvent } from "react";
import sample from "@/assets/samples/sample-screenshot.png";
import { useAutosave } from "@/lib/hooks/useAutosave";
import { useShortcuts } from "@/lib/hooks/useShortcuts";
import { useWindowFileDrop } from "@/lib/hooks/useWindowFileDrop";
import { useWindowPaste } from "@/lib/hooks/useWindowPaste";
import { ACCEPT_ATTR, IMAGE_MESSAGES, pickImageFile } from "@/lib/image/accept";
import { ingestFile, ingestSample } from "@/lib/image/ingest";
import { useEditorStore } from "@/lib/store/editor";
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
  const { isDragging } = useWindowFileDrop(handleIncomingFiles);
  useWindowPaste(handleIncomingFiles);

  const openFilePicker = useCallback(() => fileInputRef.current?.click(), []);
  const loadSample = useCallback(() => void ingestSample(sample.src), []);
  useShortcuts({ onOpen: openFilePicker });
  useAutosave();

  const onFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = ""; // so picking the same file again still fires change
    if (file) void ingestFile(file);
  };

  return (
    <div className="flex h-dvh flex-col bg-background">
      <SmallScreenBanner />
      <div className="min-h-0 flex-1 overflow-auto">
        <div className="flex h-full min-w-[960px] flex-col">
          <TopBar onReplace={openFilePicker} />
          <div className="flex min-h-0 flex-1">
            <ToolRail />
            <main
              className="relative min-w-0 flex-1 bg-workspace"
              aria-label="Canvas"
            >
              <CanvasViewport onUpload={openFilePicker} onSample={loadSample} />
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
