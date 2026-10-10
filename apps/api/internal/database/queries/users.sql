-- name: CreateUser :one
INSERT INTO users (name, email, password_hash, role, image_url)
VALUES ($1, $2, $3, $4, $5)
RETURNING *;

-- name: GetUserByEmail :one
SELECT * FROM users WHERE email = $1;

-- name: GetUserByID :one
SELECT * FROM users WHERE id = $1;

-- name: UpdateUserImage :one
UPDATE users SET image_url = $2 WHERE id = $1
RETURNING *;