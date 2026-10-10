-- name: CreateProductVariant :one
INSERT INTO product_variants (product_id, sku, stock, images, image_public_ids, selling_price, offer_price, is_default, is_active, option_combination_key)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
RETURNING *;

-- name: GetVariantsByProduct :many
SELECT * FROM product_variants
WHERE product_id = $1 AND is_active = TRUE
ORDER BY is_default DESC, created_at ASC;

-- name: GetProductVariant :one
-- Admin routes address a variant through its product, so a variant id from
-- another product is not found.
SELECT * FROM product_variants
WHERE id = @id AND product_id = @product_id;

-- name: VariantSKUExists :one
SELECT EXISTS (
    SELECT 1 FROM product_variants WHERE sku = $1
) AS exists;

-- name: GetDefaultVariant :one
SELECT * FROM product_variants
WHERE product_id = $1 AND is_default = TRUE;

-- name: SetVariantStock :one
-- Admin stock count: an absolute value, for a variant of the given product.
UPDATE product_variants SET stock = @stock
WHERE id = @id AND product_id = @product_id
RETURNING *;

-- name: UpdateVariant :one
-- sku and option_combination_key are set at creation and never change here.
UPDATE product_variants SET
    stock = @stock,
    images = @images,
    image_public_ids = @image_public_ids,
    selling_price = @selling_price,
    offer_price = @offer_price,
    is_default = @is_default,
    is_active = @is_active
WHERE id = @id AND product_id = @product_id
RETURNING *;

-- name: DeleteVariant :execresult
DELETE FROM product_variants WHERE id = @id AND product_id = @product_id;
