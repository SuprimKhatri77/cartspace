-- name: CreateProductVariant :one
INSERT INTO product_variants (product_id, sku, stock, images, image_public_ids, selling_price, offer_price, is_default)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
RETURNING *;

-- name: GetVariantsByProduct :many
SELECT * FROM product_variants
WHERE product_id = $1 AND is_active = TRUE
ORDER BY is_default DESC, created_at ASC;

-- name: GetVariantByID :one
SELECT * FROM product_variants
WHERE id = $1;

-- name: GetDefaultVariant :one
SELECT * FROM product_variants
WHERE product_id = $1 AND is_default = TRUE;

-- name: UpdateVariantStock :one
UPDATE product_variants SET stock = $2
WHERE id = $1
RETURNING *;

-- name: UpdateVariant :one
UPDATE product_variants SET
    sku = $2,
    stock = $3,
    images = $4,
    image_public_ids = $5,
    selling_price = $6,
    offer_price = $7,
    is_default = $8,
    is_active = $9
WHERE id = $1
RETURNING *;

-- name: DeleteVariant :exec
DELETE FROM product_variants WHERE id = $1;