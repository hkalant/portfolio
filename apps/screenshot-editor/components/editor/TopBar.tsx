"use client";

import { ImageUp } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { selectActiveImage, useEditorStore } from "@/lib/store/editor";
import { BrookesLogo } from "./BrookesLogo";
import { CopyButton } from "./topbar/CopyButton";
import { ExportMenu } from "./topbar/ExportMenu";
import { HelpMenu } from "./topbar/HelpMenu";
import { ShortcutsMenu } from "./topbar/ShortcutsMenu";
import { HistoryButtons } from "./topbar/HistoryButtons";
import { SizeMenu } from "./topbar/SizeMenu";
import { ThemeToggle } from "./topbar/ThemeToggle";

type Props = { onReplace: () => void };

/** The desktop top bar. */
export function TopBar({ onReplace }: Props) {
  const image = useEditorStore(selectActiveImage);
  const loading = useEditorStore((state) => state.loading);

  return (
    <header className="flex h-14 shrink-0 items-center gap-2 rounded-xl glass px-3 lg:gap-3 lg:px-4">
      <Link
        href="/"
        aria-label="Screenshot Editor home"
        className="flex shrink-0 items-center gap-3 rounded-sm font-semibold whitespace-nowrap outline-none focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        {/* The logo only where the bar has room for it. */}
        <BrookesLogo className="hidden h-8 w-auto text-(--obu-charcoal) lg:block dark:text-foreground" />
        <span className="hidden h-6 w-px bg-border lg:block" aria-hidden />
        Screenshot Editor
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
      <CopyButton />
      <ThemeToggle />
      <ExportMenu />
      <ShortcutsMenu />
      <HelpMenu />
    </header>
  );
}
