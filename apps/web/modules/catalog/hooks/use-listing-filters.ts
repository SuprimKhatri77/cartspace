"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";
import {
  filtersToSearch,
  parseFilters,
  type ListingFilters,
} from "../lib/filters";

/**
 * The listing filters as URL state. Updates go through the History API,
 * which Next keeps in sync with useSearchParams without a server round
 * trip: the grid refetches through TanStack Query (or reads its cache),
 * and back/forward restores earlier filters instantly.
 */
export function useListingFilters() {
  const pathname = usePathname();
  const params = useSearchParams();
  const filters = useMemo(() => parseFilters(params), [params]);

  const setFilters = useCallback(
    (next: ListingFilters) => {
      const query = new URLSearchParams(filtersToSearch(next));
      // Keep a search term (q) that isn't one of the filters.
      const q = params.get("q");
      if (q) query.set("q", q);
      const search = query.toString();
      window.history.pushState(
        null,
        "",
        search ? `${pathname}?${search}` : pathname,
      );
    },
    [params, pathname],
  );

  return { filters, setFilters };
}
