ALTER TABLE product_variants DROP CONSTRAINT IF EXISTS uq_variant_combination;
ALTER TABLE product_variants DROP COLUMN IF EXISTS option_combination_key;