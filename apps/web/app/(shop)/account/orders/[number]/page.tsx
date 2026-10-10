import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { OrderView } from "@/modules/checkout/components/orders-view";
import { orderLabel } from "@/modules/checkout/lib/orders";

type Params = { params: Promise<{ number: string }> };

function parseNumber(raw: string): number | null {
  return /^\d{1,15}$/.test(raw) ? Number(raw) : null;
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const number = parseNumber((await params).number);
  return { title: number ? `Order ${orderLabel(number)}` : "Order" };
}

export default async function OrderPage({ params }: Params) {
  const number = parseNumber((await params).number);
  if (!number) notFound();
  return <OrderView number={number} />;
}
