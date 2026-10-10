import { z } from "zod";
import { Uuid } from "@repo/types";
import { schemas } from "../schemas.ts";
import { body, operation } from "./shared.ts";

const tag = "Cart";

export function registerCartPaths() {
  operation({
    method: "get",
    path: "/api/v1/carts",
    operationId: "getCart",
    tag,
    summary: "Get my cart",
    description:
      "The items in the user's cart, oldest first; empty when there is no cart yet.",
    auth: "user",
    success: {
      status: 200,
      description: "Cart fetched",
      schema: schemas.CartResponseSchema,
    },
  });

  operation({
    method: "post",
    path: "/api/v1/carts",
    operationId: "addToCart",
    tag,
    summary: "Add an item to my cart",
    description:
      "Creates the cart on first use. Adding a variant that is already in the cart increases its quantity.",
    auth: "user",
    request: body(schemas.AddToCartBodySchema),
    success: {
      status: 201,
      description: "Item added to cart",
      schema: schemas.CartItemResponseSchema,
    },
    errors: {
      400: "Invalid body or not enough stock (VALIDATION_FAILED, INSUFFICIENT_STOCK)",
      404: "Variant or cart not found (VARIANT_NOT_FOUND, CART_NOT_FOUND)",
    },
  });

  operation({
    method: "delete",
    path: "/api/v1/carts/{cartID}",
    operationId: "clearCart",
    tag,
    summary: "Clear my cart",
    description: "Removes every item; the cart itself stays.",
    auth: "user",
    request: { params: z.object({ cartID: Uuid }) },
    success: {
      status: 200,
      description: "Cart cleared",
      schema: schemas.MessageResponseSchema,
    },
    errors: {
      400: "Invalid cart id (INVALID_CART_ID)",
      404: "The cart is empty or not yours (CART_ITEM_NOT_FOUND)",
    },
  });

  operation({
    method: "patch",
    path: "/api/v1/carts/{cartID}/{variantID}",
    operationId: "updateCartItem",
    tag,
    summary: "Change an item's quantity",
    description: "Quantity 0 removes the item.",
    auth: "user",
    request: {
      params: z.object({ cartID: Uuid, variantID: Uuid }),
      ...body(schemas.UpdateCartItemBodySchema),
    },
    success: {
      status: 200,
      description: "Cart item updated or removed",
      schema: schemas.MessageResponseSchema,
    },
    errors: {
      400: "Invalid ids or body, or not enough stock (INVALID_CART_ID, INVALID_VARIANT_ID, VALIDATION_FAILED, INSUFFICIENT_STOCK)",
      404: "Variant or cart item not found (VARIANT_NOT_FOUND, CART_ITEM_NOT_FOUND)",
    },
  });
}
