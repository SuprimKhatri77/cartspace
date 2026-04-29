-- name: CreateProductVariant :one
INSERT INTO product_variants (product_id, sku, stock, images, image_public_ids, selling_price, offer_price, is_default, is_active, option_combination_key)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
RETURNING *;

-- name: GetVariantsByProduct :many
SELECT * FROM product_variants
WHERE product_id = $1 AND is_active = TRUE
ORDER BY is_default DESC, created_at ASC;

-- name: GetVariantByID :one
SELECT * FROM product_variants
WHERE id = $1;

-- name: VariantSKUExists :one
SELECT EXISTS (
    SELECT 1 FROM product_variants WHERE sku = $1
) AS exists;

-- name: GetDefaultVariant :one
SELECT * FROM product_variants
WHERE product_id = $1 AND is_default = TRUE;

-- name: UpdateVariantStock :one
UPDATE product_variants SET stock = stock + @delta
WHERE id = @id
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
    is_active = $9,
    option_combination_key = $10
WHERE id = $1
RETURNING *;

-- name: DeleteVariant :execresult
DELETE FROM product_variants WHERE id = $1;

-- name: FetchExistingProductOptions :many
SELECT * FROM product_options
WHERE product_id = $1 AND name = ANY($2::text[]);

-- name: FetchExistingProductOptionValues :many
SELECT * FROM product_option_values
WHERE option_id = ANY($1::uuid[]) AND value = ANY($2::text[]);