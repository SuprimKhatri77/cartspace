import type { Metadata } from "next";
import { DiscountsManager } from "@/modules/admin/components/discounts-manager";
import { AdminPageHeader } from "@/modules/admin/components/page-header";
import {
  adminDiscountsSearch,
  parseAdminDiscountFilters,
} from "@/modules/admin/lib/order-filters";

export const metadata: Metadata = { title: "Discounts" };

export default async function AdminDiscountsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const filters = parseAdminDiscountFilters(await searchParams);
  return (
    <>
      <AdminPageHeader
        eyebrow="Sales"
        title="Discounts"
        description="Codes shoppers enter at checkout, taken off the items."
      />
      <DiscountsManager key={adminDiscountsSearch(filters)} initial={filters} />
    </>
  );
}
