DROP INDEX IF EXISTS reviews_status_idx;

ALTER TABLE payments
    DROP COLUMN IF EXISTS refunded_at,
    DROP COLUMN IF EXISTS stripe_refund_id;

DROP INDEX IF EXISTS orders_created_idx;
DROP INDEX IF EXISTS orders_status_idx;

ALTER TABLE orders
    DROP COLUMN IF EXISTS tracking_number,
    DROP COLUMN IF EXISTS refunded_at,
    DROP COLUMN IF EXISTS delivered_at,
    DROP COLUMN IF EXISTS shipped_at;
