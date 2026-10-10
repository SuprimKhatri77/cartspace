import Link from "next/link";
import { CaretLeftIcon, CaretRightIcon } from "@phosphor-icons/react/ssr";
import type { PaginationMeta } from "@repo/types";
import { buttonVariants } from "@/components/ui/button";

/** Previous / next links; href builds the URL of a page. */
export function PaginationNav({
  meta,
  href,
}: {
  meta: PaginationMeta;
  href: (page: number) => string;
}) {
  if (meta.total_pages <= 1) return null;
  const prev = meta.page > 1 ? meta.page - 1 : null;
  const next = meta.page < meta.total_pages ? meta.page + 1 : null;
  const link = buttonVariants({ variant: "outline" });

  return (
    <nav
      aria-label="Pagination"
      className="flex items-center justify-between gap-4 text-xs"
    >
      {prev ? (
        <Link className={link} href={href(prev)} rel="prev">
          <CaretLeftIcon /> Previous
        </Link>
      ) : (
        <span />
      )}
      <span className="text-muted-foreground">
        Page {meta.page} of {meta.total_pages}
      </span>
      {next ? (
        <Link className={link} href={href(next)} rel="next">
          Next <CaretRightIcon />
        </Link>
      ) : (
        <span />
      )}
    </nav>
  );
}
