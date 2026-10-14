"use client";

import { Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

// Placeholders until the real tutorials exist.
const VIDEO_TUTORIAL_URL: string | null = null;
const TEXT_TUTORIAL_URL = "#";

/** Font Awesome Free "book" (solid), CC BY 4.0. */
function BookIcon() {
  return (
    <svg viewBox="0 0 448 512" aria-hidden="true" className="fill-current">
      <path d="M96 0C43 0 0 43 0 96L0 416c0 53 43 96 96 96l288 0 32 0c17.7 0 32-14.3 32-32s-14.3-32-32-32l0-64c17.7 0 32-14.3 32-32l0-320c0-17.7-14.3-32-32-32L384 0 96 0zm0 384l256 0 0 64L96 448c-17.7 0-32-14.3-32-32s14.3-32 32-32zm32-240c0-8.8 7.2-16 16-16l192 0c8.8 0 16 7.2 16 16s-7.2 16-16 16l-192 0c-8.8 0-16-7.2-16-16zm16 48l192 0c8.8 0 16 7.2 16 16s-7.2 16-16 16l-192 0c-8.8 0-16-7.2-16-16s7.2-16 16-16z" />
    </svg>
  );
}

/** Tutorials: a video and a link to a written guide. */
export function HelpMenu() {
  const external = TEXT_TUTORIAL_URL !== "#";
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Tutorials"
          title="Tutorials"
        >
          <BookIcon />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 space-y-3">
        <h2 className="text-sm font-semibold">Tutorials</h2>
        {VIDEO_TUTORIAL_URL ? (
          <video
            src={VIDEO_TUTORIAL_URL}
            controls
            className="aspect-video w-full rounded-lg bg-black"
          />
        ) : (
          <div
            className="flex aspect-video w-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed text-muted-foreground"
            data-testid="video-tutorial-placeholder"
          >
            <Play className="size-6" aria-hidden />
            <span className="text-xs">Video tutorial coming soon</span>
          </div>
        )}
        <a
          href={TEXT_TUTORIAL_URL}
          {...(external
            ? { target: "_blank", rel: "noopener noreferrer" }
            : { onClick: (event) => event.preventDefault() })}
          className="inline-block rounded-sm text-sm font-medium underline underline-offset-4 outline-none focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          Read the text tutorial
        </a>
      </PopoverContent>
    </Popover>
  );
}
