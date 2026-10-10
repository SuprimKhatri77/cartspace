import Link from "next/link";
import { getCategories } from "@/modules/catalog/api";

/** Root categories under the header. The header still renders if the API is down. */
export async function CategoryNav() {
  const categories = await getCategories().catch(() => []);
  const roots = categories.filter((c) => c.parent_id === null);
  if (roots.length === 0) return null;

  return (
    <nav aria-label="Categories" className="border-b border-border">
      <ul className="mx-auto flex w-full max-w-6xl gap-6 overflow-x-auto px-4 py-2 text-xs">
        {roots.map((category) => (
          <li key={category.id} className="shrink-0">
            <Link
              href={`/categories/${category.slug}`}
              className="text-muted-foreground transition-colors hover:text-foreground"
            >
              {category.name}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
