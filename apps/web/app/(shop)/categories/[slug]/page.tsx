import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCategories } from "@/modules/catalog/api";
import { Breadcrumbs } from "@/modules/catalog/components/breadcrumbs";
import { CollectionHeader } from "@/modules/catalog/components/collection-header";
import { ListingPage } from "@/modules/catalog/components/listing-page";
import {
  categoryPath,
  childCategories,
} from "@/modules/catalog/lib/category-tree";
import type { SearchParams } from "@/modules/catalog/lib/filters";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<SearchParams>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const category = (await getCategories()).find((c) => c.slug === slug);
  return { title: category?.name ?? "Collection" };
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const [{ slug }, query, categories] = await Promise.all([
    params,
    searchParams,
    getCategories(),
  ]);
  const path = categoryPath(categories, slug);
  const category = path.at(-1);
  if (!category) notFound();

  // Subcategories as chips; on a leaf, its siblings (with itself active).
  const parent = path.at(-2);
  const children = childCategories(categories, slug);
  const chips =
    children.length > 0
      ? [
          { label: "All", href: `/categories/${slug}`, active: true },
          ...children.map((c) => ({
            label: c.name,
            href: `/categories/${c.slug}`,
          })),
        ]
      : parent
        ? [
            { label: "All", href: `/categories/${parent.slug}` },
            ...childCategories(categories, parent.slug).map((c) => ({
              label: c.name,
              href: `/categories/${c.slug}`,
              active: c.slug === slug,
            })),
          ]
        : [];

  return (
    <div className="container-page">
      <CollectionHeader
        eyebrow={parent ? parent.name : "Collection"}
        title={`${category.name}.`}
        breadcrumbs={<Breadcrumbs path={path} currentId={category.id} />}
        links={chips}
      />
      <ListingPage category={slug} searchParams={query} />
    </div>
  );
}
