import type { OrderStatus, ReviewStatus } from "@repo/types";

type Params = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value)?.trim() ?? "";
}

function pageOf(params: Params): number {
  const page = Number(first(params.page));
  return Number.isInteger(page) && page > 0 ? page : 1;
}

function searchOf(entries: [string, string | number | undefined][]): string {
  const params = new URLSearchParams();
  for (const [key, value] of entries) {
    if (
      value !== undefined &&
      value !== "" &&
      !(key === "page" && value === 1)
    ) {
      params.set(key, String(value));
    }
  }
  const search = params.toString();
  return search ? `?${search}` : "";
}

const ORDER_STATUSES: OrderStatus[] = [
  "pending",
  "paid",
  "shipped",
  "delivered",
  "cancelled",
  "refunded",
];

/** The admin orders table's state, mirrored in its URL. */
export type AdminOrderFilters = {
  page: number;
  q: string;
  status: OrderStatus | "";
};

export function parseAdminOrderFilters(params: Params): AdminOrderFilters {
  const status = first(params.status) as OrderStatus;
  return {
    page: pageOf(params),
    q: first(params.q).slice(0, 100),
    status: ORDER_STATUSES.includes(status) ? status : "",
  };
}

export function adminOrdersQuery(f: AdminOrderFilters) {
  return {
    page: f.page,
    ...(f.q && { q: f.q }),
    ...(f.status && { status: f.status }),
  };
}

export function adminOrdersSearch(f: AdminOrderFilters): string {
  return searchOf([
    ["status", f.status],
    ["q", f.q],
    ["page", f.page],
  ]);
}

/** The moderation list's state, mirrored in its URL. */
export type AdminReviewFilters = {
  page: number;
  status: ReviewStatus | "";
  rating: number | null;
};

export function parseAdminReviewFilters(params: Params): AdminReviewFilters {
  const status = first(params.status);
  const rating = Number(first(params.rating));
  return {
    page: pageOf(params),
    status: status === "published" || status === "hidden" ? status : "",
    rating:
      Number.isInteger(rating) && rating >= 1 && rating <= 5 ? rating : null,
  };
}

export function adminReviewsQuery(f: AdminReviewFilters) {
  return {
    page: f.page,
    ...(f.status && { status: f.status }),
    ...(f.rating !== null && { rating: f.rating }),
  };
}

export function adminReviewsSearch(f: AdminReviewFilters): string {
  return searchOf([
    ["status", f.status],
    ["rating", f.rating ?? undefined],
    ["page", f.page],
  ]);
}
