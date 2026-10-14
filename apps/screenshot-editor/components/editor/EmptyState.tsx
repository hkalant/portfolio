"use client";

import { LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

type Props = {
  loading: boolean;
  /** The last design is being read from storage. */
  restoring?: boolean;
  onUpload: () => void;
  onSample: () => void;
};

export function EmptyState({ loading, restoring, onUpload, onSample }: Props) {
  const busy = loading || restoring;

  return (
    <div
      className="flex min-h-full flex-col gap-3 p-4 sm:p-6"
      data-testid="empty-state"
    >
      {/* The whole workspace is the drop zone; a click opens the file picker. */}
      <button
        type="button"
        onClick={onUpload}
        disabled={busy}
        className="flex min-h-64 flex-1 flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dotted border-muted-foreground/40 bg-transparent px-6 py-10 text-center transition-colors outline-none hover:border-muted-foreground/70 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-progress"
      >
        {busy && (
          <LoaderCircle
            className="size-6 animate-spin text-muted-foreground"
            aria-hidden
          />
        )}
        <span className="text-xl font-semibold text-balance sm:text-2xl">
          {restoring
            ? "Restoring your last design…"
            : loading
              ? "Loading image…"
              : "Drag and drop your screenshot here"}
        </span>
        <span className="max-w-md text-sm text-balance text-muted-foreground">
          Tip: If you have copied a screenshot, you can paste it here with
          Ctrl+V (Windows) or Cmd+V (Mac)
        </span>
      </button>
      <Button
        variant="ghost"
        size="sm"
        className="self-center"
        onClick={onSample}
        disabled={busy}
      >
        Try a sample image
      </Button>
    </div>
  );
}
