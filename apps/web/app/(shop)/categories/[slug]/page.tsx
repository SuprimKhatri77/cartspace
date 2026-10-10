import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getCategories, getCategoryListing } from "@/modules/catalog/api";
import { Breadcrumbs } from "@/modules/catalog/components/breadcrumbs";
import { ListingControls } from "@/modules/catalog/components/listing-controls";
import { PaginationNav } from "@/modules/catalog/components/pagination-nav";
import { ProductGrid } from "@/modules/catalog/components/product-grid";
import {
  categoryPath,
  childCategories,
} from "@/modules/catalog/lib/category-tree";
import {
  parseListingFilters,
  withParams,
  type SearchParams,
} from "@/modules/catalog/lib/search-params";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<SearchParams>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const category = (await getCategories()).find((c) => c.slug === slug);
  return { title: category?.name ?? "Category" };
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const query = await searchParams;
  const filters = parseListingFilters(query);

  const [categories, listing] = await Promise.all([
    getCategories(),
    getCategoryListing(slug, filters),
  ]);
  const path = categoryPath(categories, slug);
  const category = path.at(-1);
  if (!listing || !category) notFound();

  const children = childCategories(categories, slug);
  const { products, price_range } = listing.data;
  const current = Object.fromEntries(
    Object.entries(query).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v]),
  );
  const filtered = filters.priceMin > 0 || filters.priceMax > 0;

  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <Breadcrumbs path={path} currentId={category.id} />
        <h1 className="text-2xl font-semibold tracking-tight">
          {category.name}
        </h1>
        {children.length > 0 && (
          <ul className="flex flex-wrap gap-2">
            {children.map((child) => (
              <li key={child.id}>
                <Link
                  href={`/categories/${child.slug}`}
                  className="inline-flex h-7 items-center border border-border px-3 text-xs transition-colors hover:bg-muted"
                >
                  {child.name}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      <ListingControls
        // Remount when the URL changes, so the inputs show what's applied.
        key={`${filters.priceMin}-${filters.priceMax}`}
        sort={filters.sort}
        priceMin={filters.priceMin}
        priceMax={filters.priceMax}
        priceRange={price_range}
      />

      <p className="text-xs text-muted-foreground" aria-live="polite">
        {listing.meta.total} {listing.meta.total === 1 ? "product" : "products"}
      </p>

      {products.length > 0 ? (
        <ProductGrid products={products} />
      ) : (
        <div className="border border-dashed border-border px-6 py-16 text-center text-sm text-muted-foreground">
          {filtered
            ? "No products in this price range."
            : "No products in this category yet."}
        </div>
      )}

      <PaginationNav
        meta={listing.meta}
        href={(page) => withParams(`/categories/${slug}`, current, { page })}
      />
    </div>
  );
}
