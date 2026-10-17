// The store's policy pages, for the footer, the sitemap and each page's
// "other policies" links. Bump LEGAL_UPDATED when a policy changes.
export const LEGAL_UPDATED = "2026-10-17";

export const LEGAL_PAGES = [
  { label: "Shipping & returns", href: "/shipping-returns" },
  { label: "Privacy", href: "/privacy" },
  { label: "Terms", href: "/terms" },
] as const;
