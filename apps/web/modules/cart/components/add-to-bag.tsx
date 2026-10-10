"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, m } from "motion/react";
import { CheckIcon } from "@phosphor-icons/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { loginPath } from "@/lib/auth/redirect";
import { EASE_OUT } from "@/lib/motion";
import { useAuth } from "@/providers/auth-provider";
import {
  cartErrorMessage,
  useCartMutations,
} from "../hooks/use-cart-mutations";
import { useBagDrawer } from "../store";

/** How long the button says "Added" before it resets. */
const ADDED_FOR = 1800;

/**
 * Adds one of the selected variant. The label rolls to "Added" and the bag
 * opens; signed-out shoppers go to sign in and come back to this variant.
 */
export function AddToBag({
  variantId,
  stock,
}: {
  variantId: string;
  stock: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const user = useAuth((s) => s.user);
  const openBag = useBagDrawer((s) => s.setOpen);
  const { add } = useCartMutations();
  const [added, setAdded] = useState(false);

  useEffect(() => {
    if (!added) return;
    const timer = setTimeout(() => setAdded(false), ADDED_FOR);
    return () => clearTimeout(timer);
  }, [added]);

  const soldOut = stock === 0;
  const label = soldOut
    ? "Sold out"
    : added
      ? "Added"
      : add.isPending
        ? "Adding…"
        : "Add to bag";

  function onClick() {
    if (!user) {
      // Back to this exact variant after signing in.
      router.push(loginPath(pathname + window.location.search));
      return;
    }
    add.mutate(
      { variant_id: variantId, quantity: 1 },
      {
        onSuccess: () => {
          setAdded(true);
          openBag(true);
        },
        onError: (error) => toast.error(cartErrorMessage(error)),
      },
    );
  }

  return (
    <Button
      size="lg"
      className="relative w-full min-w-0 shrink overflow-hidden"
      disabled={soldOut || add.isPending}
      onClick={onClick}
      aria-live="polite"
    >
      <AnimatePresence mode="popLayout" initial={false}>
        <m.span
          key={label}
          initial={{ y: 18, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -18, opacity: 0 }}
          transition={{ duration: 0.35, ease: EASE_OUT }}
          className="inline-flex items-center gap-2"
        >
          {added && <CheckIcon weight="bold" />}
          {label}
        </m.span>
      </AnimatePresence>
    </Button>
  );
}
