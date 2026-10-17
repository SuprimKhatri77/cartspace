"use client";

import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { getApiError } from "@/lib/api/errors";

/** The API's cap on one CSV export. */
export const MAX_EXPORT_ROWS = 10_000;

/** Saves text as `name` through a temporary download link. */
export function downloadCsv(csv: string, name: string) {
  const url = URL.createObjectURL(
    new Blob([csv], { type: "text/csv;charset=utf-8" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  URL.revokeObjectURL(url);
}

/**
 * A table's "Export CSV": the file comes through the API client (which
 * refreshes an expired session), then downloads from memory as
 * "<what>-<today>.csv". Past the cap, a toast says only the first rows came.
 */
export function useCsvExport({
  what,
  fetchCsv,
  total,
  narrowHint,
}: {
  what: string;
  fetchCsv: () => Promise<string>;
  total: number | undefined;
  narrowHint: string;
}) {
  return useMutation({
    mutationFn: fetchCsv,
    onSuccess: (csv) => {
      downloadCsv(csv, `${what}-${new Date().toISOString().slice(0, 10)}.csv`);
      if (total !== undefined && total > MAX_EXPORT_ROWS) {
        toast(
          `Exported the first ${MAX_EXPORT_ROWS.toLocaleString()} ${what}`,
          {
            description: narrowHint,
          },
        );
      }
    },
    onError: (error) => {
      toast.error(
        getApiError(error)?.message ?? `Couldn't export the ${what}.`,
      );
    },
  });
}
