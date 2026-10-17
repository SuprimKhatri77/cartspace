import { NextResponse, type NextRequest } from "next/server";
import { isSignedOutOnlyPath, requiredRoles } from "@/lib/proxy/config";
import { contentSecurityPolicy, createNonce } from "@/lib/proxy/csp";
import { handleProtected, handleSignedOutOnly } from "@/lib/proxy/handlers";

function route(
  req: NextRequest,
  headers: Headers,
): Promise<NextResponse> | NextResponse {
  const { pathname } = req.nextUrl;

  if (isSignedOutOnlyPath(pathname)) return handleSignedOutOnly(req, headers);

  const roles = requiredRoles(pathname);
  if (roles) return handleProtected(req, roles, headers);

  return NextResponse.next({ request: { headers } });
}

/**
 * Every page gets a fresh CSP nonce: the policy goes on the request, where
 * Next finds the nonce for its own scripts, and on the response. Guarded
 * paths (lib/proxy/config.ts) also check the session.
 */
export async function proxy(req: NextRequest) {
  const csp = contentSecurityPolicy({
    nonce: createNonce(),
    dev: process.env.NODE_ENV === "development",
    apiUrl: process.env.NEXT_PUBLIC_API_URL,
  });
  const headers = new Headers(req.headers);
  headers.set("content-security-policy", csp);

  // Only the headers change: the request itself (and a server action's
  // body) goes on untouched.
  const res = await route(req, headers);
  res.headers.set("content-security-policy", csp);
  return res;
}

// Pages only: build assets, icons, share images and crawler files carry no
// scripts, so they skip the proxy.
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon\\.ico|icon\\.svg|apple-icon\\.png|manifest\\.webmanifest|robots\\.txt|sitemap\\.xml|.*opengraph-image).*)",
  ],
};
