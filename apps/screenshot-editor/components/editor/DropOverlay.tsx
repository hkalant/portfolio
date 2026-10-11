export function DropOverlay() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-3 z-10 flex items-center justify-center rounded-2xl border-2 border-dashed border-primary/50 bg-background/70 backdrop-blur-[2px]"
    >
      <p className="text-base font-medium">Drop to add your screenshot</p>
    </div>
  );
}
