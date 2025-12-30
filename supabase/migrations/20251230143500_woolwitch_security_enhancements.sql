-- Security Enhancement Migration: Additional Constraints and Validation
-- Adds extra security constraints to ensure data integrity and prevent abuse

-- Add email format validation constraint to orders table
-- Using robust regex that prevents common email format issues
ALTER TABLE woolwitch.orders 
ADD CONSTRAINT orders_email_format_check 
CHECK (email ~* '^[A-Za-z0-9]([A-Za-z0-9._%-]*[A-Za-z0-9])?@[A-Za-z0-9]([A-Za-z0-9.-]*[A-Za-z0-9])?\.[A-Za-z]{2,}$');

-- Add length constraints to prevent abuse
ALTER TABLE woolwitch.orders
ADD CONSTRAINT orders_full_name_length_check 
CHECK (char_length(full_name) >= 2 AND char_length(full_name) <= 100);

-- Replace existing amount constraints with enhanced versions that include upper limits
-- Drop existing inline constraints first
ALTER TABLE woolwitch.orders
DROP CONSTRAINT IF EXISTS orders_subtotal_check,
DROP CONSTRAINT IF EXISTS orders_delivery_total_check,
DROP CONSTRAINT IF EXISTS orders_total_check;

-- Add enhanced constraints with reasonable upper limits for amounts
ALTER TABLE woolwitch.orders
ADD CONSTRAINT orders_subtotal_check 
CHECK (subtotal >= 0 AND subtotal <= 100000.00), -- £100,000 max
ADD CONSTRAINT orders_delivery_total_check 
CHECK (delivery_total >= 0 AND delivery_total <= 1000.00), -- £1,000 max delivery
ADD CONSTRAINT orders_total_check 
CHECK (total >= 0 AND total <= 100000.00); -- £100,000 max per order

-- Ensure total is the sum of subtotal and delivery
ALTER TABLE woolwitch.orders
ADD CONSTRAINT orders_total_calculation_check 
CHECK (abs(total - (subtotal + delivery_total)) < 0.01);

-- Replace existing constraints on order_items with enhanced versions
ALTER TABLE woolwitch.order_items
DROP CONSTRAINT IF EXISTS order_items_product_price_check,
DROP CONSTRAINT IF EXISTS order_items_quantity_check,
DROP CONSTRAINT IF EXISTS order_items_delivery_charge_check;

-- Add enhanced constraints to order_items
ALTER TABLE woolwitch.order_items
ADD CONSTRAINT order_items_product_price_check 
CHECK (product_price >= 0 AND product_price <= 10000.00), -- £10,000 max per item
ADD CONSTRAINT order_items_quantity_check 
CHECK (quantity > 0 AND quantity <= 100), -- Max 100 of any item
ADD CONSTRAINT order_items_delivery_charge_check 
CHECK (delivery_charge >= 0 AND delivery_charge <= 100.00); -- £100 max delivery per item

-- Replace existing constraint on payments with enhanced version
ALTER TABLE woolwitch.payments
DROP CONSTRAINT IF EXISTS payments_amount_check;

-- Add enhanced constraint to payments
ALTER TABLE woolwitch.payments
ADD CONSTRAINT payments_amount_check 
CHECK (amount >= 0 AND amount <= 100000.00); -- £100,000 max payment

-- Replace existing price constraint with enhanced version
-- Drop the existing inline constraint if it exists
ALTER TABLE woolwitch.products
DROP CONSTRAINT IF EXISTS products_price_check;

-- Add enhanced constraint to products table for reasonable pricing
ALTER TABLE woolwitch.products
ADD CONSTRAINT products_price_check 
CHECK (price >= 0 AND price <= 10000.00); -- £10,000 max per product

-- Replace existing delivery charge constraint with enhanced version
-- Drop the existing inline constraint if it exists
ALTER TABLE woolwitch.products
DROP CONSTRAINT IF EXISTS products_delivery_charge_check;

-- Add enhanced constraint for delivery charges
ALTER TABLE woolwitch.products
ADD CONSTRAINT products_delivery_charge_check 
CHECK (delivery_charge >= 0 AND delivery_charge <= 100.00); -- £100 max delivery per product

-- Replace existing stock quantity constraint with enhanced version
-- Drop the existing inline constraint if it exists
ALTER TABLE woolwitch.products
DROP CONSTRAINT IF EXISTS products_stock_quantity_check;

-- Add enhanced constraint for stock quantity with upper limit
ALTER TABLE woolwitch.products
ADD CONSTRAINT products_stock_quantity_check 
CHECK (stock_quantity >= 0 AND stock_quantity <= 10000); -- Max 10,000 in stock

-- Add length constraints for product fields
ALTER TABLE woolwitch.products
ADD CONSTRAINT products_name_length_check 
CHECK (char_length(name) >= 1 AND char_length(name) <= 200),
ADD CONSTRAINT products_description_length_check 
CHECK (char_length(description) >= 1 AND char_length(description) <= 2000),
ADD CONSTRAINT products_category_length_check 
CHECK (char_length(category) >= 1 AND char_length(category) <= 100);

-- Create index on email for faster lookups and better performance on email validation
-- Note: This is NOT a unique index as customers can have multiple orders with the same email
-- This is the expected behavior for an e-commerce order system
CREATE INDEX IF NOT EXISTS idx_orders_email_lookup ON woolwitch.orders(email);

-- Add comment documenting security constraints
COMMENT ON CONSTRAINT orders_email_format_check ON woolwitch.orders IS 
  'Ensures email addresses are in valid format to prevent invalid data';
COMMENT ON CONSTRAINT orders_total_calculation_check ON woolwitch.orders IS 
  'Validates that total equals subtotal plus delivery to prevent calculation errors';
COMMENT ON CONSTRAINT orders_total_check ON woolwitch.orders IS 
  'Prevents unreasonably large orders that could indicate fraud or errors';

-- Log security enhancement
DO $$
BEGIN
  RAISE NOTICE 'Security enhancement migration completed successfully';
  RAISE NOTICE 'Added email validation, amount limits, and length constraints';
END $$;
