"use client";

import { CircleAlert, X } from "lucide-react";
import { useEffect } from "react";
import { useEditorStore } from "@/lib/store/editor";

const AUTO_HIDE_MS = 8000;

export function Notice() {
  const notice = useEditorStore((state) => state.notice);
  const dismissNotice = useEditorStore((state) => state.dismissNotice);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(dismissNotice, AUTO_HIDE_MS);
    return () => window.clearTimeout(timer);
  }, [notice, dismissNotice]);

  if (!notice) return null;
  return (
    <div
      key={notice.id}
      role="alert"
      data-testid="notice"
      className="fixed bottom-6 left-1/2 z-50 flex max-w-[calc(100vw-2rem)] -translate-x-1/2 items-center gap-3 rounded-lg border border-destructive/30 bg-background py-2.5 pr-2 pl-4 text-sm shadow-lg"
    >
      <CircleAlert className="size-4 shrink-0 text-destructive" aria-hidden />
      <span>{notice.message}</span>
      <button
        type="button"
        onClick={dismissNotice}
        aria-label="Dismiss"
        className="rounded-md p-1 text-muted-foreground outline-none hover:bg-accent hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring"
      >
        <X className="size-4" aria-hidden />
      </button>
    </div>
  );
}
