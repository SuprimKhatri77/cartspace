import { z } from "zod";
import { Cents, successResponse, Timestamp, Uuid } from "../api/response";

export const CartLineSchema = z
  .object({
    cart_id: Uuid,
    cart_item_id: Uuid,
    variant_id: Uuid,
    quantity: z.int().positive(),
    unit_price: Cents.describe("Price per unit when the item was added"),
    product_name: z.string(),
    selling_price: Cents,
    stock: z.int().nonnegative(),
    image: z.string().describe('The variant\'s first image, "" if it has none'),
  })
  .meta({ id: "CartLine", description: "One line of the cart (GET /carts)." });
export type CartLine = z.infer<typeof CartLineSchema>;

export const CartItemSchema = z
  .object({
    id: Uuid,
    cart_id: Uuid,
    variant_id: Uuid,
    quantity: z.int().positive(),
    unit_price: Cents,
    created_at: Timestamp,
    updated_at: Timestamp,
  })
  .meta({ id: "CartItem" });
export type CartItem = z.infer<typeof CartItemSchema>;

// Mirrors apps/api/internal/types/cart.go (reworked in phase 6).
export const AddToCartBodySchema = z
  .object({
    variant_id: Uuid,
    quantity: z
      .int()
      .min(1)
      .max(1)
      .describe("Adding a variant already in the cart increases its quantity."),
  })
  .meta({
    id: "AddToCartBody",
    description: "Adding a variant already in the cart increases its quantity.",
  });
export type AddToCartBody = z.infer<typeof AddToCartBodySchema>;

export const UpdateCartItemBodySchema = z
  .object({
    quantity: z.int().min(0).max(50).describe("0 removes the item"),
  })
  .meta({ id: "UpdateCartItemBody" });
export type UpdateCartItemBody = z.infer<typeof UpdateCartItemBodySchema>;

export const CartResponseSchema = successResponse(z.array(CartLineSchema)).meta(
  { id: "CartResponse" },
);
export type CartResponse = z.infer<typeof CartResponseSchema>;

export const CartItemResponseSchema = successResponse(CartItemSchema).meta({
  id: "CartItemResponse",
});
export type CartItemResponse = z.infer<typeof CartItemResponseSchema>;
