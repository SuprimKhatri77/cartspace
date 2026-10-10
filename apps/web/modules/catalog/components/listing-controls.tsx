"use client";

import { useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { PriceRange, SortOption } from "@repo/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatPrice, fromCents, toCents } from "@/lib/money";
import { SORT_OPTIONS, withParams } from "../lib/search-params";

/**
 * Sort and price filter for a category listing. Both live in the URL, so
 * the server renders the result and the page can be shared; changing either
 * goes back to page 1.
 */
export function ListingControls({
  sort,
  priceMin,
  priceMax,
  priceRange,
}: {
  sort: SortOption;
  priceMin: number;
  priceMax: number;
  priceRange: PriceRange;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [min, setMin] = useState(priceMin ? fromCents(priceMin) : "");
  const [max, setMax] = useState(priceMax ? fromCents(priceMax) : "");
  const [error, setError] = useState<string | null>(null);

  function navigate(changes: Record<string, string | undefined>) {
    const current = Object.fromEntries(searchParams.entries());
    startTransition(() => {
      router.push(
        withParams(pathname, current, { ...changes, page: undefined }),
        {
          scroll: false,
        },
      );
    });
  }

  function applyPrice(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const minCents = min.trim() ? toCents(min) : 0;
    const maxCents = max.trim() ? toCents(max) : 0;
    if (minCents === null || maxCents === null) {
      setError("Enter amounts like 20 or 19.99");
      return;
    }
    setError(null);
    navigate({
      min: minCents ? fromCents(minCents) : undefined,
      max: maxCents ? fromCents(maxCents) : undefined,
    });
  }

  function clearPrice() {
    setMin("");
    setMax("");
    setError(null);
    navigate({ min: undefined, max: undefined });
  }

  const hasRange = priceRange.max_price > 0;

  return (
    <div
      className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"
      aria-busy={isPending}
    >
      <form
        onSubmit={applyPrice}
        className="flex flex-wrap items-end gap-2"
        noValidate
      >
        <label className="flex flex-col gap-1 text-xs">
          <span className="text-muted-foreground">Min price</span>
          <Input
            inputMode="decimal"
            className="w-24"
            placeholder={hasRange ? fromCents(priceRange.min_price) : "0"}
            value={min}
            onChange={(e) => setMin(e.target.value)}
            aria-invalid={Boolean(error)}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs">
          <span className="text-muted-foreground">Max price</span>
          <Input
            inputMode="decimal"
            className="w-24"
            placeholder={hasRange ? fromCents(priceRange.max_price) : "Any"}
            value={max}
            onChange={(e) => setMax(e.target.value)}
            aria-invalid={Boolean(error)}
          />
        </label>
        <Button type="submit" variant="outline" disabled={isPending}>
          Apply
        </Button>
        {(priceMin > 0 || priceMax > 0) && (
          <Button
            type="button"
            variant="ghost"
            onClick={clearPrice}
            disabled={isPending}
          >
            Clear
          </Button>
        )}
        <p className="basis-full text-xs text-muted-foreground" role="status">
          {error ??
            (hasRange
              ? `Prices here: ${formatPrice(priceRange.min_price)} to ${formatPrice(priceRange.max_price)}`
              : "")}
        </p>
      </form>

      <label className="flex flex-col gap-1 text-xs">
        <span className="text-muted-foreground">Sort by</span>
        <Select
          items={SORT_OPTIONS}
          value={sort}
          onValueChange={(value) =>
            navigate({ sort: (value as SortOption | null) ?? undefined })
          }
        >
          <SelectTrigger className="w-44" aria-label="Sort by">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </label>
    </div>
  );
}
