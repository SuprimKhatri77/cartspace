-- Admin discount codes, read from discount_code_states (uses and state).

-- name: CountAdminDiscounts :one
SELECT COUNT(*) FROM discount_code_states d
WHERE (sqlc.narg(state)::text IS NULL OR d.state = sqlc.narg(state)::text)
  AND (sqlc.narg(code_pattern)::text IS NULL OR d.code ILIKE sqlc.narg(code_pattern)::text);

-- name: AdminListDiscounts :many
SELECT * FROM discount_code_states d
WHERE (sqlc.narg(state)::text IS NULL OR d.state = sqlc.narg(state)::text)
  AND (sqlc.narg(code_pattern)::text IS NULL OR d.code ILIKE sqlc.narg(code_pattern)::text)
ORDER BY d.created_at DESC, d.id DESC
LIMIT @page_limit OFFSET @page_offset;

-- name: AdminGetDiscount :one
SELECT * FROM discount_code_states WHERE id = $1;

-- name: CreateDiscount :one
INSERT INTO discount_codes (
    code, kind, value, min_subtotal, starts_at, ends_at,
    max_redemptions, once_per_customer, is_active
) VALUES (
    @code, @kind, @value, @min_subtotal, sqlc.narg(starts_at), sqlc.narg(ends_at),
    sqlc.narg(max_redemptions), @once_per_customer, @is_active
)
RETURNING id;

-- name: UpdateDiscount :execrows
UPDATE discount_codes SET
    code = @code, kind = @kind, value = @value, min_subtotal = @min_subtotal,
    starts_at = sqlc.narg(starts_at), ends_at = sqlc.narg(ends_at),
    max_redemptions = sqlc.narg(max_redemptions),
    once_per_customer = @once_per_customer, is_active = @is_active
WHERE id = @id;

-- name: DeleteDiscount :execrows
DELETE FROM discount_codes WHERE id = $1;
