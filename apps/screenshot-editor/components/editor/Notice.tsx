"use client";

import { CircleAlert, CircleCheck, X } from "lucide-react";
import { useEffect } from "react";
import { useEditorStore } from "@/lib/store/editor";
import { cn } from "@/lib/utils";

const AUTO_HIDE_MS = { error: 8000, info: 3000 } as const;

export function Notice() {
  const notice = useEditorStore((state) => state.notice);
  const dismissNotice = useEditorStore((state) => state.dismissNotice);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(dismissNotice, AUTO_HIDE_MS[notice.kind]);
    return () => window.clearTimeout(timer);
  }, [notice, dismissNotice]);

  if (!notice) return null;
  const error = notice.kind === "error";
  const Icon = error ? CircleAlert : CircleCheck;
  return (
    <div
      key={notice.id}
      role={error ? "alert" : "status"}
      data-testid="notice"
      data-kind={notice.kind}
      className={cn(
        "fixed bottom-6 left-1/2 z-50 flex max-w-[calc(100vw-2rem)] -translate-x-1/2 items-center gap-3 rounded-lg border bg-background py-2.5 pr-2 pl-4 text-sm shadow-lg",
        error && "border-destructive/30",
      )}
    >
      <Icon
        className={cn(
          "size-4 shrink-0",
          error ? "text-destructive" : "text-emerald-600",
        )}
        aria-hidden
      />
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
