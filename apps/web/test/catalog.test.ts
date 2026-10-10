import { describe, expect, test } from "bun:test";
import type { CategoryNode, StorefrontVariant } from "@repo/types";
import { formatPrice, fromCents, toCents } from "@/lib/money";
import {
  buildCategoryTree,
  categoryPath,
  childCategories,
} from "@/modules/catalog/lib/category-tree";
import {
  parseListingFilters,
  parsePage,
  withParams,
} from "@/modules/catalog/lib/search-params";
import {
  findVariant,
  isAvailable,
  optionGroups,
  pickOption,
} from "@/modules/catalog/lib/variants";

describe("money", () => {
  test("formats cents", () => {
    expect(formatPrice(2900)).toBe("$29.00");
    expect(formatPrice(5)).toBe("$0.05");
  });
  test("parses amounts to cents", () => {
    expect(toCents("12.5")).toBe(1250);
    expect(toCents(" 20 ")).toBe(2000);
    expect(toCents("0.07")).toBe(7);
    expect(toCents("1.005")).toBeNull();
    expect(toCents("-1")).toBeNull();
    expect(toCents("abc")).toBeNull();
    expect(toCents("")).toBeNull();
    expect(fromCents(1250)).toBe("12.5");
  });
});

describe("search params", () => {
  test("page falls back to 1", () => {
    expect(parsePage({ page: "3" })).toBe(3);
    for (const page of ["0", "-1", "1.5", "x", "100001", undefined]) {
      expect(parsePage({ page })).toBe(1);
    }
    expect(parsePage({ page: ["2", "5"] })).toBe(2);
  });

  test("listing filters", () => {
    expect(parseListingFilters({})).toEqual({
      page: 1,
      sort: "newest",
      priceMin: 0,
      priceMax: 0,
    });
    expect(
      parseListingFilters({ sort: "price_desc", min: "20", max: "80.5" }),
    ).toEqual({ page: 1, sort: "price_desc", priceMin: 2000, priceMax: 8050 });
    // unknown sort, junk prices, reversed range
    expect(parseListingFilters({ sort: "cheap", min: "x" }).sort).toBe(
      "newest",
    );
    expect(parseListingFilters({ min: "x", max: "9999999" })).toMatchObject({
      priceMin: 0,
      priceMax: 0,
    });
    expect(parseListingFilters({ min: "80", max: "20" })).toMatchObject({
      priceMin: 2000,
      priceMax: 8000,
    });
    // only a minimum is not "reversed"
    expect(parseListingFilters({ min: "80" })).toMatchObject({
      priceMin: 8000,
      priceMax: 0,
    });
  });

  test("withParams drops defaults and empties", () => {
    expect(withParams("/c/x", { sort: "newest", page: "2" }, { page: 1 })).toBe(
      "/c/x",
    );
    expect(
      withParams("/c/x", { min: "10" }, { sort: "price_asc", max: "" }),
    ).toBe("/c/x?min=10&sort=price_asc");
  });
});

const node = (
  id: string,
  slug: string,
  parent_id: string | null,
  depth: number,
): CategoryNode => ({
  id,
  name: slug,
  slug,
  parent_id,
  depth,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
});

describe("category tree", () => {
  const nodes = [
    node("1", "clothing", null, 0),
    node("2", "home", null, 0),
    node("3", "shoes", "1", 1),
    node("4", "boots", "3", 2),
  ];

  test("nests children", () => {
    const tree = buildCategoryTree(nodes);
    expect(tree.map((n) => n.slug)).toEqual(["clothing", "home"]);
    expect(tree[0]?.children[0]?.children[0]?.slug).toBe("boots");
  });

  test("path and children", () => {
    expect(categoryPath(nodes, "boots").map((n) => n.slug)).toEqual([
      "clothing",
      "shoes",
      "boots",
    ]);
    expect(categoryPath(nodes, "nope")).toEqual([]);
    expect(childCategories(nodes, "clothing").map((n) => n.slug)).toEqual([
      "shoes",
    ]);
  });

  test("path terminates on a cycle", () => {
    const cyclic = [node("a", "a", "b", 0), node("b", "b", "a", 0)];
    expect(categoryPath(cyclic, "a").length).toBeLessThanOrEqual(3);
  });
});

const variant = (
  id: string,
  options: Record<string, string>,
): StorefrontVariant => ({
  id,
  product_id: "p",
  sku: null,
  stock: 1,
  images: [],
  image_public_ids: [],
  selling_price: 100,
  offer_price: null,
  is_default: id === "1",
  is_active: true,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
  option_combination_key: "",
  offer_expires_at: null,
  options: Object.entries(options).map(([name, value]) => ({ name, value })),
});

describe("variants", () => {
  const variants = [
    variant("1", { color: "Red", size: "M" }),
    variant("2", { color: "Red", size: "L" }),
    variant("3", { color: "Blue", size: "M" }),
  ];

  test("groups options", () => {
    expect(optionGroups(variants)).toEqual([
      { name: "color", values: ["Red", "Blue"] },
      { name: "size", values: ["M", "L"] },
    ]);
    expect(optionGroups([variant("1", {})])).toEqual([]);
  });

  test("finds the exact combination", () => {
    expect(findVariant(variants, { color: "Red", size: "L" })?.id).toBe("2");
    expect(findVariant(variants, { color: "Blue", size: "L" })).toBeUndefined();
  });

  test("picking keeps other choices when possible", () => {
    // Red/L → Blue: Blue/L doesn't exist, so Blue/M.
    expect(
      pickOption(variants, { color: "Red", size: "L" }, "color", "Blue")?.id,
    ).toBe("3");
    // Red/M → L keeps Red.
    expect(
      pickOption(variants, { color: "Red", size: "M" }, "size", "L")?.id,
    ).toBe("2");
  });

  test("availability against the other choices", () => {
    const sel = { color: "Blue", size: "M" };
    expect(isAvailable(variants, sel, "size", "L")).toBe(false);
    expect(isAvailable(variants, sel, "color", "Red")).toBe(true);
  });
});
