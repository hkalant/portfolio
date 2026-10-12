/**
 * Shown while the editor's code loads. Same frame as the editor, so nothing
 * jumps. It is in the static HTML, so CSS picks the layout here; the md
 * breakpoint is the editor's 768px switch.
 */
export function EditorSkeleton() {
  return (
    <div
      className="flex h-dvh flex-col overflow-hidden bg-background"
      aria-busy="true"
      aria-label="Loading editor"
    >
      <div className="h-13 shrink-0 border-b md:h-14" />
      <div className="flex min-h-0 flex-1">
        <div className="hidden w-20 shrink-0 border-r md:block" />
        <div className="hidden w-72 shrink-0 border-r md:block lg:w-80" />
        <div className="flex min-w-0 flex-1 items-center justify-center bg-workspace text-sm text-muted-foreground">
          Loading editor…
        </div>
      </div>
      <div className="h-[calc(3.5rem+env(safe-area-inset-bottom))] shrink-0 border-t md:hidden" />
    </div>
  );
}
