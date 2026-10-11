import { cn } from "@/lib/utils";

/**
 * The cartspace mark: an open frame (a space) with its corner object
 * stepping out. Drawn in currentColor, so it takes each theme's ink.
 * Decorative: it always sits beside the wordmark. The favicon is
 * app/icon.svg, a pixel-snapped copy on an ink tile.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="10 8 46 46"
      fill="none"
      aria-hidden
      focusable="false"
      className={cn("shrink-0", className)}
    >
      <path d="M39 13H13V51H51V25" stroke="currentColor" strokeWidth="6" />
      <rect x="44" y="8" width="12" height="12" rx="1" fill="currentColor" />
    </svg>
  );
}
