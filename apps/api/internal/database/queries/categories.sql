-- name: CreateCategory :one
INSERT INTO categories (name, slug)
VALUES ($1, $2)
RETURNING *;

-- name: CreateSubCategory :one
INSERT INTO categories (name, slug, parent_id)
VALUES ($1, $2, $3)
RETURNING *;

-- name: GetAllCategories :many
SELECT * FROM categories ORDER BY created_at DESC;

-- name: GetCategoryByID :one
SELECT * FROM categories WHERE id = $1;

-- name: GetCategoryBySlug :one
SELECT * FROM categories WHERE slug = $1;

-- name: GetRootCategories :many
SELECT * FROM categories WHERE parent_id IS NULL ORDER BY name;

-- name: GetChildCategories :many
SELECT * FROM categories WHERE parent_id = $1 ORDER BY name;

-- name: GetCategoryTree :many
WITH RECURSIVE category_tree AS (
  SELECT 
    id,
    name,
    slug,
    parent_id,
    created_at,
    updated_at,
    0 AS depth
  FROM categories
  WHERE parent_id IS NULL

  UNION ALL

  SELECT 
    c.id,
    c.name,
    c.slug,
    c.parent_id,
    c.created_at,
    c.updated_at,
    ct.depth + 1
  FROM categories c
  JOIN category_tree ct ON c.parent_id = ct.id
)
SELECT * FROM category_tree ORDER BY depth, name;

-- name: GetCategoryAncestors :many
WITH RECURSIVE ancestors AS (
  SELECT
    c.id,
    c.name,
    c.slug,
    c.parent_id,
    c.created_at,
    c.updated_at
  FROM categories c
  WHERE c.id = $1

  UNION ALL

  SELECT
    c.id,
    c.name,
    c.slug,
    c.parent_id,
    c.created_at,
    c.updated_at
  FROM categories c
  JOIN ancestors a ON c.id = a.parent_id
)
SELECT * FROM ancestors ORDER BY created_at;

-- name: UpdateCategory :one
UPDATE categories 
SET name = $1, slug = $2, parent_id = $3
WHERE id = $4 
RETURNING *;

-- name: DeleteCategory :execresult
DELETE FROM categories WHERE id = $1;

-- name: CategorySlugExists :one
SELECT EXISTS (
  SELECT 1 FROM categories WHERE slug = $1
) AS exists;


-- name: GetPaginatedCategories :many
SELECT * FROM categories ORDER BY created_at DESC LIMIT $1 OFFSET $2;


-- name: GetCategoriesCount :one
SELECT COUNT(*) FROM categories;