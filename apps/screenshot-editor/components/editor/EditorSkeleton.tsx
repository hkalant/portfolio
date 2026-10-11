/** Shown while the editor's code loads. Same frame as the editor, so nothing jumps. */
export function EditorSkeleton() {
  return (
    <div
      className="flex h-dvh flex-col bg-background"
      aria-busy="true"
      aria-label="Loading editor"
    >
      <div className="min-h-0 flex-1 overflow-hidden">
        <div className="flex h-full min-w-[960px] flex-col">
          <div className="h-14 shrink-0 border-b" />
          <div className="flex min-h-0 flex-1">
            <div className="w-20 shrink-0 border-r" />
            <div className="w-80 shrink-0 border-r" />
            <div className="flex flex-1 items-center justify-center bg-workspace text-sm text-muted-foreground">
              Loading editor…
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
