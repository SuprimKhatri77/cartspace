import { describe, expect, test } from "bun:test";
import type { CartLine } from "@repo/types";
import {
  EMPTY_CART,
  optionSummary,
  removeLine,
  setLineQuantity,
  unitCount,
  withTotals,
} from "@/modules/cart/lib/cart-math";
import { shippingFor } from "@/lib/shipping";

const line = (over: Partial<CartLine>): CartLine => ({
  variant_id: "v1",
  quantity: 1,
  added_at: "2026-10-10T00:00:00Z",
  product_id: "p1",
  product_name: "Tee",
  product_slug: "tee",
  sku: null,
  stock: 10,
  image: "",
  selling_price: 2000,
  offer_price: null,
  price: 2000,
  available: true,
  options: [],
  line_total: 2000,
  max_quantity: 10,
  ...over,
});

describe("cart math", () => {
  test("totals skip lines that can't be checked out", () => {
    const cart = withTotals([
      line({ variant_id: "a", quantity: 2, line_total: 4000 }),
      line({ variant_id: "b", quantity: 3, stock: 1 }), // short
      line({ variant_id: "c", available: false }), // off sale
    ]);
    expect(cart).toMatchObject({
      item_count: 2,
      subtotal: 4000,
      has_issues: true,
    });
    // the badge counts every unit, ready or not
    expect(unitCount(cart)).toBe(6);
    expect(unitCount(undefined)).toBe(0);
    expect(EMPTY_CART).toEqual({
      items: [],
      item_count: 0,
      subtotal: 0,
      has_issues: false,
    });
  });

  test("quantity changes reprice the line and the totals", () => {
    const cart = withTotals([
      line({ variant_id: "a" }),
      line({ variant_id: "b", price: 500 }),
    ]);
    const next = setLineQuantity(cart, "b", 4);
    expect(next.items[1]).toMatchObject({ quantity: 4, line_total: 2000 });
    expect(next).toMatchObject({ item_count: 5, subtotal: 4000 });
    // fixing a short line clears the issue
    const short = withTotals([line({ quantity: 5, stock: 2 })]);
    expect(setLineQuantity(short, "v1", 2).has_issues).toBe(false);
  });

  test("removing a line", () => {
    const cart = withTotals([
      line({ variant_id: "a" }),
      line({ variant_id: "b" }),
    ]);
    expect(removeLine(cart, "a").items.map((l) => l.variant_id)).toEqual(["b"]);
    expect(removeLine(cart, "a").item_count).toBe(1);
  });

  test("option summary", () => {
    expect(
      optionSummary({
        options: [
          { name: "color", value: "Black", type: "color" },
          { name: "size", value: "M", type: "text" },
        ],
      }),
    ).toBe("Black · M");
  });

  test("shipping is free over the threshold and for an empty bag", () => {
    expect(shippingFor(0)).toBe(0);
    expect(shippingFor(14_999)).toBe(800);
    expect(shippingFor(15_000)).toBe(0);
  });
});
