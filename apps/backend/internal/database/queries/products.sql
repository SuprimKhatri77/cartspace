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
SELECT p.*, pv.selling_price, pv.offer_price
FROM products p
JOIN product_variants pv ON pv.product_id = p.id AND pv.is_default = TRUE
WHERE p.is_active = TRUE
ORDER BY p.created_at DESC
LIMIT $1 OFFSET $2;

-- name: ListFeaturedProducts :many
SELECT p.*, pv.selling_price, pv.offer_price
FROM products p
JOIN product_variants pv ON pv.product_id = p.id AND pv.is_default = TRUE
WHERE p.is_active = TRUE AND p.is_featured = TRUE
ORDER BY p.created_at DESC;

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


-- name: AdminProductsList :many
SELECT 
    p.*,
    c.name AS category_name
FROM products p
LEFT JOIN categories c ON p.category_id = c.id
ORDER BY p.created_at DESC 
LIMIT $1 OFFSET $2;


-- name: GetCategoryFilterOptions :many
SELECT 
    po.name as option_name,
    pov.value as option_value
FROM product_options po
JOIN product_option_values pov ON pov.option_id = po.id
JOIN products p ON p.id = po.product_id
JOIN categories c ON p.category_id = c.id
WHERE c.slug = $1
AND p.is_active = TRUE
GROUP BY po.name, pov.value
ORDER BY po.name, pov.value;

-- name: GetMinMaxSellingPrice :one
SELECT MIN(selling_price)::int, MAX(selling_price)::int
FROM product_variants pv
JOIN products p ON p.id = pv.product_id
JOIN categories c ON p.category_id = c.id
WHERE c.slug = $1 AND p.is_active = TRUE;


-- name: ListProductsByCategory :many
SELECT p.*, pv.selling_price, pv.offer_price
FROM products p
JOIN product_variants pv ON pv.product_id = p.id AND pv.is_default = TRUE
JOIN categories c ON c.id = p.category_id
WHERE p.is_active = TRUE 
AND c.slug = $1
AND ($2::int = 0 OR pv.selling_price >= $2::int)
AND ($3::int = 0 OR pv.selling_price <= $3::int)
ORDER BY p.created_at DESC
LIMIT $4 OFFSET $5;


-- name: ListProductsByCategoryPriceAsc :many
SELECT p.*, pv.selling_price, pv.offer_price
FROM products p
JOIN product_variants pv ON pv.product_id = p.id AND pv.is_default = TRUE
JOIN categories c ON c.id = p.category_id
WHERE p.is_active = TRUE 
AND c.slug = $1
AND ($2::int = 0 OR pv.selling_price >= $2::int)
AND ($3::int = 0 OR pv.selling_price <= $3::int)
ORDER BY pv.selling_price ASC
LIMIT $4 OFFSET $5;


-- name: ListProductsByCategoryPriceDesc :many
SELECT p.*, pv.selling_price, pv.offer_price
FROM products p
JOIN product_variants pv ON pv.product_id = p.id AND pv.is_default = TRUE
JOIN categories c ON c.id = p.category_id
WHERE p.is_active = TRUE 
AND c.slug = $1
AND ($2::int = 0 OR pv.selling_price >= $2::int)
AND ($3::int = 0 OR pv.selling_price <= $3::int)
ORDER BY pv.selling_price DESC
LIMIT $4 OFFSET $5;


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
WHERE p.slug = $1
ORDER BY pv.is_default DESC;

-- name: GetProductWithDefaultVariantBySlug :one
SELECT 
    p.*,
    pv.id AS variant_id,
    pv.stock,
    pv.images AS variant_images,
    pv.selling_price,
    pv.offer_price
FROM products p
JOIN product_variants pv ON pv.product_id = p.id AND pv.is_default = TRUE
WHERE p.slug = $1 AND p.is_active = TRUE;


-- name: GetRelatedProducts :many
SELECT 
    p.*,
    pv.selling_price,
    pv.offer_price
FROM products p
JOIN categories c ON c.id = p.category_id
JOIN product_variants pv ON pv.product_id = p.id AND pv.is_default = TRUE
WHERE c.id = (SELECT pr.category_id FROM products pr WHERE pr.slug = $1)
AND p.slug != $1
AND p.is_active = TRUE
LIMIT 8;
