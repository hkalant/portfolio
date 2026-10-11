import { cn } from "@/lib/utils";

/** A gradient tile with a rounded "screenshot" on it. Same artwork as app/icon.svg. */
export function Logo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden className={cn("shrink-0", className)}>
      <defs>
        <linearGradient id="logo-gradient" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#c471f5" />
          <stop offset="1" stopColor="#fa71cd" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="8" fill="url(#logo-gradient)" />
      <rect x="7" y="9" width="18" height="14" rx="3" fill="#ffffff" />
      <rect x="7" y="9" width="18" height="4" rx="2" fill="#f3e8ff" />
      <circle cx="10" cy="11" r="1" fill="#f472b6" />
      <circle cx="13" cy="11" r="1" fill="#c084fc" />
    </svg>
  );
}
