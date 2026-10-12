import type { StatsRange } from "@repo/types";
import type { AdminProductFilters } from "./lib/filters";
import type {
  AdminOrderFilters,
  AdminReviewFilters,
} from "./lib/order-filters";

// Admin data is the same for every admin, so the keys carry no user id.
export const adminKeys = {
  all: ["admin"] as const,
  stats: (range?: StatsRange) =>
    range
      ? ([...adminKeys.all, "stats", range] as const)
      : ([...adminKeys.all, "stats"] as const),
  products: () => [...adminKeys.all, "products"] as const,
  productLists: () => [...adminKeys.products(), "list"] as const,
  productList: (filters: AdminProductFilters) =>
    [...adminKeys.productLists(), filters] as const,
  product: (id: string) => [...adminKeys.products(), "detail", id] as const,
  variants: (productId: string) =>
    [...adminKeys.products(), "variants", productId] as const,
  categories: () => [...adminKeys.all, "categories"] as const,
  orders: () => [...adminKeys.all, "orders"] as const,
  orderList: (filters: AdminOrderFilters) =>
    [...adminKeys.orders(), "list", filters] as const,
  order: (number: number) => [...adminKeys.orders(), "detail", number] as const,
  reviews: () => [...adminKeys.all, "reviews"] as const,
  reviewList: (filters: AdminReviewFilters) =>
    [...adminKeys.reviews(), "list", filters] as const,
};
