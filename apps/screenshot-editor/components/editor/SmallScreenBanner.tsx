"use client";

import { X } from "lucide-react";
import { useState } from "react";

/** The M1 editor needs about 960px. The phone layout comes in a later milestone. */
export function SmallScreenBanner() {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;
  return (
    <div className="flex items-center gap-2 border-b bg-muted px-4 py-2 text-sm min-[960px]:hidden">
      <p className="flex-1">The editor works best on a larger screen.</p>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        aria-label="Dismiss"
        className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
      >
        <X className="size-4" aria-hidden />
      </button>
    </div>
  );
}
