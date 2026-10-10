import { Reveal } from "@/components/motion/reveal";
import { getCollections, getListing } from "@/modules/catalog/api";
import { ProductGrid } from "@/modules/catalog/components/product-grid";
import { ProductRail } from "@/modules/catalog/components/product-rail";
import { DEFAULT_FILTERS } from "@/modules/catalog/lib/filters";
import { ClosingCta } from "@/modules/home/components/closing-cta";
import { CollectionTiles } from "@/modules/home/components/collection-tiles";
import { Hero } from "@/modules/home/components/hero";
import { SectionHeading } from "@/modules/home/components/section-heading";
import { StoryBand } from "@/modules/home/components/story-band";
import { ValueProps } from "@/modules/home/components/value-props";

export default async function LandingPage() {
  const [collections, featured, newest] = await Promise.all([
    getCollections(),
    getListing(null, { ...DEFAULT_FILTERS, featured: true }),
    getListing(null, DEFAULT_FILTERS),
  ]);
  const picks = featured?.data.products ?? [];
  const arrivals = newest?.data.products.slice(0, 8) ?? [];

  return (
    <div className="space-y-28 sm:space-y-36">
      <Hero />

      {collections.length > 0 && (
        <section className="container-page">
          <SectionHeading
            eyebrow="Collections"
            title="Shop by room and ritual."
          />
          <CollectionTiles collections={collections} />
        </section>
      )}

      {picks.length > 0 && (
        <section className="container-page">
          <SectionHeading
            eyebrow="Editor's picks"
            title="Chosen with care."
            href="/shop?featured=true"
          />
          <ProductRail products={picks} label="Editor's picks" />
        </section>
      )}

      <StoryBand />

      {arrivals.length > 0 && (
        <section className="container-page">
          <SectionHeading
            eyebrow="Just in"
            title="New arrivals."
            href="/shop"
          />
          <Reveal>
            <ProductGrid products={arrivals} eagerCount={0} />
          </Reveal>
        </section>
      )}

      <ValueProps />
      <ClosingCta />
    </div>
  );
}
