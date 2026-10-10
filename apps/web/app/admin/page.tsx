import type { Metadata } from "next";
import { site } from "@/lib/site";
import { AdminPageHeader } from "@/modules/admin/components/page-header";
import { Dashboard } from "@/modules/admin/components/dashboard";

// The layout's title template only reaches child segments, not this page.
export const metadata: Metadata = {
  title: { absolute: `Dashboard · Admin · ${site.name}` },
};

export default function AdminPage() {
  return (
    <>
      <AdminPageHeader eyebrow="Overview" title="Dashboard" />
      <Dashboard />
    </>
  );
}
