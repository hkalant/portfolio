"use client";

import { useCallback, useRef, type ChangeEvent } from "react";
import sample from "@/assets/samples/sample-screenshot.png";
import { useAutosave } from "@/lib/hooks/useAutosave";
import { DESKTOP_QUERY, useMediaQuery } from "@/lib/hooks/useMediaQuery";
import { useShortcuts } from "@/lib/hooks/useShortcuts";
import { useTheme } from "@/lib/hooks/useTheme";
import { useWindowFileDrop } from "@/lib/hooks/useWindowFileDrop";
import { useWindowPaste } from "@/lib/hooks/useWindowPaste";
import { ACCEPT_ATTR, IMAGE_MESSAGES, pickImageFile } from "@/lib/image/accept";
import { ingestFile, ingestSample } from "@/lib/image/ingest";
import { useEditorStore } from "@/lib/store/editor";
import { cn } from "@/lib/utils";
import { CanvasViewport } from "./canvas/CanvasViewport";
import { DropOverlay } from "./DropOverlay";
import { MobileBar } from "./MobileBar";
import { MobilePanel } from "./MobilePanel";
import { MobileTabs } from "./MobileTabs";
import { Notice } from "./Notice";
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

  const desktop = useMediaQuery(DESKTOP_QUERY);
  // Here rather than in the theme toggle, which the mobile layout doesn't
  // show: the theme keeps following the system in both layouts.
  useTheme();

  const onFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = ""; // so picking the same file again still fires change
    if (file) void ingestFile(file);
  };

  // One layout or the other, never both, so no control or test id appears
  // twice. The canvas keeps its place in the tree in both, so crossing the
  // breakpoint doesn't remount the stage.
  return (
    <div
      className={cn(
        // Colour, font and scheme here as well as on body, which a host page
        // (such as the artifact preview) may style over.
        "flex h-dvh flex-col overflow-hidden font-sans text-foreground scheme-light dark:scheme-dark",
        // Desktop: glass panes floating over the brand wash, kept clear of
        // side notches.
        desktop
          ? "gap-2 py-2 pr-[max(0.5rem,env(safe-area-inset-right))] pl-[max(0.5rem,env(safe-area-inset-left))] ambient"
          : "bg-background pr-[env(safe-area-inset-right)] pl-[env(safe-area-inset-left)]",
      )}
    >
      {desktop ? (
        <TopBar onReplace={openFilePicker} />
      ) : (
        <MobileBar onReplace={openFilePicker} />
      )}
      <div
        className={cn("flex min-h-0 flex-1", desktop ? "gap-2" : "flex-col")}
      >
        {desktop && <ToolRail />}
        <main
          className={cn(
            "relative min-h-0 min-w-0 flex-1",
            !desktop && "bg-workspace",
          )}
          aria-label="Canvas"
        >
          <CanvasViewport onUpload={openFilePicker} onSample={loadSample} />
          {isDragging && <DropOverlay />}
        </main>
        {!desktop && <MobilePanel />}
      </div>
      {!desktop && <MobileTabs />}
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
