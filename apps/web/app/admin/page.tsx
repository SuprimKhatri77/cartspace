import type { Metadata } from "next";

export const metadata: Metadata = { title: "Admin" };

// proxy.ts lets only admins in; the API checks the role again on every
// admin endpoint.
export default function AdminPage() {
  return (
    <div className="max-w-2xl space-y-4">
      <p className="eyebrow">Dashboard</p>
      <h1 className="display text-5xl">The back office is being built.</h1>
      <p className="text-sm text-muted-foreground">
        Products, categories, orders and image uploads arrive with the admin
        panel. Until then the catalog is managed through the API.
      </p>
    </div>
  );
}
