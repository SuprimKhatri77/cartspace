-- name: AddCartItem :one
INSERT INTO cart_items (cart_id, variant_id, quantity, unit_price)
VALUES ($1, $2, $3, $4)
ON CONFLICT (cart_id, variant_id)
DO UPDATE SET
    quantity = cart_items.quantity + EXCLUDED.quantity,
    unit_price = EXCLUDED.unit_price,
    updated_at = now()
RETURNING *;

-- name: GetCartItems :many
SELECT * FROM cart_items
WHERE cart_id = $1;

-- name: UpdateCartItemQuantity :one
UPDATE cart_items
SET quantity = $1, updated_at = now()
FROM carts
WHERE cart_items.cart_id = carts.id
AND carts.user_id = $2
AND cart_items.cart_id = $3
AND cart_items.variant_id = $4
RETURNING cart_items.*;

-- name: DeleteCartItem :execrows
DELETE FROM cart_items
USING carts
WHERE cart_items.cart_id = carts.id
AND carts.user_id = $1
AND cart_items.cart_id = $2
AND cart_items.variant_id = $3;

-- name: ClearCart :execrows
DELETE FROM cart_items
USING carts
WHERE cart_items.cart_id = carts.id
AND cart_items.cart_id = $1
AND carts.user_id = $2;

