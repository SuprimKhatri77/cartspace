"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { MagnifyingGlassIcon, XIcon } from "@phosphor-icons/react";
import type { OrderStatus } from "@repo/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { getApiError } from "@/lib/api/errors";
import { formatPrice } from "@/lib/money";
import { cn } from "@/lib/utils";
import { formatOrderDate, orderLabel } from "@/modules/checkout/lib/orders";
import {
  adminOrdersSearch,
  type AdminOrderFilters,
} from "../lib/order-filters";
import { useAdminOrders } from "../queries";
import { PageNav } from "./page-nav";
import { OrderStatusBadge } from "./status-badge";

const PATH = "/admin/orders";

/** The status tabs; "To ship" is the paid orders waiting for the warehouse. */
const tabs: { label: string; status: OrderStatus | "" }[] = [
  { label: "All", status: "" },
  { label: "To ship", status: "paid" },
  { label: "Shipped", status: "shipped" },
  { label: "Delivered", status: "delivered" },
  { label: "Awaiting payment", status: "pending" },
  { label: "Cancelled", status: "cancelled" },
  { label: "Refunded", status: "refunded" },
];

export function OrdersTable({ initial }: { initial: AdminOrderFilters }) {
  const [filters, setFilters] = useState(initial);
  const [search, setSearch] = useState(initial.q);
  const debounced = useDebouncedValue(search.trim(), 300);
  const orders = useAdminOrders(filters);

  useEffect(() => {
    setFilters((f) =>
      f.q === debounced ? f : { ...f, q: debounced, page: 1 },
    );
  }, [debounced]);

  useEffect(() => {
    window.history.replaceState(null, "", PATH + adminOrdersSearch(filters));
  }, [filters]);

  const outOfRange =
    orders.isError &&
    getApiError(orders.error)?.code === "INVALID_PAGE_PARAMETER";
  useEffect(() => {
    if (outOfRange && filters.page > 1) setFilters((f) => ({ ...f, page: 1 }));
  }, [outOfRange, filters.page]);

  const rows = orders.data?.data ?? [];
  const meta = orders.data?.meta;
  const filtered = Boolean(filters.q || filters.status || filters.customer);

  return (
    <div className="space-y-5">
      <div
        role="group"
        aria-label="Order status"
        className="no-scrollbar -mx-4 flex gap-1 overflow-x-auto border-b border-border px-4 sm:mx-0 sm:px-0"
      >
        {tabs.map((tab) => (
          <button
            key={tab.label}
            type="button"
            aria-pressed={filters.status === tab.status}
            onClick={() =>
              setFilters((f) => ({ ...f, status: tab.status, page: 1 }))
            }
            className="-mb-px shrink-0 border-b-2 border-transparent px-3 pb-3 text-[0.8125rem] text-muted-foreground transition-colors hover:text-foreground aria-pressed:border-foreground aria-pressed:text-foreground"
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="relative">
        <MagnifyingGlassIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Order number (CS-1042) or email"
          aria-label="Search orders"
          className="h-10 pl-9"
          maxLength={100}
        />
      </div>

      {filters.customer && (
        <div className="flex flex-wrap items-center gap-3 rounded-control border border-border px-3 py-2 text-[0.8125rem]">
          <span>
            Showing one customer&apos;s orders.{" "}
            <Link
              href={`/admin/customers/${filters.customer}`}
              className="underline underline-offset-4 hover:text-muted-foreground"
            >
              View the customer
            </Link>
          </span>
          <button
            type="button"
            onClick={() => setFilters((f) => ({ ...f, customer: "", page: 1 }))}
            className="ml-auto inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <XIcon className="size-3" />
            Everyone&apos;s orders
          </button>
        </div>
      )}

      <div className="flex min-h-6 items-center justify-between gap-3 text-xs text-muted-foreground">
        <p aria-live="polite">
          {meta
            ? `${meta.total} ${meta.total === 1 ? "order" : "orders"}`
            : " "}
        </p>
        {filtered && (
          <button
            type="button"
            onClick={() => {
              setSearch("");
              setFilters({ page: 1, q: "", status: "", customer: "" });
            }}
            className="inline-flex items-center gap-1 hover:text-foreground"
          >
            <XIcon className="size-3" />
            Clear filters
          </button>
        )}
      </div>

      <div
        className={cn(
          "overflow-hidden rounded-panel border border-border transition-opacity",
          orders.isPlaceholderData && "opacity-60",
        )}
      >
        <Table className="md:min-w-[44rem]">
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Order</TableHead>
              <TableHead className="hidden sm:table-cell">Customer</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="hidden md:table-cell">Placed</TableHead>
              <TableHead className="text-right">Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.isPending ? (
              Array.from({ length: 6 }, (_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={5}>
                    <Skeleton className="h-10" />
                  </TableCell>
                </TableRow>
              ))
            ) : orders.isError && !outOfRange ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={5} className="py-16 text-center">
                  <p className="mb-4 text-sm text-muted-foreground">
                    The orders couldn&apos;t load.
                  </p>
                  <Button variant="outline" onClick={() => orders.refetch()}>
                    Try again
                  </Button>
                </TableCell>
              </TableRow>
            ) : rows.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={5} className="py-16 text-center">
                  <p className="font-serif text-2xl">
                    {filtered ? "No orders match." : "No orders yet."}
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {filtered
                      ? "Try another number or email, or another tab."
                      : "They appear here as soon as a checkout starts."}
                  </p>
                </TableCell>
              </TableRow>
            ) : (
              rows.map((order) => (
                <TableRow
                  key={order.id}
                  className="group relative cursor-pointer"
                >
                  <TableCell>
                    <Link
                      href={`${PATH}/${order.number}`}
                      className="block outline-none after:absolute after:inset-0 focus-visible:underline"
                    >
                      <span className="font-mono text-xs group-hover:underline">
                        {orderLabel(order.number)}
                      </span>
                      <span className="block text-[0.6875rem] text-muted-foreground">
                        {order.item_count}{" "}
                        {order.item_count === 1 ? "item" : "items"}
                      </span>
                    </Link>
                  </TableCell>
                  <TableCell className="hidden max-w-[16rem] sm:table-cell">
                    <span className="block truncate">
                      {order.customer_name}
                    </span>
                    <span className="block truncate text-[0.6875rem] text-muted-foreground">
                      {order.email}
                    </span>
                  </TableCell>
                  <TableCell>
                    <OrderStatusBadge status={order.status} />
                  </TableCell>
                  <TableCell className="hidden text-muted-foreground md:table-cell">
                    {formatOrderDate(order.created_at)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatPrice(order.total)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {meta && (
        <PageNav
          page={meta.page}
          totalPages={meta.total_pages}
          href={(page) => PATH + adminOrdersSearch({ ...filters, page })}
          onPage={(page) => {
            setFilters((f) => ({ ...f, page }));
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
        />
      )}
    </div>
  );
}
