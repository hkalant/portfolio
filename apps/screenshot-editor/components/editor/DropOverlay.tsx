export function DropOverlay() {
  return (
    <div
      aria-hidden
      // Denser in dark mode, so a bright design behind doesn't wash out the text.
      className="pointer-events-none absolute inset-3 z-10 flex items-center justify-center rounded-2xl border-2 border-dashed border-primary/50 bg-background/70 backdrop-blur-[2px] dark:border-primary/40 dark:bg-background/80"
    >
      <p className="text-base font-medium">Drop to add your screenshot</p>
    </div>
  );
}
