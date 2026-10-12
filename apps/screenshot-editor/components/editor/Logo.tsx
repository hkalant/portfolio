import { cn } from "@/lib/utils";

/**
 * The editor's own icon, in the Brookes palette: a charcoal tile with a
 * "screenshot" on it. Not the Oxford Brookes logo. Same artwork as app/icon.svg.
 */
export function Logo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden className={cn("shrink-0", className)}>
      {/* Black in the dark theme, where the interface itself is charcoal. */}
      <rect
        width="32"
        height="32"
        rx="4"
        className="fill-[#424a52] dark:fill-black"
      />
      <rect x="7" y="9" width="18" height="14" rx="2" fill="#ffffff" />
      <rect x="7" y="9" width="18" height="4" rx="2" fill="#f9c909" />
      <rect x="7" y="11" width="18" height="2" fill="#f9c909" />
    </svg>
  );
}
