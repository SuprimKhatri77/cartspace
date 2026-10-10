"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { Cart, CartLine } from "@repo/types";
import { addCartItem, removeCartItem, updateCartItem } from "@/lib/api/client";
import { getApiError } from "@/lib/api/errors";
import { useAuth } from "@/providers/auth-provider";
import { cartKeys } from "../keys";
import { removeLine, setLineQuantity } from "../lib/cart-math";

const mutationKey = [...cartKeys.all, "write"] as const;

/** The API's message for a refused cart write, else a generic one. */
export function cartErrorMessage(error: unknown): string {
  return getApiError(error)?.message ?? "Couldn't update your bag. Try again.";
}

/**
 * Cart writes. Each answers with the whole cart, which replaces the cached
 * one, but only when no other cart write is still in flight: answers can
 * arrive out of order, and the last write's answer is the truth. Quantity
 * changes and removals show at once and roll back if the API refuses.
 */
export function useCartMutations() {
  const queryClient = useQueryClient();
  const userId = useAuth((s) => s.user?.id ?? "");
  const key = cartKeys.mine(userId);

  function settle(cart: Cart) {
    // This mutation still counts as in flight while its callbacks run.
    if (queryClient.isMutating({ mutationKey }) <= 1) {
      queryClient.setQueryData(key, cart);
    }
  }

  async function optimistic(update: (cart: Cart) => Cart) {
    await queryClient.cancelQueries({ queryKey: key });
    const previous = queryClient.getQueryData<Cart>(key);
    if (previous) queryClient.setQueryData(key, update(previous));
    return { previous };
  }

  function rollback(error: unknown, context?: { previous?: Cart }) {
    if (context?.previous) queryClient.setQueryData(key, context.previous);
    toast.error(cartErrorMessage(error));
  }

  const add = useMutation({
    mutationKey,
    mutationFn: async (body: { variant_id: string; quantity: number }) => {
      const { data } = await addCartItem({ body, throwOnError: true });
      return data.data;
    },
    onSuccess: settle,
    // The caller reports errors where the shopper clicked.
  });

  const update = useMutation({
    mutationKey,
    mutationFn: async (vars: { variantId: string; quantity: number }) => {
      const { data } = await updateCartItem({
        path: { variantID: vars.variantId },
        body: { quantity: vars.quantity },
        throwOnError: true,
      });
      return data.data;
    },
    onMutate: ({ variantId, quantity }) =>
      optimistic((cart) => setLineQuantity(cart, variantId, quantity)),
    onError: (error, _vars, context) => rollback(error, context),
    onSuccess: settle,
  });

  const remove = useMutation({
    mutationKey,
    mutationFn: async (line: CartLine) => {
      const { data } = await removeCartItem({
        path: { variantID: line.variant_id },
        throwOnError: true,
      });
      return data.data;
    },
    onMutate: (line) => optimistic((cart) => removeLine(cart, line.variant_id)),
    onError: (error, _line, context) => rollback(error, context),
    onSuccess: (cart, line) => {
      settle(cart);
      toast(`Removed ${line.product_name}`, {
        action: {
          label: "Undo",
          onClick: () =>
            add.mutate(
              { variant_id: line.variant_id, quantity: line.quantity },
              { onError: (error) => toast.error(cartErrorMessage(error)) },
            ),
        },
      });
    },
  });

  return { add, update, remove };
}
