"use client";

import Link from "next/link";
import { EmptyState } from "@/components/feedback/empty-state";
import { Button, buttonVariants } from "@/components/ui/button";

export default function ShopError({ reset }: { reset: () => void }) {
  return (
    <EmptyState
      className="flex-1"
      eyebrow="Something went wrong"
      title="We dropped a stitch."
      action={
        <>
          <Button onClick={reset}>Try again</Button>
          <Link href="/" className={buttonVariants({ variant: "outline" })}>
            Home
          </Link>
        </>
      }
    >
      The store couldn&apos;t load this page. It&apos;s usually temporary, so
      please try again.
    </EmptyState>
  );
}
