"use client";

import { ImageUp } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { selectActiveImage, useEditorStore } from "@/lib/store/editor";
import { Logo } from "./Logo";
import { CopyButton } from "./topbar/CopyButton";
import { ExportMenu } from "./topbar/ExportMenu";
import { HistoryButtons } from "./topbar/HistoryButtons";
import { SizeMenu } from "./topbar/SizeMenu";
import { ThemeToggle } from "./topbar/ThemeToggle";

type Props = { onReplace: () => void };

/** The desktop top bar. */
export function TopBar({ onReplace }: Props) {
  const image = useEditorStore(selectActiveImage);
  const loading = useEditorStore((state) => state.loading);

  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b bg-background px-3 lg:gap-3 lg:px-4">
      <Link
        href="/"
        aria-label="Screenshot Editor home"
        className="flex items-center gap-2 rounded-md font-semibold outline-none focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        <Logo className="size-6" />
        <span className="hidden flex-col leading-tight xl:flex">
          Screenshot Editor
          <span className="font-brand text-[11px] font-normal text-muted-foreground">
            Oxford Brookes University
          </span>
        </span>
      </Link>
      <div className="mx-1 h-6 w-px bg-border" aria-hidden />
      <SizeMenu />
      <HistoryButtons />
      <div className="flex-1" />
      {image && (
        <Button
          variant="outline"
          size="sm"
          onClick={onReplace}
          disabled={loading}
          aria-label="Replace image"
          title="Replace image"
        >
          <ImageUp aria-hidden />
          <span className="hidden lg:inline">Replace image</span>
        </Button>
      )}
      <ThemeToggle />
      <CopyButton />
      <ExportMenu />
    </header>
  );
}
