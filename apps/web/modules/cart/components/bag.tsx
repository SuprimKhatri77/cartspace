"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, m } from "motion/react";
import { HandbagIcon } from "@phosphor-icons/react";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { loginPath } from "@/lib/auth/redirect";
import { EASE_OUT } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { useAuth } from "@/providers/auth-provider";
import { useCart } from "../queries";
import { unitCount } from "../lib/cart-math";
import { useBagDrawer } from "../store";
import { CartLine } from "./cart-line";
import { CartTotals, FreeShippingProgress } from "./cart-summary";

/** The header bag: a count that rolls when it changes, opening the drawer. */
export function BagButton() {
  // The shop layout seeds the cart, so the count renders on the server.
  const { data: cart } = useCart();
  const setOpen = useBagDrawer((s) => s.setOpen);
  const count = unitCount(cart);

  return (
    <Button
      variant="ghost"
      size="icon"
      className="relative"
      onClick={() => setOpen(true)}
      aria-label={count > 0 ? `Bag, ${count} items` : "Bag"}
    >
      <HandbagIcon weight="light" className="size-5" />
      <AnimatePresence initial={false}>
        {count > 0 && (
          <m.span
            key="badge"
            initial={{ scale: 0.4, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.4, opacity: 0 }}
            transition={{ duration: 0.3, ease: EASE_OUT }}
            className="absolute top-1 right-0.5 flex h-4 min-w-4 items-center justify-center overflow-hidden rounded-full bg-primary px-1 font-mono text-[0.625rem] leading-none text-primary-foreground tabular-nums"
            aria-hidden
          >
            <AnimatePresence mode="popLayout" initial={false}>
              <m.span
                key={count}
                initial={{ y: 8, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -8, opacity: 0 }}
                transition={{ duration: 0.3, ease: EASE_OUT }}
              >
                {count > 99 ? "99+" : count}
              </m.span>
            </AnimatePresence>
          </m.span>
        )}
      </AnimatePresence>
    </Button>
  );
}

/** The bag as a side sheet; add-to-bag and the header button open it. */
export function BagDrawer() {
  const open = useBagDrawer((s) => s.open);
  const setOpen = useBagDrawer((s) => s.setOpen);
  const close = () => setOpen(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent side="right" className="w-full gap-0 p-0 sm:max-w-md">
        <BagContents close={close} />
      </SheetContent>
    </Sheet>
  );
}

function BagContents({ close }: { close: () => void }) {
  const user = useAuth((s) => s.user);
  const pathname = usePathname();
  const { data: cart, isPending, isError, refetch } = useCart();
  const lines = cart?.items ?? [];

  const header = (
    <SheetHeader className="flex-row items-baseline gap-2 border-b border-border px-5 py-5">
      <SheetTitle className="font-serif text-2xl font-normal">
        Your bag
      </SheetTitle>
      {lines.length > 0 && (
        <span className="text-xs text-muted-foreground tabular-nums">
          {unitCount(cart)} {unitCount(cart) === 1 ? "item" : "items"}
        </span>
      )}
    </SheetHeader>
  );

  if (!user) {
    return (
      <>
        {header}
        <EmptyBag
          title="Sign in to start a bag."
          body="Your bag is saved to your account, so it follows you between devices."
          action={
            <Link
              href={loginPath(pathname)}
              onClick={close}
              className={buttonVariants()}
            >
              Sign in
            </Link>
          }
        />
      </>
    );
  }

  if (isPending) {
    return (
      <>
        {header}
        <div className="space-y-6 px-5 py-6">
          {[0, 1].map((i) => (
            <div key={i} className="grid grid-cols-[5rem_1fr] gap-4">
              <Skeleton className="aspect-[4/5]" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/3" />
              </div>
            </div>
          ))}
        </div>
      </>
    );
  }

  if (isError && !cart) {
    return (
      <>
        {header}
        <EmptyBag
          title="We couldn't load your bag."
          action={
            <Button variant="outline" onClick={() => void refetch()}>
              Try again
            </Button>
          }
        />
      </>
    );
  }

  if (lines.length === 0) {
    return (
      <>
        {header}
        <EmptyBag
          title="Your bag is empty."
          body="Pieces you add will wait here for you."
          action={
            <Link href="/shop" onClick={close} className={buttonVariants()}>
              Start shopping
            </Link>
          }
        />
      </>
    );
  }

  return (
    <>
      {header}
      <ul className="flex-1 divide-y divide-border overflow-y-auto overscroll-contain px-5">
        {lines.map((line) => (
          <CartLine key={line.variant_id} line={line} onNavigate={close} />
        ))}
      </ul>
      <SheetFooter className="gap-5 border-t border-border bg-background p-5">
        <FreeShippingProgress subtotal={cart!.subtotal} />
        <CartTotals cart={cart!} />
        {cart!.has_issues && (
          <p className="text-xs text-clay">
            Some items need your attention before checkout.
          </p>
        )}
        <Link
          href="/cart"
          onClick={close}
          className={cn(buttonVariants({ size: "lg" }), "w-full")}
        >
          View bag
        </Link>
      </SheetFooter>
    </>
  );
}

function EmptyBag({
  title,
  body,
  action,
}: {
  title: string;
  body?: string;
  action: React.ReactNode;
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 px-8 text-center">
      <HandbagIcon weight="thin" className="size-12 text-muted-foreground" />
      <p className="display text-3xl">{title}</p>
      {body && <p className="text-sm text-muted-foreground">{body}</p>}
      <div className="pt-2">{action}</div>
    </div>
  );
}
