-- Security Enhancement Migration: Additional Constraints and Validation
-- Adds extra security constraints to ensure data integrity and prevent abuse

-- Add email format validation constraint to orders table
ALTER TABLE woolwitch.orders 
ADD CONSTRAINT orders_email_format_check 
CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');

-- Add length constraints to prevent abuse
ALTER TABLE woolwitch.orders
ADD CONSTRAINT orders_full_name_length_check 
CHECK (char_length(full_name) >= 2 AND char_length(full_name) <= 100);

-- Add reasonable upper limits for amounts
ALTER TABLE woolwitch.orders
ADD CONSTRAINT orders_total_upper_limit_check 
CHECK (total <= 100000.00), -- £100,000 max per order
ADD CONSTRAINT orders_subtotal_upper_limit_check 
CHECK (subtotal <= 100000.00),
ADD CONSTRAINT orders_delivery_upper_limit_check 
CHECK (delivery_total <= 1000.00); -- £1,000 max delivery

-- Ensure total is the sum of subtotal and delivery
ALTER TABLE woolwitch.orders
ADD CONSTRAINT orders_total_calculation_check 
CHECK (abs(total - (subtotal + delivery_total)) < 0.01);

-- Add constraints to order_items
ALTER TABLE woolwitch.order_items
ADD CONSTRAINT order_items_quantity_upper_limit_check 
CHECK (quantity <= 100), -- Max 100 of any item
ADD CONSTRAINT order_items_price_upper_limit_check 
CHECK (product_price <= 10000.00), -- £10,000 max per item
ADD CONSTRAINT order_items_delivery_upper_limit_check 
CHECK (delivery_charge <= 100.00); -- £100 max delivery per item

-- Add constraints to payments
ALTER TABLE woolwitch.payments
ADD CONSTRAINT payments_amount_upper_limit_check 
CHECK (amount <= 100000.00); -- £100,000 max payment

-- Add constraint to products table for reasonable pricing
ALTER TABLE woolwitch.products
ADD CONSTRAINT products_price_upper_limit_check 
CHECK (price <= 10000.00); -- £10,000 max per product

-- Add constraint for delivery charges
ALTER TABLE woolwitch.products
ADD CONSTRAINT products_delivery_upper_limit_check 
CHECK (delivery_charge <= 100.00); -- £100 max delivery per product

-- Add constraint for stock quantity
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
CREATE INDEX IF NOT EXISTS idx_orders_email_lookup ON woolwitch.orders(email);

-- Add comment documenting security constraints
COMMENT ON CONSTRAINT orders_email_format_check ON woolwitch.orders IS 
  'Ensures email addresses are in valid format to prevent invalid data';
COMMENT ON CONSTRAINT orders_total_calculation_check ON woolwitch.orders IS 
  'Validates that total equals subtotal plus delivery to prevent calculation errors';
COMMENT ON CONSTRAINT orders_total_upper_limit_check ON woolwitch.orders IS 
  'Prevents unreasonably large orders that could indicate fraud or errors';

-- Log security enhancement
DO $$
BEGIN
  RAISE NOTICE 'Security enhancement migration completed successfully';
  RAISE NOTICE 'Added email validation, amount limits, and length constraints';
END $$;
