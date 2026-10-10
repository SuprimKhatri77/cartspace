import type { SortOption } from "@repo/types";
import { toCents } from "@/lib/money";

export type SearchParams = Record<string, string | string[] | undefined>;

export const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "newest", label: "Newest" },
  { value: "price_asc", label: "Price: low to high" },
  { value: "price_desc", label: "Price: high to low" },
];

// The API's bounds (httpx.MaxPage, 100000000 cents).
const MAX_PAGE = 100_000;
const MAX_CENTS = 100_000_000;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export function parsePage(params: SearchParams): number {
  const page = Number(first(params.page));
  return Number.isInteger(page) && page >= 1 && page <= MAX_PAGE ? page : 1;
}

export type ListingFilters = {
  page: number;
  sort: SortOption;
  /** Cents; 0 means no bound (as the API reads it). */
  priceMin: number;
  priceMax: number;
};

/**
 * Reads a category listing's filters from the URL. Prices are in currency
 * units there (?min=20&max=80). Values the API would reject fall back to
 * their defaults, and a reversed range is swapped, so a hand-edited URL
 * still shows products.
 */
export function parseListingFilters(params: SearchParams): ListingFilters {
  const sortParam = first(params.sort);
  const sort =
    SORT_OPTIONS.find((o) => o.value === sortParam)?.value ?? "newest";

  const cents = (raw: string | undefined) => {
    const value = raw === undefined ? null : toCents(raw);
    return value !== null && value <= MAX_CENTS ? value : 0;
  };
  let priceMin = cents(first(params.min));
  let priceMax = cents(first(params.max));
  if (priceMax > 0 && priceMin > priceMax) {
    [priceMin, priceMax] = [priceMax, priceMin];
  }

  return { page: parsePage(params), sort, priceMin, priceMax };
}

/** A URL for path with params changed; undefined, "" and defaults are dropped. */
export function withParams(
  path: string,
  current: Record<string, string | undefined>,
  changes: Record<string, string | number | undefined>,
): string {
  const query = new URLSearchParams();
  const merged = { ...current, ...changes };
  for (const [key, value] of Object.entries(merged)) {
    if (value === undefined || value === "") continue;
    if (key === "page" && String(value) === "1") continue;
    if (key === "sort" && value === "newest") continue;
    query.set(key, String(value));
  }
  const qs = query.toString();
  return qs ? `${path}?${qs}` : path;
}
