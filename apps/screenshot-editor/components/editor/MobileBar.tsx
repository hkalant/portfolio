"use client";

import { ImageUp } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { selectActiveImage, useEditorStore } from "@/lib/store/editor";
import { Logo } from "./Logo";
import { CopyButton } from "./topbar/CopyButton";
import { ExportMenu } from "./topbar/ExportMenu";
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
        title="Screenshot Editor home"
        className="flex size-10 shrink-0 items-center justify-center rounded-md outline-none focus-visible:ring-[3px] focus-visible:ring-ring"
      >
        <Logo className="size-7" />
      </Link>
      <HistoryButtons />
      <div className="min-w-0 flex-1" />
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
      <CopyButton />
      <ExportMenu compact />
    </header>
  );
}
