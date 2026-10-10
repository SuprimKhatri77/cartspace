import type { UserRole } from "@repo/types";

// Path prefixes that need a session, and the roles allowed in. The API
// enforces roles on every endpoint; these rules only keep users out of pages
// they can't use. Keep proxy.ts's matcher in sync.
export const ROLE_RULES: ReadonlyArray<{
  prefix: string;
  roles: readonly UserRole[];
}> = [
  { prefix: "/admin", roles: ["admin"] },
  { prefix: "/account", roles: ["admin", "customer"] },
];

// Pages only for signed-out users; signed-in users are sent home.
export const SIGNED_OUT_ONLY_PREFIXES = ["/auth"] as const;

/** "/admin" matches "/admin" and "/admin/x", not "/administrator". */
export function matchesPrefix(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

export function requiredRoles(
  pathname: string,
): readonly UserRole[] | undefined {
  return ROLE_RULES.find((rule) => matchesPrefix(pathname, rule.prefix))?.roles;
}

export function isProtectedPath(pathname: string): boolean {
  return requiredRoles(pathname) !== undefined;
}

export function isSignedOutOnlyPath(pathname: string): boolean {
  return SIGNED_OUT_ONLY_PREFIXES.some((prefix) =>
    matchesPrefix(pathname, prefix),
  );
}
