import type { UserRole } from "@repo/types";

export const LOGIN_PATH = "/auth/login";

/**
 * Returns next if it is a path on this site, else null. Rejects absolute and
 * protocol-relative URLs ("//evil.com", "/\evil.com") so ?next= can't be used
 * as an open redirect.
 */
export function safeNextPath(next: string | null | undefined): string | null {
  if (!next || !next.startsWith("/") || next.startsWith("//")) return null;
  try {
    const base = "http://cartspace.invalid";
    const url = new URL(next, base);
    if (url.origin !== base) return null;
    return url.pathname + url.search + url.hash;
  } catch {
    return null;
  }
}

/** The login page, returning to path after signing in. */
export function loginPath(path?: string): string {
  const next = safeNextPath(path);
  return next && next !== "/"
    ? `${LOGIN_PATH}?next=${encodeURIComponent(next)}`
    : LOGIN_PATH;
}

/** Where a user lands when there is no ?next=. */
export function homeFor(role: UserRole): string {
  return role === "admin" ? "/admin" : "/";
}
