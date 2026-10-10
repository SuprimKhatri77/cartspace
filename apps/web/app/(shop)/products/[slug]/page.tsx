import type { Metadata } from "next";
import { ReviewsSection } from "@/modules/reviews/components/reviews-section";
import { notFound } from "next/navigation";
import { CURRENCY } from "@/lib/money";
import { getCategories, getProductPage } from "@/modules/catalog/api";
import { Breadcrumbs } from "@/modules/catalog/components/breadcrumbs";
import { ProductRail } from "@/modules/catalog/components/product-rail";
import { ProductView } from "@/modules/catalog/components/product-view";
import { categoryPath } from "@/modules/catalog/lib/category-tree";
import { SectionHeading } from "@/modules/home/components/section-heading";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ variant?: string | string[] }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const page = await getProductPage(slug);
  if (!page) return { title: "Product not found" };
  const { product_detail: product } = page;
  return {
    title: product.name,
    description: product.description ?? undefined,
    openGraph: {
      title: product.name,
      description: product.description ?? undefined,
      images: product.images.slice(0, 1),
    },
  };
}

export default async function ProductPage({ params, searchParams }: Props) {
  const [{ slug }, { variant: variantParam }] = await Promise.all([
    params,
    searchParams,
  ]);
  const [page, categories] = await Promise.all([
    getProductPage(slug),
    getCategories(),
  ]);
  if (!page) notFound();

  const { product_detail: product, variants, related_products } = page;
  const category = categories.find((c) => c.id === product.category_id);
  const path = category ? categoryPath(categories, category.slug) : [];

  // ?variant= opens that variant when it is one of this product's.
  const requested = Array.isArray(variantParam)
    ? variantParam[0]
    : variantParam;
  const initialVariantId =
    variants.find((v) => v.id === requested)?.id ??
    variants[0]?.id ??
    product.variant_id;

  const inStock = variants.some((v) => v.stock > 0);
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description ?? undefined,
    image: product.images,
    offers: {
      "@type": "Offer",
      price: (product.price / 100).toFixed(2),
      priceCurrency: CURRENCY,
      availability: inStock
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
    },
    ...(product.rating_count > 0 && {
      aggregateRating: {
        "@type": "AggregateRating",
        ratingValue: product.rating_avg,
        reviewCount: product.rating_count,
      },
    }),
  };

  return (
    <div className="space-y-28 pt-4 sm:pt-8">
      <script
        type="application/ld+json"
        // JSON.stringify output with "<" escaped can't close the script tag.
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
        }}
      />
      <div className="container-page">
        <ProductView
          // A new product starts from its own default variant.
          key={product.id}
          product={product}
          variants={variants}
          initialVariantId={initialVariantId}
          categoryName={category?.name}
          breadcrumbs={
            path.length > 0 ? <Breadcrumbs path={path} /> : undefined
          }
        />
      </div>

      <div className="container-page">
        <ReviewsSection slug={product.slug} productName={product.name} />
      </div>

      {related_products.length > 0 && (
        <section className="container-page">
          <SectionHeading
            eyebrow="More to discover"
            title="You may also like."
          />
          <ProductRail products={related_products} label="Related products" />
        </section>
      )}
    </div>
  );
}
