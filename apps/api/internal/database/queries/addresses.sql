-- name: ListAddresses :many
SELECT * FROM addresses
WHERE user_id = $1
ORDER BY created_at DESC, id DESC;

-- name: CountAddresses :one
SELECT COUNT(*) FROM addresses WHERE user_id = $1;

-- name: CreateAddress :one
INSERT INTO addresses (user_id, full_name, phone, line1, line2, city, region, postal_code, country)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
RETURNING *;

-- name: GetAddress :one
SELECT * FROM addresses WHERE id = $1 AND user_id = $2;

-- name: DeleteAddress :execrows
DELETE FROM addresses WHERE id = $1 AND user_id = $2;
