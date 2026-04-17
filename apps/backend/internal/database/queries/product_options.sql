-- name: CreateProductOption :one
INSERT INTO product_options (product_id, name)
VALUES ($1, $2)
RETURNING *;

-- name: GetProductOptionsByProduct :many
SELECT * FROM product_options
WHERE product_id = $1;

-- name: DeleteProductOption :exec
DELETE FROM product_options
WHERE id = $1;
