import type { Metadata } from "next";

export const metadata: Metadata = { title: "Admin" };

// proxy.ts lets only admins in; the API checks the role again on every
// admin endpoint.
export default function AdminPage() {
  return (
    <div className="space-y-2">
      <h1 className="text-2xl font-semibold tracking-tight">Admin</h1>
      <p className="text-sm text-muted-foreground">
        Managing categories, products and variants comes in a later phase.
      </p>
    </div>
  );
}
