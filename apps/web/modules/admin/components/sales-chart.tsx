"use client";

import { useState } from "react";
import type { AdminStats } from "@repo/types";
import { formatPrice, formatPriceShort } from "@/lib/money";
import { cn } from "@/lib/utils";

type Day = AdminStats["sales_by_day"][number];

const dayFormat = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  timeZone: "UTC",
});

/** "12 Oct", for a UTC calendar day ("2026-10-12"). */
export function formatDay(day: string): string {
  return dayFormat.format(new Date(`${day}T00:00:00Z`));
}

const HEIGHT = 160;
const GAP = 3;

/**
 * Revenue per day as bars, in plain SVG (no chart library for one chart).
 * Hovering a bar shows its day; the summary above shows the whole period
 * otherwise (and is what screen readers get, with the image label).
 */
export function SalesChart({ days }: { days: Day[] }) {
  const [active, setActive] = useState<number | null>(null);
  const max = Math.max(...days.map((d) => d.revenue), 1);
  const total = days.reduce((sum, d) => sum + d.revenue, 0);
  const orders = days.reduce((sum, d) => sum + d.orders, 0);
  const shown = active === null ? null : days[active];
  const width = 100 / Math.max(days.length, 1);
  const first = days[0];
  const last = days[days.length - 1];

  return (
    <div>
      <div className="mb-6 flex items-end justify-between gap-4">
        <div aria-live="polite">
          <p className="eyebrow mb-2">
            {shown ? formatDay(shown.day) : "Last 30 days"}
          </p>
          <p className="font-serif text-4xl tabular-nums">
            {formatPrice(shown ? shown.revenue : total)}
          </p>
        </div>
        <p className="text-right text-xs text-muted-foreground tabular-nums">
          {shown ? shown.orders : orders}{" "}
          {(shown ? shown.orders : orders) === 1 ? "order" : "orders"}
        </p>
      </div>

      <div
        className="relative"
        style={{ height: HEIGHT }}
        onMouseLeave={() => setActive(null)}
      >
        {/* Gridlines at the top and half of the scale. */}
        <div className="pointer-events-none absolute inset-0 flex flex-col justify-between">
          {[max, max / 2, 0].map((v) => (
            <div key={v} className="flex items-center gap-2">
              <div className="h-px flex-1 border-t border-dashed border-border" />
              <span className="w-12 text-right font-mono text-[0.625rem] text-muted-foreground tabular-nums">
                {formatPriceShort(Math.round(v / 100) * 100)}
              </span>
            </div>
          ))}
        </div>
        <svg
          className="absolute inset-y-0 left-0 h-full w-[calc(100%-3.5rem)] overflow-visible"
          viewBox={`0 0 100 ${HEIGHT}`}
          preserveAspectRatio="none"
          role="img"
          aria-label={`Revenue per day over the last ${days.length} days: ${formatPrice(total)} in total`}
        >
          {days.map((d, i) => {
            const h =
              d.revenue > 0 ? Math.max((d.revenue / max) * HEIGHT, 2) : 0;
            return (
              <g key={d.day}>
                {/* The full column is the hover target, not just the bar. */}
                <rect
                  x={i * width}
                  y={0}
                  width={width}
                  height={HEIGHT}
                  fill="transparent"
                  onMouseEnter={() => setActive(i)}
                />
                <rect
                  x={i * width + GAP / 10}
                  y={HEIGHT - h}
                  width={Math.max(width - (GAP / 10) * 2, 0.5)}
                  height={h}
                  className={cn(
                    "pointer-events-none transition-[fill] duration-200",
                    active === i
                      ? "fill-clay"
                      : active === null
                        ? "fill-foreground/80"
                        : "fill-foreground/25",
                  )}
                />
              </g>
            );
          })}
        </svg>
      </div>
      <div className="mt-3 flex justify-between pr-14 font-mono text-[0.625rem] tracking-[0.1em] text-muted-foreground uppercase">
        <span>{first && formatDay(first.day)}</span>
        <span>{last && formatDay(last.day)}</span>
      </div>
    </div>
  );
}
