"use client";

import { Download, ImageUp, LoaderCircle } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { computeLayout } from "@/lib/design/layout";
import { EXPORT_SCALE } from "@/lib/design/limits";
import {
  selectActiveImage,
  selectShot,
  useEditorStore,
} from "@/lib/store/editor";
import { Logo } from "./Logo";

type Props = { onReplace: () => void; onExport: () => void };

export function TopBar({ onReplace, onExport }: Props) {
  const image = useEditorStore(selectActiveImage);
  const shot = useEditorStore(selectShot);
  const exporting = useEditorStore((state) => state.exporting);
  const loading = useEditorStore((state) => state.loading);
  const canvas = image
    ? computeLayout(image, shot.padding, shot.radius).canvas
    : null;

  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b bg-background px-4">
      <Link
        href="/"
        className="flex items-center gap-2 rounded-md font-semibold outline-none focus-visible:ring-[3px] focus-visible:ring-ring"
      >
        <Logo className="size-6" />
        Screenshot Editor
      </Link>
      <div className="flex-1" />
      {image && (
        <Button
          variant="outline"
          size="sm"
          onClick={onReplace}
          disabled={loading}
        >
          <ImageUp aria-hidden />
          Replace image
        </Button>
      )}
      {canvas && (
        <span className="hidden text-xs text-muted-foreground tabular-nums lg:inline">
          {canvas.width * EXPORT_SCALE} × {canvas.height * EXPORT_SCALE} px
        </span>
      )}
      <Button
        size="sm"
        onClick={onExport}
        disabled={!image || exporting || loading}
      >
        {exporting ? (
          <LoaderCircle className="animate-spin" aria-hidden />
        ) : (
          <Download aria-hidden />
        )}
        Export PNG 2×
      </Button>
    </header>
  );
}
