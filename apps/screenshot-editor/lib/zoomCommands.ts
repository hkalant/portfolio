// The canvas zoom lives in the canvas viewport; keyboard shortcuts reach it
// through the handler it registers here while a design is on screen.

export type ZoomCommand = "in" | "out" | "reset";

let handler: ((command: ZoomCommand) => void) | null = null;

/** Registers what the zoom shortcuts do. Returns a function that removes it. */
export function setZoomHandler(next: (command: ZoomCommand) => void) {
  handler = next;
  return () => {
    if (handler === next) handler = null;
  };
}

/** Zooms the canvas; false when there is nothing on screen to zoom. */
export function runZoom(command: ZoomCommand): boolean {
  if (!handler) return false;
  handler(command);
  return true;
}
