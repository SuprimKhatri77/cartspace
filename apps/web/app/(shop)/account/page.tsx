import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { fetchCurrentUser, sessionExpiredPath } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Account" };

export default async function AccountPage() {
  // proxy.ts only decodes the access token; the API has the final word.
  const user = await fetchCurrentUser();
  if (!user) redirect(sessionExpiredPath("/account"));

  const rows = [
    { label: "Name", value: user.name },
    { label: "Email", value: user.email },
    { label: "Role", value: user.role },
  ];

  return (
    <div className="max-w-xl space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Account</h1>
      <dl className="divide-y divide-border border border-border">
        {rows.map((row) => (
          <div key={row.label} className="flex gap-6 px-4 py-3">
            <dt className="w-24 shrink-0 text-xs uppercase tracking-widest text-muted-foreground">
              {row.label}
            </dt>
            <dd className="min-w-0 truncate text-sm">{row.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
