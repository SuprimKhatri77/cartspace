import type { AdminProductFilters } from "./lib/filters";

// Admin data is the same for every admin, so the keys carry no user id.
export const adminKeys = {
  all: ["admin"] as const,
  stats: () => [...adminKeys.all, "stats"] as const,
  products: () => [...adminKeys.all, "products"] as const,
  productLists: () => [...adminKeys.products(), "list"] as const,
  productList: (filters: AdminProductFilters) =>
    [...adminKeys.productLists(), filters] as const,
  product: (id: string) => [...adminKeys.products(), "detail", id] as const,
  variants: (productId: string) =>
    [...adminKeys.products(), "variants", productId] as const,
  categories: () => [...adminKeys.all, "categories"] as const,
};
