-- Fulfilment: when an order shipped, arrived or was refunded, its tracking
-- number, and the refund on its payment.
ALTER TABLE orders
    ADD COLUMN shipped_at      TIMESTAMPTZ,
    ADD COLUMN delivered_at    TIMESTAMPTZ,
    ADD COLUMN refunded_at     TIMESTAMPTZ,
    ADD COLUMN tracking_number TEXT CHECK (char_length(tracking_number) <= 64);

-- The admin orders list: by status, newest first.
CREATE INDEX orders_status_idx ON orders(status, created_at DESC);
CREATE INDEX orders_created_idx ON orders(created_at DESC);

ALTER TABLE payments
    ADD COLUMN stripe_refund_id TEXT UNIQUE,
    ADD COLUMN refunded_at      TIMESTAMPTZ;

-- Review moderation: by status, newest first.
CREATE INDEX reviews_status_idx ON reviews(status, created_at DESC);
