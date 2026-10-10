"use client";

import { useState } from "react";
import Image from "next/image";
import type { ProductDetail, StorefrontVariant } from "@repo/types";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  isAvailable,
  optionGroups,
  pickOption,
  selectionOf,
} from "../lib/variants";
import { Price } from "./price";

/**
 * Gallery, price, stock and the variant picker. Picking an option jumps to
 * the closest existing variant; values with no variant alongside the other
 * current choices are shown struck through.
 */
export function ProductPurchase({
  product,
  variants,
}: {
  product: ProductDetail;
  variants: StorefrontVariant[];
}) {
  const [variantId, setVariantId] = useState(
    variants[0]?.id ?? product.variant_id,
  );
  const variant = variants.find((v) => v.id === variantId);

  const images = [
    ...new Set([
      ...(variant?.images ?? product.variant_images),
      ...product.images,
    ]),
  ];
  const [imageIndex, setImageIndex] = useState(0);
  const image = images[Math.min(imageIndex, images.length - 1)];

  const selling = variant?.selling_price ?? product.selling_price;
  const offer = variant ? variant.offer_price : product.offer_price;
  const stock = variant?.stock ?? product.stock;
  const groups = optionGroups(variants);
  const selection = variant ? selectionOf(variant) : {};

  function choose(name: string, value: string) {
    const next = pickOption(variants, selection, name, value);
    if (next) {
      setVariantId(next.id);
      setImageIndex(0);
    }
  }

  return (
    <div className="grid gap-8 md:grid-cols-2">
      <div className="space-y-3">
        <div className="relative aspect-square overflow-hidden border border-border bg-muted">
          {image && (
            <Image
              src={image}
              alt={product.name}
              fill
              preload
              sizes="(min-width: 768px) 50vw, 100vw"
              className="object-cover"
            />
          )}
        </div>
        {images.length > 1 && (
          <ul className="flex gap-2">
            {images.map((src, i) => (
              <li key={src}>
                <button
                  type="button"
                  onClick={() => setImageIndex(i)}
                  aria-label={`Show image ${i + 1}`}
                  aria-current={i === imageIndex}
                  className={cn(
                    "relative block size-16 overflow-hidden border",
                    i === imageIndex ? "border-foreground" : "border-border",
                  )}
                >
                  <Image
                    src={src}
                    alt=""
                    fill
                    sizes="64px"
                    className="object-cover"
                  />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="space-y-6">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">
            {product.name}
          </h1>
          <Price selling={selling} offer={offer} className="text-lg" />
        </div>

        {groups.map((group) => (
          <fieldset key={group.name} className="space-y-2">
            <legend className="text-xs uppercase tracking-widest text-muted-foreground">
              {group.name}
            </legend>
            <div className="flex flex-wrap gap-2">
              {group.values.map((value) => {
                const selected = selection[group.name] === value;
                const available = isAvailable(
                  variants,
                  selection,
                  group.name,
                  value,
                );
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => choose(group.name, value)}
                    aria-pressed={selected}
                    className={cn(
                      "h-8 min-w-10 border px-3 text-xs transition-colors",
                      selected
                        ? "border-foreground bg-foreground text-background"
                        : "border-border hover:border-foreground",
                      !available &&
                        !selected &&
                        "text-muted-foreground line-through",
                    )}
                  >
                    {value}
                  </button>
                );
              })}
            </div>
          </fieldset>
        ))}

        <div>
          {stock > 0 ? (
            <Badge variant="secondary">
              {stock <= 5 ? `Only ${stock} left` : "In stock"}
            </Badge>
          ) : (
            <Badge variant="destructive">Out of stock</Badge>
          )}
        </div>

        {product.description && (
          <p className="text-sm leading-relaxed text-muted-foreground">
            {product.description}
          </p>
        )}

        {product.features.length > 0 && (
          <ul className="list-disc space-y-1 pl-5 text-sm">
            {product.features.map((feature) => (
              <li key={feature}>{feature}</li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
