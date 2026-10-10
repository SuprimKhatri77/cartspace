import Image from "next/image";
import Link from "next/link";
import type { ProductWithPrice } from "@repo/types";
import { Badge } from "@/components/ui/badge";
import { Price } from "./price";

export function ProductCard({
  product,
  eager = false,
}: {
  product: ProductWithPrice;
  /** Above the fold: load now instead of lazily. */
  eager?: boolean;
}) {
  const image = product.images[0];
  const onOffer =
    product.offer_price !== null && product.offer_price < product.selling_price;

  return (
    <Link
      href={`/products/${product.slug}`}
      className="group flex flex-col gap-3 outline-none focus-visible:ring-1 focus-visible:ring-ring"
    >
      <div className="relative aspect-square overflow-hidden border border-border bg-muted">
        {image && (
          <Image
            src={image}
            alt={product.name}
            fill
            loading={eager ? "eager" : "lazy"}
            sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
        )}
        {onOffer && <Badge className="absolute top-2 left-2">Sale</Badge>}
      </div>
      <div className="space-y-1">
        <h3 className="line-clamp-2 text-sm leading-snug group-hover:underline">
          {product.name}
        </h3>
        <Price
          selling={product.selling_price}
          offer={product.offer_price}
          className="text-sm"
        />
      </div>
    </Link>
  );
}
