import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCategories, getProductPage } from "@/modules/catalog/api";
import { Breadcrumbs } from "@/modules/catalog/components/breadcrumbs";
import { ProductGrid } from "@/modules/catalog/components/product-grid";
import { ProductPurchase } from "@/modules/catalog/components/product-purchase";
import { categoryPath } from "@/modules/catalog/lib/category-tree";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const page = await getProductPage(slug);
  if (!page) return { title: "Product not found" };
  return {
    title: page.product_detail.name,
    description: page.product_detail.description ?? undefined,
  };
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const [page, categories] = await Promise.all([
    getProductPage(slug),
    getCategories(),
  ]);
  if (!page) notFound();

  const { product_detail: product, variants, related_products } = page;
  const category = categories.find((c) => c.id === product.category_id);
  const path = category ? categoryPath(categories, category.slug) : [];

  return (
    <div className="space-y-16">
      <div className="space-y-6">
        {path.length > 0 && <Breadcrumbs path={path} />}
        {/* key: a new product starts from its default variant. */}
        <ProductPurchase
          key={product.id}
          product={product}
          variants={variants}
        />
      </div>

      {related_products.length > 0 && (
        <section className="space-y-6">
          <h2 className="text-xs uppercase tracking-widest text-muted-foreground">
            You may also like
          </h2>
          <ProductGrid products={related_products} />
        </section>
      )}
    </div>
  );
}
