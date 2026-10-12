"use client";

import { Copy } from "lucide-react";
import { useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";
import { runCopy } from "@/lib/export/controller";
import { canCopyImages } from "@/lib/export/exportImage";
import { selectActiveImage, useEditorStore } from "@/lib/store/editor";

const subscribe = () => () => {};

/** Copies the design as a PNG. Hidden where browsers can't put images on the clipboard. */
export function CopyButton() {
  const image = useEditorStore(selectActiveImage);
  // As for Export: copying waits for the restore (runCopy ignores it until then).
  const busy = useEditorStore((state) => state.loading || state.restoring);
  const exporting = useEditorStore((state) => state.exporting);
  const supported = useSyncExternalStore(subscribe, canCopyImages, () => false);
  if (!supported) return null;
  return (
    <Button
      variant="outline"
      size="icon"
      // Straight from the click: the clipboard write must start in the gesture.
      onClick={runCopy}
      disabled={!image || busy}
      // Busy but focusable while a copy or export runs (runCopy ignores clicks).
      aria-disabled={exporting || undefined}
      className="aria-disabled:opacity-50"
      aria-label="Copy image"
      title="Copy image"
    >
      <Copy aria-hidden />
    </Button>
  );
}
