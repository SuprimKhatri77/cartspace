import { cache } from "react";
import {
  getProductBySlug,
  listCategories,
  listCategoryProducts,
  listProducts,
} from "@repo/api-client/server";
import { serverClient } from "@/lib/api/server";
import type { ListingFilters } from "./lib/search-params";

// Server-side catalog reads. A 404 from the API (unknown slug, page past the
// end) comes back as null so the page can call notFound(); anything else is
// thrown to the error boundary.

function check(
  response: Response | undefined,
  what: string,
): asserts response is Response {
  if (!response) throw new Error(`${what}: API unreachable`);
}

function notFoundOrThrow(response: Response, what: string): null {
  // 400 here means a page past the end or a filter the URL parser let
  // through; treat it like a missing page rather than an error.
  if (response.status === 404 || response.status === 400) return null;
  throw new Error(`${what}: API responded ${response.status}`);
}

/** Every category, once per request (the header and pages share it). */
export const getCategories = cache(async () => {
  const { data, response } = await listCategories({
    client: await serverClient(),
  });
  check(response, "list categories");
  if (!data)
    throw new Error(`list categories: API responded ${response.status}`);
  return data.data;
});

export async function getProducts(page: number) {
  const { data, response } = await listProducts({
    client: await serverClient(),
    query: { page },
  });
  check(response, "list products");
  return data ?? notFoundOrThrow(response, "list products");
}

export async function getCategoryListing(
  slug: string,
  filters: ListingFilters,
) {
  const { data, response } = await listCategoryProducts({
    client: await serverClient(),
    path: { slug },
    query: {
      page: filters.page,
      sort: filters.sort,
      price_min: filters.priceMin,
      price_max: filters.priceMax,
    },
  });
  check(response, "list category products");
  return data ?? notFoundOrThrow(response, "list category products");
}

/** Cached per request: generateMetadata and the page both need it. */
export const getProductPage = cache(async (slug: string) => {
  const { data, response } = await getProductBySlug({
    client: await serverClient(),
    path: { productSlug: slug },
  });
  check(response, "get product");
  return data?.data ?? notFoundOrThrow(response, "get product");
});
