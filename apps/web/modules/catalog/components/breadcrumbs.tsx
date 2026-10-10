import Link from "next/link";
import type { Category } from "@repo/types";

/** Home / root / … / category. With currentId, that crumb isn't a link. */
export function Breadcrumbs({
  path,
  currentId,
}: {
  path: Pick<Category, "id" | "name" | "slug">[];
  currentId?: string;
}) {
  return (
    <nav aria-label="Breadcrumb" className="text-xs text-muted-foreground">
      <ol className="flex flex-wrap gap-1">
        <li>
          <Link href="/" className="hover:text-foreground">
            Home
          </Link>
        </li>
        {path.map((c) => (
          <li key={c.id} className="before:mr-1 before:content-['/']">
            {c.id === currentId ? (
              <span aria-current="page" className="text-foreground">
                {c.name}
              </span>
            ) : (
              <Link
                href={`/categories/${c.slug}`}
                className="hover:text-foreground"
              >
                {c.name}
              </Link>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
