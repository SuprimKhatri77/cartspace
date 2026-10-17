DROP VIEW IF EXISTS discount_code_states;
DROP INDEX IF EXISTS orders_discount_code_idx;
ALTER TABLE orders
    DROP COLUMN IF EXISTS discount_code_id,
    DROP COLUMN IF EXISTS discount_code,
    DROP COLUMN IF EXISTS discount;
DROP TABLE IF EXISTS discount_codes;
