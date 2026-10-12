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
  const busy = useEditorStore((state) => state.loading || state.exporting);
  const supported = useSyncExternalStore(subscribe, canCopyImages, () => false);
  if (!supported) return null;
  return (
    <Button
      variant="outline"
      size="icon"
      // Straight from the click: the clipboard write must start in the gesture.
      onClick={runCopy}
      disabled={!image || busy}
      aria-label="Copy image"
      title="Copy image"
    >
      <Copy aria-hidden />
    </Button>
  );
}
