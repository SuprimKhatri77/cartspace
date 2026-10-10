import type { Cart, CartLine } from "@repo/types";

// Client copies of the API's cart arithmetic (handlers/cart buildCart), for
// optimistic updates. The server's answer replaces them once it arrives.

/** Whether a line can be checked out as it stands. */
export function lineIsReady(line: CartLine): boolean {
  return line.available && line.quantity <= line.stock;
}

/** Recomputes the totals from the lines. */
export function withTotals(items: CartLine[]): Cart {
  let itemCount = 0;
  let subtotal = 0;
  let hasIssues = false;
  for (const line of items) {
    if (!lineIsReady(line)) {
      hasIssues = true;
      continue;
    }
    itemCount += line.quantity;
    subtotal += line.price * line.quantity;
  }
  return { items, item_count: itemCount, subtotal, has_issues: hasIssues };
}

export function setLineQuantity(
  cart: Cart,
  variantId: string,
  quantity: number,
): Cart {
  return withTotals(
    cart.items.map((line) =>
      line.variant_id === variantId
        ? { ...line, quantity, line_total: line.price * quantity }
        : line,
    ),
  );
}

export function removeLine(cart: Cart, variantId: string): Cart {
  return withTotals(cart.items.filter((l) => l.variant_id !== variantId));
}

export const EMPTY_CART: Cart = withTotals([]);

/**
 * Units in the bag, ready or not: what the badge and headings count, so a
 * line that needs attention doesn't make the bag look empty.
 */
export function unitCount(cart: Cart | undefined): number {
  return cart?.items.reduce((sum, line) => sum + line.quantity, 0) ?? 0;
}

/** "Black · M" from a line's options. */
export function optionSummary(line: Pick<CartLine, "options">): string {
  return line.options.map((o) => o.value).join(" · ");
}
