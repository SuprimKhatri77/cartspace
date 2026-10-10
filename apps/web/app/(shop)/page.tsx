import Link from "next/link";
import { notFound } from "next/navigation";
import { getCategories, getProducts } from "@/modules/catalog/api";
import { PaginationNav } from "@/modules/catalog/components/pagination-nav";
import { ProductGrid } from "@/modules/catalog/components/product-grid";
import {
  parsePage,
  type SearchParams,
} from "@/modules/catalog/lib/search-params";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const page = parsePage(await searchParams);
  const [categories, products] = await Promise.all([
    getCategories(),
    getProducts(page),
  ]);
  if (!products) notFound();

  const roots = categories.filter((c) => c.parent_id === null);

  return (
    <div className="space-y-12">
      {page === 1 && (
        <section className="space-y-6">
          <div className="space-y-2">
            <h1 className="text-3xl font-semibold tracking-tight">
              Shop cartspace
            </h1>
            <p className="max-w-xl text-sm text-muted-foreground">
              Everyday clothing, accessories and things for home.
            </p>
          </div>
          {roots.length > 0 && (
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {roots.map((category) => (
                <li key={category.id}>
                  <Link
                    href={`/categories/${category.slug}`}
                    className="flex h-20 items-end border border-border p-4 text-sm font-medium transition-colors hover:bg-muted"
                  >
                    {category.name}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      <section className="space-y-6">
        <h2 className="text-xs uppercase tracking-widest text-muted-foreground">
          Latest products
        </h2>
        {products.data.length > 0 ? (
          <ProductGrid products={products.data} />
        ) : (
          <p className="text-sm text-muted-foreground">
            No products yet. Check back soon.
          </p>
        )}
        <PaginationNav
          meta={products.meta}
          href={(p) => (p === 1 ? "/" : `/?page=${p}`)}
        />
      </section>
    </div>
  );
}
