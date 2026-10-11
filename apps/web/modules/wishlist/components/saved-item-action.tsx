"use client";

import Link from "next/link";
import { HandbagIcon } from "@phosphor-icons/react";
import { toast } from "sonner";
import type { WishlistProduct } from "@repo/types";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  cartErrorMessage,
  useCartMutations,
} from "@/modules/cart/hooks/use-cart-mutations";
import { useBagDrawer } from "@/modules/cart/store";

/**
 * What a saved product offers: one tap into the bag when there is only
 * one way to buy it, otherwise a link to choose the size or colour (a
 * wishlist saves the product, not a variant), or "Sold out".
 */
export function SavedItemAction({
  product,
  onNavigate,
  className,
}: {
  product: WishlistProduct;
  /** Called before leaving for the product page or the bag (a drawer closes). */
  onNavigate?: () => void;
  className?: string;
}) {
  const { add } = useCartMutations();
  const openBag = useBagDrawer((s) => s.setOpen);

  if (!product.in_stock) {
    return (
      <Button variant="outline" size="sm" disabled className={className}>
        Sold out
      </Button>
    );
  }

  if (product.variant_count > 1) {
    return (
      <Link
        href={`/products/${product.slug}`}
        onClick={onNavigate}
        className={cn(
          buttonVariants({ variant: "outline", size: "sm" }),
          className,
        )}
      >
        Choose options
      </Link>
    );
  }

  return (
    <Button
      variant="outline"
      size="sm"
      disabled={add.isPending}
      className={className}
      onClick={() =>
        add.mutate(
          { variant_id: product.variant_id, quantity: 1 },
          {
            onSuccess: () => {
              onNavigate?.();
              openBag(true);
            },
            onError: (error) => toast.error(cartErrorMessage(error)),
          },
        )
      }
    >
      <HandbagIcon />
      {add.isPending ? "Adding…" : "Add to bag"}
    </Button>
  );
}
