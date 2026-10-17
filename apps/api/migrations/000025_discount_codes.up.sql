-- Discount codes an admin creates and shoppers enter at checkout. A code's
-- uses aren't counted here: they are its orders that weren't cancelled, so
-- releasing an unpaid checkout gives the use back by itself.
CREATE TABLE discount_codes (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    -- stored upper-case; shoppers type it in any case
    code              TEXT NOT NULL UNIQUE
                      CHECK (code = upper(code) AND char_length(code) BETWEEN 3 AND 32),
    -- percent: value is 1-100 (% off the items); fixed: value is cents off
    kind              TEXT NOT NULL CHECK (kind IN ('percent', 'fixed')),
    value             INT NOT NULL CHECK (value > 0 AND (kind <> 'percent' OR value <= 100)),
    -- the items' subtotal (cents) an order needs for the code to apply
    min_subtotal      INT NOT NULL DEFAULT 0 CHECK (min_subtotal >= 0),
    starts_at         TIMESTAMPTZ,
    ends_at           TIMESTAMPTZ,
    -- NULL: no limit
    max_redemptions   INT CHECK (max_redemptions > 0),
    once_per_customer BOOLEAN NOT NULL DEFAULT FALSE,
    is_active         BOOLEAN NOT NULL DEFAULT TRUE,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT discount_codes_window CHECK (starts_at IS NULL OR ends_at IS NULL OR ends_at > starts_at)
);

CREATE TRIGGER discount_codes_updated_at
BEFORE UPDATE ON discount_codes
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- What an order took off its items, and the code as it was typed in then
-- (kept if the code is deleted). total = subtotal - discount + shipping.
ALTER TABLE orders
    ADD COLUMN discount         INT NOT NULL DEFAULT 0 CHECK (discount >= 0),
    ADD COLUMN discount_code    TEXT,
    ADD COLUMN discount_code_id UUID REFERENCES discount_codes(id) ON DELETE SET NULL;

CREATE INDEX orders_discount_code_idx ON orders(discount_code_id, user_id)
    WHERE discount_code_id IS NOT NULL;

-- Each code with its uses so far and where it stands now:
--   off        switched off by an admin
--   scheduled  not started yet
--   ended      past its end, or every allowed use taken
--   active     open to shoppers
-- dc.* is expanded now: a column added to discount_codes later needs the
-- view recreated.
CREATE VIEW discount_code_states AS
SELECT
    dc.*,
    u.uses,
    CASE
        WHEN NOT dc.is_active THEN 'off'
        WHEN dc.starts_at > now() THEN 'scheduled'
        WHEN dc.ends_at <= now()
          OR (dc.max_redemptions IS NOT NULL AND u.uses >= dc.max_redemptions) THEN 'ended'
        ELSE 'active'
    END AS state
FROM discount_codes dc
CROSS JOIN LATERAL (
    SELECT COUNT(*)::int AS uses FROM orders o
    WHERE o.discount_code_id = dc.id AND o.status <> 'cancelled'
) u;
