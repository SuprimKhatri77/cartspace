import type { ProductWithPrice } from "@repo/types";
import { ProductCard } from "./product-card";

export function ProductGrid({ products }: { products: ProductWithPrice[] }) {
  return (
    <ul className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4">
      {products.map((product, i) => (
        <li key={product.id}>
          {/* The first row is usually the largest paint. */}
          <ProductCard product={product} eager={i < 4} />
        </li>
      ))}
    </ul>
  );
}
