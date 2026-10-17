"use client";

import { useState } from "react";

/**
 * Rows picked on one page of a table. The selection belongs to `scope` (the
 * page and filters it was made on): when the scope changes, it is empty
 * again, so an action never reaches rows the admin can't see.
 */
export function useSelection<T extends string | number>(scope: string) {
  const [state, setState] = useState<{ scope: string; ids: T[] }>({
    scope,
    ids: [],
  });
  const ids = state.scope === scope ? state.ids : [];

  function update(next: (ids: T[]) => T[]) {
    setState((s) => ({ scope, ids: next(s.scope === scope ? s.ids : []) }));
  }

  return {
    ids,
    count: ids.length,
    has: (id: T) => ids.includes(id),
    toggle: (id: T, on: boolean) =>
      update((cur) =>
        on
          ? cur.includes(id)
            ? cur
            : [...cur, id]
          : cur.filter((x) => x !== id),
      ),
    /** Selects all of `page`, or none of it. */
    setAll: (page: T[], on: boolean) =>
      update((cur) =>
        on
          ? [...cur, ...page.filter((id) => !cur.includes(id))]
          : cur.filter((id) => !page.includes(id)),
      ),
    clear: () => update(() => []),
  };
}

/** The header checkbox's state for a page of rows. */
export function pageState<T>(
  page: T[],
  has: (id: T) => boolean,
): { checked: boolean; indeterminate: boolean } {
  const picked = page.filter(has).length;
  return {
    checked: page.length > 0 && picked === page.length,
    indeterminate: picked > 0 && picked < page.length,
  };
}
