ALTER TABLE product_variants 
ADD COLUMN option_combination_key TEXT NOT NULL;

ALTER TABLE product_variants 
ADD CONSTRAINT uq_variant_combination 
UNIQUE (product_id, option_combination_key);