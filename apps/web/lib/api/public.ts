import "server-only";
import { createServerClient, type Client } from "@repo/api-client/server";

/** Every cached catalog read carries this tag (revalidateTag("catalog")). */
export const CATALOG_TAG = "catalog";

/**
 * A fetch client for public, cookie-free reads that go through Next's data
 * cache, so a popular page costs one API call per revalidate window instead
 * of one per visitor. The generated client passes fetch a Request, which
 * drops Next's `next` options, so they are added here.
 */
export function publicClient(revalidate: number): Client {
  const cachedFetch = (input: RequestInfo | URL, init?: RequestInit) =>
    fetch(input, { ...init, next: { revalidate, tags: [CATALOG_TAG] } });
  return createServerClient({ fetch: cachedFetch as typeof fetch });
}
