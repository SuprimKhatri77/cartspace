"use client";

import type { SortOption } from "@repo/types";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SORT_OPTIONS } from "../lib/filters";

export function SortMenu({
  value,
  onChange,
}: {
  value: SortOption;
  onChange: (sort: SortOption) => void;
}) {
  return (
    <Select
      value={value}
      onValueChange={(next) => next && onChange(next as SortOption)}
      items={SORT_OPTIONS}
    >
      <SelectTrigger
        aria-label="Sort products"
        className="h-9 border-none px-0 text-[0.8125rem] hover:bg-transparent dark:bg-transparent"
      >
        <span className="text-muted-foreground">Sort:</span>
        <SelectValue />
      </SelectTrigger>
      <SelectContent
        align="end"
        alignItemWithTrigger={false}
        className="min-w-48"
      >
        {SORT_OPTIONS.map((option) => (
          <SelectItem
            key={option.value}
            value={option.value}
            className="py-2.5 text-[0.8125rem]"
          >
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
