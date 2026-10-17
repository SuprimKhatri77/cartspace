// Display copy of the shipping rule. The API decides what an order is
// charged (from the checkout PR on); keep these in step with it.
export const FREE_SHIPPING_FROM = 15_000;
export const FLAT_SHIPPING = 800;

/** Shipping for a subtotal in cents. */
export function shippingFor(subtotal: number): number {
  return subtotal === 0 || subtotal >= FREE_SHIPPING_FROM ? 0 : FLAT_SHIPPING;
}

/**
 * Shipping once a discount comes off a non-empty bag: the free-shipping line
 * goes by what the items cost after it, and a bag discounted to nothing
 * still pays the flat rate (the API's constants.ShippingFor).
 */
export function shippingAfterDiscount(
  subtotal: number,
  discount: number,
): number {
  if (subtotal === 0) return 0;
  return subtotal - discount >= FREE_SHIPPING_FROM ? 0 : FLAT_SHIPPING;
}
