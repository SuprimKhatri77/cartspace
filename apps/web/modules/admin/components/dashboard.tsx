"use client";

import Link from "next/link";
import { ArrowRightIcon, WarningCircleIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatPrice } from "@/lib/money";
import { formatOrderDate, orderLabel } from "@/modules/checkout/lib/orders";
import { useAdminStats } from "../queries";
import { SalesChart } from "./sales-chart";
import { OrderStatusBadge } from "./status-badge";

const count = new Intl.NumberFormat("en-US");

function Panel({
  title,
  action,
  children,
  className,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`border border-border bg-card ${className ?? ""}`}>
      <header className="flex h-12 items-center justify-between border-b border-border px-5">
        <h2 className="eyebrow !text-foreground">{title}</h2>
        {action}
      </header>
      <div className="p-5">{children}</div>
    </section>
  );
}

export function Dashboard() {
  const { data: stats, isPending, isError, refetch } = useAdminStats();

  if (isPending) return <DashboardSkeleton />;
  if (isError) {
    return (
      <div className="flex flex-col items-start gap-4 border border-border p-8">
        <p className="text-sm text-muted-foreground">
          The dashboard couldn&apos;t load.
        </p>
        <Button variant="outline" onClick={() => refetch()}>
          Try again
        </Button>
      </div>
    );
  }

  const kpis = [
    {
      label: "Revenue",
      value: formatPrice(stats.revenue),
      hint: "Paid, shipped and delivered",
    },
    {
      label: "Orders",
      value: count.format(stats.orders),
      hint: "Paid or later",
    },
    {
      label: "Average order",
      value: formatPrice(stats.average_order_value),
      hint: "Revenue per order",
    },
    {
      label: "Customers",
      value: count.format(stats.customers),
      hint: "Customer accounts",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 border-t border-l border-border xl:grid-cols-4">
        {kpis.map((kpi, i) => (
          <div
            key={kpi.label}
            className="animate-rise border-r border-b border-border bg-card p-5 sm:p-6"
            style={{ "--i": i } as React.CSSProperties}
          >
            <p className="eyebrow">{kpi.label}</p>
            <p className="mt-4 truncate font-serif text-3xl tabular-nums sm:text-4xl">
              {kpi.value}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">{kpi.hint}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <Panel title="Revenue">
          <SalesChart days={stats.sales_by_day} />
        </Panel>

        <Panel
          title="Low stock"
          action={
            <span className="font-mono text-[0.625rem] text-muted-foreground">
              5 or fewer
            </span>
          }
        >
          {stats.low_stock.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Every active variant has more than 5 in stock.
            </p>
          ) : (
            <ul className="-my-2 divide-y divide-border">
              {stats.low_stock.map((item) => (
                <li key={item.variant_id}>
                  <Link
                    href={`/admin/products/${item.product_id}#variants`}
                    className="group flex items-center justify-between gap-3 py-2.5"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-[0.8125rem] group-hover:underline">
                        {item.product_name}
                      </span>
                      <span className="block truncate font-mono text-[0.625rem] text-muted-foreground">
                        {item.sku ?? "No SKU"}
                      </span>
                    </span>
                    <span
                      className={`inline-flex shrink-0 items-center gap-1 font-mono text-xs tabular-nums ${item.stock === 0 ? "text-destructive" : "text-clay"}`}
                    >
                      {item.stock === 0 && (
                        <WarningCircleIcon className="size-3.5" />
                      )}
                      {item.stock === 0 ? "Sold out" : `${item.stock} left`}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <Panel
        title="Recent orders"
        action={
          <Link
            href="/admin/orders"
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            All orders
          </Link>
        }
      >
        {stats.recent_orders.length === 0 ? (
          <p className="text-sm text-muted-foreground">No orders yet.</p>
        ) : (
          <div className="-mx-5 -my-5 overflow-x-auto">
            <table className="w-full min-w-[36rem] text-[0.8125rem]">
              <thead>
                <tr className="border-b border-border text-left">
                  {["Order", "Customer", "Status", "Placed", "Total"].map(
                    (h) => (
                      <th
                        key={h}
                        className={`h-10 px-5 font-mono text-[0.625rem] font-normal tracking-[0.14em] text-muted-foreground uppercase ${h === "Total" ? "text-right" : ""}`}
                      >
                        {h}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {stats.recent_orders.map((order) => (
                  <tr key={order.id}>
                    <td className="h-12 px-5 font-mono text-xs">
                      <Link
                        href={`/admin/orders/${order.number}`}
                        className="hover:underline"
                      >
                        {orderLabel(order.number)}
                      </Link>
                    </td>
                    <td className="max-w-[14rem] truncate px-5">
                      {order.email}
                    </td>
                    <td className="px-5">
                      <OrderStatusBadge status={order.status} />
                    </td>
                    <td className="px-5 text-muted-foreground">
                      {formatOrderDate(order.created_at)}
                    </td>
                    <td className="px-5 text-right tabular-nums">
                      {formatPrice(order.total)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <div className="flex flex-wrap gap-3">
        <Link
          href="/admin/products/new"
          className="group inline-flex h-10 items-center gap-2 border border-border px-4 text-[0.8125rem] transition-colors hover:bg-muted"
        >
          Add a product
          <ArrowRightIcon className="size-3.5 transition-transform group-hover:translate-x-0.5" />
        </Link>
        <Link
          href="/admin/categories"
          className="group inline-flex h-10 items-center gap-2 border border-border px-4 text-[0.8125rem] transition-colors hover:bg-muted"
        >
          Manage categories
          <ArrowRightIcon className="size-3.5 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div
      className="space-y-6"
      aria-busy="true"
      aria-label="Loading the dashboard"
    >
      <div className="grid grid-cols-2 gap-px xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-32 rounded-none" />
        ))}
      </div>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <Skeleton className="h-80 rounded-none" />
        <Skeleton className="h-80 rounded-none" />
      </div>
      <Skeleton className="h-64 rounded-none" />
    </div>
  );
}
