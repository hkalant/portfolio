"use client";

import { ImagePlus, LoaderCircle } from "lucide-react";
import { useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";
import { currentPlatform, pasteShortcutLabel } from "@/lib/platform";

const subscribe = () => () => {};

type Props = {
  loading: boolean;
  /** The last design is being read from storage. */
  restoring?: boolean;
  onUpload: () => void;
  onSample: () => void;
};

export function EmptyState({ loading, restoring, onUpload, onSample }: Props) {
  const busy = loading || restoring;
  const pasteKey = useSyncExternalStore(
    subscribe,
    () => pasteShortcutLabel(currentPlatform()),
    () => "Ctrl+V",
  );

  return (
    <div
      className="flex min-h-full items-center justify-center p-8"
      data-testid="empty-state"
    >
      <div className="flex w-full max-w-lg flex-col items-center gap-3">
        <button
          type="button"
          onClick={onUpload}
          disabled={busy}
          className="flex w-full flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-muted-foreground/25 bg-background/60 px-8 py-14 text-center transition-colors outline-none hover:border-muted-foreground/45 hover:bg-background focus-visible:ring-[3px] focus-visible:ring-ring disabled:cursor-progress"
        >
          <span className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
            {busy ? (
              <LoaderCircle className="size-6 animate-spin" aria-hidden />
            ) : (
              <ImagePlus className="size-6" aria-hidden />
            )}
          </span>
          <span className="text-base font-medium">
            {restoring
              ? "Restoring your last design…"
              : loading
                ? "Loading image…"
                : "Drop, paste or click to add a screenshot"}
          </span>
          <span className="text-sm text-muted-foreground">
            Paste with {pasteKey} · PNG, JPG or WebP · up to 50 MB
          </span>
        </button>
        <Button variant="ghost" size="sm" onClick={onSample} disabled={busy}>
          Try a sample image
        </Button>
      </div>
    </div>
  );
}
