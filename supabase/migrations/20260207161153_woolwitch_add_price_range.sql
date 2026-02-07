-- Add price_max column to products table for price ranges
-- Migration: 20260207161153_woolwitch_add_price_range

-- Add price_max column (nullable, for optional price ranges)
ALTER TABLE woolwitch.products
ADD COLUMN price_max numeric(10, 2) CHECK (price_max IS NULL OR price_max >= 0);

-- Add constraint to ensure price_max is greater than or equal to price when set
ALTER TABLE woolwitch.products
ADD CONSTRAINT price_range_valid CHECK (price_max IS NULL OR price_max >= price);

-- Add comment for documentation
COMMENT ON COLUMN woolwitch.products.price_max IS 'Optional maximum price for products with price ranges (e.g., varying sizes/complexity)';
