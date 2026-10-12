"use client";

import { Download, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { runExport } from "@/lib/export/controller";
import { FORMAT_INFO } from "@/lib/export/options";
import { selectActiveImage, useEditorStore } from "@/lib/store/editor";

// Placeholder from the foundation phase: the main export button only.
export function ExportMenu({ compact = false }: { compact?: boolean }) {
  const image = useEditorStore(selectActiveImage);
  const exporting = useEditorStore((state) => state.exporting);
  const loading = useEditorStore((state) => state.loading);
  const { format, scale } = useEditorStore((state) => state.exportOptions);
  const label = `Export ${FORMAT_INFO[format].label} ${scale}×`;
  return (
    <Button
      size={compact ? "icon" : "sm"}
      onClick={() => void runExport()}
      disabled={!image || exporting || loading}
      aria-label={compact ? label : undefined}
    >
      {exporting ? (
        <LoaderCircle className="animate-spin" aria-hidden />
      ) : (
        <Download aria-hidden />
      )}
      {!compact && label}
    </Button>
  );
}
