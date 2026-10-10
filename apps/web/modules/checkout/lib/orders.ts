import type { OrderStatus } from "@repo/types";

/** "CS-1042" */
export function orderLabel(number: number): string {
  return `CS-${number}`;
}

export const STATUS_LABELS: Record<OrderStatus, string> = {
  pending: "Awaiting payment",
  paid: "Confirmed",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
  refunded: "Refunded",
};

/** The steps of a fulfilled order, in order. */
export const TIMELINE: OrderStatus[] = ["paid", "shipped", "delivered"];

/**
 * How far along the timeline an order is: the index of its step, or -1
 * for an order that left it (pending, cancelled, refunded).
 */
export function timelineStep(status: OrderStatus): number {
  return TIMELINE.indexOf(status);
}

const dateFormat = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

/** "10 October 2026", in UTC so the server and browser agree. */
export function formatOrderDate(iso: string): string {
  return dateFormat.format(new Date(iso));
}
