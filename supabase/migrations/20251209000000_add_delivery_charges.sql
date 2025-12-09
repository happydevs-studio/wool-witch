-- Add delivery charge field to products table
-- This allows each product to have its own delivery charge

ALTER TABLE woolwitch.products 
ADD COLUMN delivery_charge numeric(10, 2) DEFAULT 0 CHECK (delivery_charge >= 0);

-- Add comment for documentation
COMMENT ON COLUMN woolwitch.products.delivery_charge IS 'Delivery charge for this specific product in pounds (£)';