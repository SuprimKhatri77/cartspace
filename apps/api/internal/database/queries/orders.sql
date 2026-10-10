-- name: LockVariants :many
-- Locks the variants an order takes stock from, in id order so two
-- checkouts sharing variants can't deadlock. available is whether each is
-- still on sale.
SELECT
    pv.id,
    pv.stock,
    EXISTS (SELECT 1 FROM storefront_variants sv WHERE sv.id = pv.id) AS available
FROM product_variants pv
WHERE pv.id = ANY(@ids::uuid[])
ORDER BY pv.id
FOR UPDATE OF pv;

-- name: TakeStock :exec
-- Reserves stock for an order; the caller checked it under LockVariants.
UPDATE product_variants pv
SET stock = pv.stock - x.quantity
-- two unnests in one select list pair up element by element
FROM (SELECT unnest(@ids::uuid[]) AS id, unnest(@quantities::int[]) AS quantity) AS x
WHERE pv.id = x.id;

-- name: RetakeStock :many
-- Takes stock again for an order paid after it was released (stock can't
-- go below 0, so a shortfall means oversold units; returns the variants
-- that came up short).
WITH want AS (
    SELECT oi.variant_id, oi.quantity
    FROM order_items oi
    WHERE oi.order_id = @order_id AND oi.variant_id IS NOT NULL
),
taken AS (
    -- the self-join reads the stock as it was before this update
    UPDATE product_variants pv
    SET stock = GREATEST(pv.stock - w.quantity, 0)
    FROM want w, product_variants before
    WHERE pv.id = w.variant_id AND before.id = pv.id
    RETURNING pv.id, before.stock < w.quantity AS short
)
SELECT id FROM taken WHERE short;

-- name: RestoreStock :exec
-- Returns a released order's stock (variants deleted since are skipped).
UPDATE product_variants pv
SET stock = pv.stock + oi.quantity
FROM order_items oi
WHERE oi.order_id = $1 AND pv.id = oi.variant_id;

-- name: CreateOrder :one
INSERT INTO orders (user_id, subtotal, shipping, total, currency, email, shipping_address, expires_at)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
RETURNING *;

-- name: CreateOrderItem :exec
INSERT INTO order_items (
    order_id, variant_id, product_id, product_name, product_slug, sku,
    options, image, unit_price, quantity, line_total
)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11);

-- name: SetOrderSession :exec
UPDATE orders SET stripe_session_id = $2 WHERE id = $1;

-- name: GetOrderForUpdate :one
SELECT * FROM orders WHERE id = $1 FOR UPDATE;

-- name: CancelPendingOrder :execrows
-- Only a pending order is cancelled (and then has its stock returned).
UPDATE orders
SET status = 'cancelled', cancelled_at = now()
WHERE id = $1 AND status = 'pending';

-- name: MarkOrderPaid :exec
UPDATE orders
SET status = 'paid', paid_at = now(), cancelled_at = NULL
WHERE id = $1;

-- name: ListPendingOrdersForUser :many
SELECT id, stripe_session_id FROM orders
WHERE user_id = $1 AND status = 'pending';

-- name: ListExpiredPendingOrders :many
-- Pending orders whose reservation ran out, skipping rows another
-- transaction is working on.
SELECT id, stripe_session_id FROM orders
WHERE status = 'pending' AND expires_at < @before
ORDER BY expires_at
LIMIT 100
FOR UPDATE SKIP LOCKED;

-- name: CreatePayment :exec
INSERT INTO payments (order_id, stripe_session_id, stripe_payment_intent_id, amount, currency)
VALUES ($1, $2, $3, $4, $5)
ON CONFLICT DO NOTHING;

-- name: RemoveOrderedCartLines :exec
-- After payment, the bought variants leave the buyer's cart (anything
-- added since stays).
DELETE FROM cart_items ci
USING carts c, order_items oi
WHERE ci.cart_id = c.id
AND c.user_id = @user_id
AND oi.order_id = @order_id
AND ci.variant_id = oi.variant_id;

-- name: RecordStripeEvent :execrows
INSERT INTO stripe_events (id, type) VALUES ($1, $2)
ON CONFLICT (id) DO NOTHING;

-- name: GetOrderBySession :one
SELECT * FROM orders WHERE stripe_session_id = $1 AND user_id = $2;

-- name: GetOrderByNumber :one
SELECT * FROM orders WHERE number = $1 AND user_id = $2;

-- name: GetOrderItems :many
SELECT * FROM order_items WHERE order_id = $1 ORDER BY product_name, id;

-- name: CountOrders :one
-- Orders the customer placed, not abandoned checkouts.
SELECT COUNT(*) FROM orders
WHERE user_id = $1 AND status <> 'pending' AND NOT (status = 'cancelled' AND paid_at IS NULL);

-- name: ListOrders :many
SELECT
    o.id, o.number, o.status, o.total, o.currency, o.created_at, o.paid_at,
    (SELECT COALESCE(SUM(oi.quantity), 0) FROM order_items oi WHERE oi.order_id = o.id)::int AS item_count,
    ARRAY(
        SELECT oi.image FROM order_items oi
        WHERE oi.order_id = o.id AND oi.image <> ''
        ORDER BY oi.line_total DESC, oi.id
        LIMIT 3
    )::text[] AS preview_images
FROM orders o
WHERE o.user_id = $1 AND o.status <> 'pending' AND NOT (o.status = 'cancelled' AND o.paid_at IS NULL)
ORDER BY o.created_at DESC, o.id DESC
LIMIT $2 OFFSET $3;
