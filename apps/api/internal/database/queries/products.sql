-- name: CreateProduct :one
INSERT INTO products (name, slug, category_id, description, features, images, image_public_ids, is_active, is_featured)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
RETURNING *;

-- name: GetProductBySlug :one
SELECT * FROM products WHERE slug = $1;

-- name: GetProductByID :one
SELECT * FROM products WHERE id = $1;

-- name: ProductSlugExists :one
SELECT EXISTS (
  SELECT 1 FROM products WHERE slug = $1
) AS exists;

-- name: ListActiveProducts :many
-- A product is publicly visible when it and its default variant are active.
SELECT p.*, pv.selling_price, pv.offer_price
FROM products p
JOIN product_variants pv ON pv.product_id = p.id AND pv.is_default = TRUE AND pv.is_active = TRUE
WHERE p.is_active = TRUE
ORDER BY p.created_at DESC, p.id DESC
LIMIT $1 OFFSET $2;

-- name: ListFeaturedProducts :many
SELECT p.*, pv.selling_price, pv.offer_price
FROM products p
JOIN product_variants pv ON pv.product_id = p.id AND pv.is_default = TRUE AND pv.is_active = TRUE
WHERE p.is_active = TRUE AND p.is_featured = TRUE
ORDER BY p.created_at DESC, p.id DESC;

-- name: UpdateProduct :one
UPDATE products SET
    name = $2,
    slug = $3,
    description = $4,
    features = $5,
    images = $6,
    image_public_ids = $7,
    is_active = $8,
    is_featured = $9,
    category_id = $10
WHERE id = $1
RETURNING *;

-- name: DeleteProduct :execresult
DELETE FROM products WHERE id = $1;

-- name: GetProductsCount :one
SELECT COUNT(*) FROM products;

-- name: CountActiveProducts :one
-- must match the joins and filters of ListActiveProducts
SELECT COUNT(*)
FROM products p
JOIN product_variants pv ON pv.product_id = p.id AND pv.is_default = TRUE AND pv.is_active = TRUE
WHERE p.is_active = TRUE;

-- name: CountProductsByCategory :one
-- must match the joins and filters of ListProductsByCategory
SELECT COUNT(*)
FROM products p
JOIN product_variants pv ON pv.product_id = p.id AND pv.is_default = TRUE AND pv.is_active = TRUE
JOIN categories c ON c.id = p.category_id
WHERE p.is_active = TRUE
AND c.slug = sqlc.arg(slug)
AND (sqlc.arg(price_min)::int = 0 OR pv.selling_price >= sqlc.arg(price_min)::int)
AND (sqlc.arg(price_max)::int = 0 OR pv.selling_price <= sqlc.arg(price_max)::int);


-- name: AdminProductsList :many
SELECT 
    p.*,
    c.name AS category_name
FROM products p
LEFT JOIN categories c ON p.category_id = c.id
ORDER BY p.created_at DESC, p.id DESC
LIMIT $1 OFFSET $2;


-- name: GetCategoryFilterOptions :many
-- Option values of the active variants of visible products only.
SELECT
    po.name as option_name,
    pov.value as option_value
FROM product_options po
JOIN product_option_values pov ON pov.option_id = po.id
JOIN variant_option_values vov ON vov.option_value_id = pov.id
JOIN product_variants v ON v.id = vov.variant_id AND v.is_active = TRUE
JOIN products p ON p.id = po.product_id
JOIN product_variants dv ON dv.product_id = p.id AND dv.is_default = TRUE AND dv.is_active = TRUE
JOIN categories c ON p.category_id = c.id
WHERE c.slug = $1
AND p.is_active = TRUE
GROUP BY po.name, pov.value
ORDER BY po.name, pov.value;

-- name: GetMinMaxSellingPrice :one
-- Over the same default-variant prices that price_min/price_max filter on.
-- COALESCE: MIN/MAX are NULL when the category has no visible products.
SELECT COALESCE(MIN(pv.selling_price), 0)::int AS min_price, COALESCE(MAX(pv.selling_price), 0)::int AS max_price
FROM product_variants pv
JOIN products p ON p.id = pv.product_id
JOIN categories c ON p.category_id = c.id
WHERE c.slug = $1 AND p.is_active = TRUE AND pv.is_default = TRUE AND pv.is_active = TRUE;


-- name: ListProductsByCategory :many
SELECT p.*, pv.selling_price, pv.offer_price
FROM products p
JOIN product_variants pv ON pv.product_id = p.id AND pv.is_default = TRUE AND pv.is_active = TRUE
JOIN categories c ON c.id = p.category_id
WHERE p.is_active = TRUE
AND c.slug = sqlc.arg(slug)
AND (sqlc.arg(price_min)::int = 0 OR pv.selling_price >= sqlc.arg(price_min)::int)
AND (sqlc.arg(price_max)::int = 0 OR pv.selling_price <= sqlc.arg(price_max)::int)
ORDER BY
    CASE WHEN sqlc.arg(sort)::text = 'price_asc' THEN pv.selling_price END ASC,
    CASE WHEN sqlc.arg(sort)::text = 'price_desc' THEN pv.selling_price END DESC,
    p.created_at DESC,
    p.id DESC
LIMIT sqlc.arg(page_limit) OFFSET sqlc.arg(page_offset);


-- name: GetVariantsByProductSlug :many
SELECT 
    pv.*,
    (
        SELECT COALESCE(
            json_agg(
                jsonb_build_object('name', po.name, 'value', pov.value)
            ),
            '[]'::json
        )
        FROM variant_option_values vov
        JOIN product_option_values pov ON pov.id = vov.option_value_id
        JOIN product_options po ON po.id = pov.option_id
        WHERE vov.variant_id = pv.id
    ) AS options
FROM product_variants pv
JOIN products p ON p.id = pv.product_id
WHERE p.slug = $1 AND p.is_active = TRUE AND pv.is_active = TRUE
ORDER BY pv.is_default DESC, pv.created_at ASC, pv.id ASC;

-- name: GetProductWithDefaultVariantBySlug :one
SELECT 
    p.*,
    pv.id AS variant_id,
    pv.stock,
    pv.images AS variant_images,
    pv.selling_price,
    pv.offer_price
FROM products p
JOIN product_variants pv ON pv.product_id = p.id AND pv.is_default = TRUE AND pv.is_active = TRUE
WHERE p.slug = $1 AND p.is_active = TRUE;


-- name: GetRelatedProducts :many
SELECT 
    p.*,
    pv.selling_price,
    pv.offer_price
FROM products p
JOIN categories c ON c.id = p.category_id
JOIN product_variants pv ON pv.product_id = p.id AND pv.is_default = TRUE AND pv.is_active = TRUE
WHERE c.id = (SELECT pr.category_id FROM products pr WHERE pr.slug = $1)
AND p.slug != $1
AND p.is_active = TRUE
ORDER BY p.created_at DESC, p.id DESC
LIMIT 8;
