-- Admin dashboard. "Sales" are orders that were paid (paid, shipped or
-- delivered); abandoned checkouts and cancellations don't count.

-- name: AdminSalesTotals :one
SELECT
    COALESCE(SUM(total), 0)::bigint AS revenue,
    COUNT(*)::bigint AS orders
FROM orders
WHERE status IN ('paid', 'shipped', 'delivered');

-- name: AdminCustomerCount :one
SELECT COUNT(*) FROM users WHERE role = 'customer';

-- name: AdminSalesByDay :many
-- The last 30 days (UTC), every day present, oldest first.
SELECT
    d.day::date AS day,
    COALESCE(SUM(o.total), 0)::bigint AS revenue,
    COUNT(o.id)::int AS orders
FROM generate_series(
    (now() AT TIME ZONE 'UTC')::date - 29,
    (now() AT TIME ZONE 'UTC')::date,
    interval '1 day'
) AS d(day)
LEFT JOIN orders o
    ON (o.paid_at AT TIME ZONE 'UTC')::date = d.day::date
    AND o.status IN ('paid', 'shipped', 'delivered')
GROUP BY d.day
ORDER BY d.day;

-- name: AdminLowStock :many
SELECT
    p.id AS product_id,
    p.name AS product_name,
    pv.id AS variant_id,
    pv.sku,
    pv.stock
FROM product_variants pv
JOIN products p ON p.id = pv.product_id
WHERE pv.is_active AND p.is_active AND pv.stock <= @threshold::int
ORDER BY pv.stock, p.name, pv.id
LIMIT 10;

-- name: AdminRecentOrders :many
SELECT id, number, status, total, currency, email, created_at, paid_at
FROM orders
WHERE status IN ('paid', 'shipped', 'delivered', 'refunded')
ORDER BY created_at DESC, id DESC
LIMIT 5;

-- name: AdminListVariants :many
-- Every variant of a product, inactive ones too, with its options.
SELECT
    pv.*,
    (
        SELECT COALESCE(
            json_agg(
                jsonb_build_object('name', po.name, 'value', pov.value, 'type', po.type)
                ORDER BY po.name
            ),
            '[]'::json
        )
        FROM variant_option_values vov
        JOIN product_option_values pov ON pov.id = vov.option_value_id
        JOIN product_options po ON po.id = pov.option_id
        WHERE vov.variant_id = pv.id
    ) AS options
FROM product_variants pv
WHERE pv.product_id = $1
ORDER BY pv.is_default DESC, pv.created_at, pv.id;

-- name: ListProductImages :many
-- The Cloudinary ids of a product's and its variants' images (for
-- cleaning up after a delete).
SELECT unnest(p.images)::text AS url, unnest(p.image_public_ids)::text AS public_id
FROM products p WHERE p.id = $1
UNION ALL
SELECT unnest(v.images)::text, unnest(v.image_public_ids)::text
FROM product_variants v WHERE v.product_id = $1;
