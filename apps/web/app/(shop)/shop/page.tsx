import type { Metadata } from "next";
import { ListingPage } from "@/modules/catalog/components/listing-page";
import { CollectionHeader } from "@/modules/catalog/components/collection-header";
import { getCollections } from "@/modules/catalog/api";
import type { SearchParams } from "@/modules/catalog/lib/filters";

export const metadata: Metadata = {
  title: "Shop all",
  description: "Every piece in the cartspace collection.",
};

export default async function ShopPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const [query, collections] = await Promise.all([
    searchParams,
    getCollections(),
  ]);
  const featured = query.featured === "true";

  return (
    <div className="container-page">
      <CollectionHeader
        eyebrow={featured ? "Curated" : "The collection"}
        title={featured ? "Editor's picks." : "Shop all."}
        description={
          featured
            ? "The pieces we reach for most, chosen by the people who choose everything."
            : "Clothing, accessories and homewares in natural materials. Filter by size, colour and price."
        }
        links={collections.map((c) => ({
          label: c.name,
          href: `/categories/${c.slug}`,
        }))}
      />
      <ListingPage category={null} searchParams={query} />
    </div>
  );
}
