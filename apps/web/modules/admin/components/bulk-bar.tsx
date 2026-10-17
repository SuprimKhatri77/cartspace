import { XIcon } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

/**
 * The bar of actions for the rows picked in a table, held at the bottom of
 * the screen while there are any.
 */
export function BulkBar({
  count,
  noun,
  onClear,
  children,
}: {
  count: number;
  noun: [one: string, many: string];
  onClear: () => void;
  children: React.ReactNode;
}) {
  if (count === 0) return null;
  return (
    <div
      role="region"
      aria-label="Selected rows"
      className="animate-rise sticky bottom-4 z-20 flex flex-wrap items-center gap-2 rounded-panel bg-foreground px-4 py-3 text-background shadow-2xl sm:gap-3"
    >
      <p className="mr-auto text-[0.8125rem]" aria-live="polite">
        <span className="tabular-nums">{count}</span>{" "}
        {count === 1 ? noun[0] : noun[1]} selected
      </p>
      {children}
      <button
        type="button"
        onClick={onClear}
        className="inline-flex h-8 items-center gap-1 px-2 text-xs text-background/70 transition-colors hover:text-background"
      >
        <XIcon className="size-3.5" />
        Clear
      </button>
    </div>
  );
}

/** A button styled for the bulk bar. */
export function BulkButton({
  destructive,
  className,
  ...props
}: React.ComponentProps<"button"> & { destructive?: boolean }) {
  return (
    <button
      type="button"
      className={cn(
        "inline-flex h-8 items-center gap-1.5 rounded-control border px-3 text-xs transition-colors disabled:opacity-50 [&_svg]:size-3.5",
        destructive
          ? "border-destructive/60 text-[oklch(0.8_0.12_25)] hover:bg-destructive hover:text-white"
          : "border-background/25 hover:bg-background hover:text-foreground",
        className,
      )}
      {...props}
    />
  );
}
