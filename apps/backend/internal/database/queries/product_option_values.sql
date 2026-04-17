-- name: CreateProductOptionValue :one
INSERT INTO product_option_values (option_id, value)
VALUES ($1, $2)
RETURNING *;

-- name: GetOptionValuesByOption :many
SELECT * FROM product_option_values
WHERE option_id = $1;

-- name: GetOptionValueByID :one
SELECT * FROM product_option_values
WHERE id = $1;

-- name: DeleteProductOptionValue :exec
DELETE FROM product_option_values
WHERE id = $1;