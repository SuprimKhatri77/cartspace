import type { SortOption } from "@repo/types";
import { fromCents, toCents } from "@/lib/money";

// Storefront listing filters live in the URL so they are shareable:
//   /categories/shoes?sort=price_asc&min=20&max=80&size=42&color=Purple
// Prices are in currency units there and cents everywhere else. Every query
// parameter that isn't reserved is an option filter (name=value, repeatable).
// The server page and the client grid parse the same URL into the same
// filters, so they build the same query key.

export type SearchParams = Record<string, string | string[] | undefined>;

export const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "newest", label: "Newest" },
  { value: "price_asc", label: "Price: low to high" },
  { value: "price_desc", label: "Price: high to low" },
];

export type ListingFilters = {
  sort: SortOption;
  /** Cents; 0 means no bound (as the API reads it). */
  priceMin: number;
  priceMax: number;
  featured: boolean;
  /** "name:value" pairs, deduplicated and sorted for a stable query key. */
  options: string[];
};

export const DEFAULT_FILTERS: ListingFilters = {
  sort: "newest",
  priceMin: 0,
  priceMax: 0,
  featured: false,
  options: [],
};

// The API's bounds (listing.go): price in cents, option count and length.
const MAX_CENTS = 100_000_000;
const MAX_OPTIONS = 20;
const MAX_OPTION_PART = 20;

const RESERVED = new Set([
  "sort",
  "min",
  "max",
  "featured",
  "page",
  "q",
  "variant",
]);

function pairs(source: SearchParams | URLSearchParams): [string, string][] {
  if (source instanceof URLSearchParams) return [...source.entries()];
  return Object.entries(source).flatMap(([key, value]) =>
    value === undefined
      ? []
      : (Array.isArray(value) ? value : [value]).map(
          (v) => [key, v] as [string, string],
        ),
  );
}

/**
 * Reads the filters from a URL. Values the API would reject fall back to
 * their defaults and a reversed price range is swapped, so a hand-edited
 * URL still shows products.
 */
export function parseFilters(
  source: SearchParams | URLSearchParams,
): ListingFilters {
  const all = pairs(source);
  const get = (key: string) => all.find(([k]) => k === key)?.[1];

  const sortParam = get("sort");
  const sort =
    SORT_OPTIONS.find((o) => o.value === sortParam)?.value ?? "newest";

  const cents = (raw: string | undefined) => {
    const value = raw === undefined ? null : toCents(raw);
    return value !== null && value <= MAX_CENTS ? value : 0;
  };
  let priceMin = cents(get("min"));
  let priceMax = cents(get("max"));
  if (priceMax > 0 && priceMin > priceMax) {
    [priceMin, priceMax] = [priceMax, priceMin];
  }

  const options = new Set<string>();
  for (const [key, raw] of all) {
    const name = key.trim();
    const value = raw.trim();
    if (
      RESERVED.has(name) ||
      !name ||
      !value ||
      name.length > MAX_OPTION_PART ||
      value.length > MAX_OPTION_PART ||
      name.includes(":")
    ) {
      continue;
    }
    options.add(`${name}:${value}`);
  }

  return {
    sort,
    priceMin,
    priceMax,
    featured: get("featured") === "true",
    options: [...options].sort().slice(0, MAX_OPTIONS),
  };
}

/** The URL query string for filters (no "?"); defaults are left out. */
export function filtersToSearch(filters: ListingFilters): string {
  const query = new URLSearchParams();
  if (filters.sort !== "newest") query.set("sort", filters.sort);
  if (filters.priceMin > 0) query.set("min", fromCents(filters.priceMin));
  if (filters.priceMax > 0) query.set("max", fromCents(filters.priceMax));
  if (filters.featured) query.set("featured", "true");
  for (const option of filters.options) {
    const at = option.indexOf(":");
    query.append(option.slice(0, at), option.slice(at + 1));
  }
  return query.toString();
}

/** The API query for a listing page; defaults are left out. */
export function listingQuery(filters: ListingFilters, page: number) {
  return {
    page,
    ...(filters.sort !== "newest" && { sort: filters.sort }),
    ...(filters.featured && { featured: true }),
    ...(filters.priceMin > 0 && { price_min: filters.priceMin }),
    ...(filters.priceMax > 0 && { price_max: filters.priceMax }),
    ...(filters.options.length > 0 && { option: filters.options }),
  };
}

export function hasOption(
  filters: ListingFilters,
  name: string,
  value: string,
): boolean {
  return filters.options.includes(`${name}:${value}`);
}

export function toggleOption(
  filters: ListingFilters,
  name: string,
  value: string,
): ListingFilters {
  const option = `${name}:${value}`;
  const options = filters.options.includes(option)
    ? filters.options.filter((o) => o !== option)
    : [...filters.options, option].sort();
  return { ...filters, options };
}

/** Filters that narrow the results (sorting doesn't count). */
export function activeFilterCount(filters: ListingFilters): number {
  return (
    filters.options.length +
    (filters.priceMin > 0 || filters.priceMax > 0 ? 1 : 0) +
    (filters.featured ? 1 : 0)
  );
}

export function clearFilters(filters: ListingFilters): ListingFilters {
  return { ...DEFAULT_FILTERS, sort: filters.sort };
}
