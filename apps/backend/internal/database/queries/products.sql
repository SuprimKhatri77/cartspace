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
  SELECT 1 FROM categories WHERE slug = $1
) AS exists;

-- name: GetProductWithDefaultVariantBySlug :one
SELECT 
    p.*,
    pv.id AS variant_id,
    pv.sku,
    pv.stock,
    pv.images AS variant_images,
    pv.image_public_ids AS variant_image_public_ids,
    pv.selling_price,
    pv.offer_price
FROM products p
JOIN product_variants pv ON pv.product_id = p.id AND pv.is_default = TRUE
WHERE p.slug = $1 AND p.is_active = TRUE;

-- name: ListActiveProducts :many
SELECT p.*, pv.selling_price, pv.offer_price
FROM products p
JOIN product_variants pv ON pv.product_id = p.id AND pv.is_default = TRUE
WHERE p.is_active = TRUE
ORDER BY p.created_at DESC
LIMIT $1 OFFSET $2;

-- name: ListProductsByCategory :many
SELECT p.*, pv.selling_price, pv.offer_price
FROM products p
JOIN product_variants pv ON pv.product_id = p.id AND pv.is_default = TRUE
JOIN categories c ON c.id = p.category_id
WHERE p.is_active = TRUE AND c.slug = $1
ORDER BY p.created_at DESC
LIMIT $2 OFFSET $3;

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
SELECT COUNT(*) FROM categories;


-- name: AdminProductsList :many
SELECT 
    p.*,
    c.name AS category_name
FROM products p
LEFT JOIN categories c ON p.category_id = c.id
ORDER BY p.created_at DESC 
LIMIT $1 OFFSET $2;