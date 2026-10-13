/**
 * Shown while the editor's code loads. Same frame as the editor, so nothing
 * jumps. It is in the static HTML, so CSS picks the layout here; the md
 * breakpoint is the editor's 768px switch.
 */
export function EditorSkeleton() {
  return (
    <div
      className="flex h-dvh flex-col overflow-hidden bg-background pr-[env(safe-area-inset-right)] pl-[env(safe-area-inset-left)] font-sans text-foreground scheme-light md:gap-2 md:py-2 md:pr-[max(0.5rem,env(safe-area-inset-right))] md:pl-[max(0.5rem,env(safe-area-inset-left))] md:ambient dark:scheme-dark"
      aria-busy="true"
      aria-label="Loading editor"
    >
      <div className="h-13 shrink-0 border-b md:h-14 md:rounded-xl md:border-b-0 md:glass" />
      <div className="flex min-h-0 flex-1 md:gap-2">
        <div className="hidden w-72 shrink-0 rounded-xl md:block md:glass lg:w-80" />
        <div className="flex min-w-0 flex-1 items-center justify-center bg-workspace text-sm text-muted-foreground md:bg-transparent">
          Loading editor…
        </div>
      </div>
      <div className="h-[calc(3.5rem+var(--safe-area-bottom))] shrink-0 border-t md:hidden" />
    </div>
  );
}
