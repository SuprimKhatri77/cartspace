// The storefront's Content-Security-Policy. Inline scripts run only with
// the per-request nonce, which Next stamps on its own; script files only come
// from this site, which serves no uploads. No 'strict-dynamic': Next 16.2
// renders loading/error segments' script tags without the nonce
// (create-component-styles-and-scripts.js), which it would block. Everything
// else is limited to this site, the API and Cloudinary.

export type CspOptions = {
  nonce: string;
  /** next dev: React needs eval for its debug stacks, and HMR a websocket. */
  dev: boolean;
  /** NEXT_PUBLIC_API_URL; the browser calls the API there. */
  apiUrl?: string;
};

/** A fresh nonce: 16 random bytes, base64. */
export function createNonce(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return btoa(String.fromCharCode(...bytes));
}

function origin(url: string | undefined): string | undefined {
  if (!url) return undefined;
  try {
    return new URL(url).origin;
  } catch {
    return undefined;
  }
}

export function contentSecurityPolicy({
  nonce,
  dev,
  apiUrl,
}: CspOptions): string {
  const api = origin(apiUrl);
  const directives: Record<string, (string | false | undefined)[]> = {
    "default-src": ["'self'"],
    "script-src": ["'self'", `'nonce-${nonce}'`, dev && "'unsafe-eval'"],
    // Inline style attributes are everywhere (motion, sonner, --i offsets).
    "style-src": ["'self'", "'unsafe-inline'"],
    // blob: is the admin's local preview of an image being uploaded.
    "img-src": ["'self'", "data:", "blob:", "https://res.cloudinary.com"],
    // next/font serves the fonts from this site.
    "font-src": ["'self'"],
    // Admin uploads go from the browser straight to Cloudinary.
    "connect-src": ["'self'", api, "https://api.cloudinary.com", dev && "ws:"],
    "frame-ancestors": ["'none'"],
    "base-uri": ["'self'"],
    "form-action": ["'self'"],
    "object-src": ["'none'"],
  };
  const policy = Object.entries(directives).map(([name, values]) =>
    [name, ...new Set(values.filter(Boolean))].join(" "),
  );
  // Only once the API itself is on https: upgrading a local http API would
  // break a production build run on localhost.
  if (!dev && api?.startsWith("https:")) {
    policy.push("upgrade-insecure-requests");
  }
  return policy.join("; ");
}
