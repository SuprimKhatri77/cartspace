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
    pv.images[1] AS image
FROM carts c
LEFT JOIN cart_items ci ON ci.cart_id = c.id
LEFT JOIN product_variants pv ON pv.id = ci.variant_id
LEFT JOIN products p ON p.id = pv.product_id
WHERE c.user_id = $1;


