import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { OrderDetailView } from "@/modules/admin/components/order-detail";

type Props = { params: Promise<{ number: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { number } = await params;
  return { title: `Order CS-${number}` };
}

export default async function AdminOrderPage({ params }: Props) {
  const number = Number((await params).number);
  if (!Number.isInteger(number) || number < 1) notFound();
  return <OrderDetailView number={number} />;
}
