-- name: CreateCart :one
INSERT INTO carts (user_id)
VALUES ($1)
RETURNING *;

-- name: GetCartByUserID :one
SELECT * FROM carts
WHERE user_id = $1;

-- name: GetUserCart :many
SELECT
    c.id AS cart_id,
    ci.id AS cart_item_id,
    ci.variant_id,
    ci.quantity,
    ci.unit_price,
    p.name AS product_name,
    pv.selling_price,
    pv.stock,
    COALESCE(pv.images[1], '')::text AS image
-- inner joins: a cart with no items returns no rows (LEFT JOIN returned a
-- phantom all-NULL item for an emptied cart)
FROM carts c
JOIN cart_items ci ON ci.cart_id = c.id
JOIN product_variants pv ON pv.id = ci.variant_id
JOIN products p ON p.id = pv.product_id
WHERE c.user_id = $1
ORDER BY ci.created_at ASC;


