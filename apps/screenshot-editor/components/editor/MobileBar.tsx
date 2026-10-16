"use client";

import { ImageUp } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { selectActiveImage, useEditorStore } from "@/lib/store/editor";
import { CopyButton } from "./topbar/CopyButton";
import { ExportMenu } from "./topbar/ExportMenu";
import { HelpMenu } from "./topbar/HelpMenu";
import { HistoryButtons } from "./topbar/HistoryButtons";

type Props = { onReplace: () => void };

/** The compact top bar of the mobile layout. */
export function MobileBar({ onReplace }: Props) {
  const image = useEditorStore(selectActiveImage);
  const loading = useEditorStore((state) => state.loading);

  return (
    // The shared top bar buttons are 36px; at least 40px suits fingers.
    <header className="flex h-13 shrink-0 items-center gap-1 border-b bg-background px-2 [&_[data-slot=button]]:min-h-10 [&_[data-slot=button]]:min-w-10">
      <Link
        href="/"
        aria-label="Screenshot Editor home"
        // Shortened before any button is pushed off a narrow screen.
        className="flex h-10 min-w-0 items-center rounded-md px-2 text-sm font-semibold whitespace-nowrap outline-none focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        <span className="truncate">Screenshot Editor</span>
      </Link>
      <HistoryButtons />
      <div className="flex-1" />
      {image && (
        <Button
          variant="outline"
          size="icon"
          onClick={onReplace}
          disabled={loading}
          aria-label="Replace image"
          title="Replace image"
        >
          <ImageUp aria-hidden />
        </Button>
      )}
      <CopyButton compact />
      <ExportMenu compact />
      <HelpMenu />
    </header>
  );
}
