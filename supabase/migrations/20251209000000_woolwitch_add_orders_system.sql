/*
  # Orders and Payments System - Complete Implementation

  ## Overview
  Adds comprehensive order management system to support PayPal and card payments.
  This migration includes proper RLS policies, table grants, and anonymous user support.

  ## What This Migration Creates
  
  ### Orders Management
  - `woolwitch.orders` - Main orders table with customer and payment info
  - `woolwitch.order_items` - Individual items within each order
  - `woolwitch.payments` - Payment transaction records for audit trail
  
  ### Security & Permissions  
  - Row Level Security policies for user/admin access control
  - Users can view their own orders, admins can manage all orders
  - Anonymous users can create orders
  - Proper table-level grants for all roles
  
  ### Features
  - Support for both 'card' and 'paypal' payment methods
  - Order status tracking (pending, paid, shipped, delivered, cancelled)
  - Payment status tracking (pending, completed, failed, refunded)
  - Product information snapshots to preserve order history
  - Delivery charge tracking per item
  - Anonymous checkout support
*/

-- ========================================
-- ORDERS TABLE
-- ========================================

-- Main orders table to track all customer purchases
CREATE TABLE woolwitch.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  email text NOT NULL,
  full_name text NOT NULL,
  address jsonb NOT NULL, -- {address, city, postcode}
  subtotal numeric(10, 2) NOT NULL CHECK (subtotal >= 0),
  delivery_total numeric(10, 2) NOT NULL CHECK (delivery_total >= 0),
  total numeric(10, 2) NOT NULL CHECK (total >= 0),
  status text NOT NULL CHECK (status IN ('pending', 'paid', 'shipped', 'delivered', 'cancelled')) DEFAULT 'pending',
  payment_method text NOT NULL CHECK (payment_method IN ('card', 'paypal')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE woolwitch.orders ENABLE ROW LEVEL SECURITY;

-- Indexes for performance
CREATE INDEX idx_orders_user_id ON woolwitch.orders(user_id);
CREATE INDEX idx_orders_status ON woolwitch.orders(status);
CREATE INDEX idx_orders_created_at ON woolwitch.orders(created_at DESC);
CREATE INDEX idx_orders_email ON woolwitch.orders(email);

-- RLS Policies - Handles authenticated users, anonymous users, and admins
CREATE POLICY "Users can view their own orders" ON woolwitch.orders
  FOR SELECT USING (
    (select auth.uid()) = user_id OR 
    (select woolwitch.is_admin())
  );

CREATE POLICY "Users can create their own orders" ON woolwitch.orders
  FOR INSERT WITH CHECK (
    -- Anonymous users (NULL user_id, checked first)
    ((select auth.uid()) IS NULL AND user_id IS NULL)
    -- Authenticated users can create orders for themselves  
    OR ((select auth.uid()) IS NOT NULL AND (select auth.uid()) = user_id)
    -- Admins can create any orders
    OR ((select auth.uid()) IS NOT NULL AND (select woolwitch.is_admin()))
  );

CREATE POLICY "Admins can update all orders" ON woolwitch.orders
  FOR UPDATE USING ((select woolwitch.is_admin()));

CREATE POLICY "Admins can delete orders" ON woolwitch.orders
  FOR DELETE USING ((select woolwitch.is_admin()));

-- ========================================
-- ORDER ITEMS TABLE
-- ========================================

-- Individual items within each order with product snapshots
CREATE TABLE woolwitch.order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES woolwitch.orders(id) ON DELETE CASCADE,
  product_id uuid REFERENCES woolwitch.products(id) ON DELETE SET NULL,
  product_name text NOT NULL, -- Snapshot in case product changes
  product_price numeric(10, 2) NOT NULL CHECK (product_price >= 0), -- Price at time of order
  quantity integer NOT NULL CHECK (quantity > 0),
  delivery_charge numeric(10, 2) NOT NULL CHECK (delivery_charge >= 0),
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE woolwitch.order_items ENABLE ROW LEVEL SECURITY;

-- Indexes for performance
CREATE INDEX idx_order_items_order_id ON woolwitch.order_items(order_id);
CREATE INDEX idx_order_items_product_id ON woolwitch.order_items(product_id);

-- RLS Policies (inherit from orders table)
CREATE POLICY "Users can view items of their own orders" ON woolwitch.order_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM woolwitch.orders 
      WHERE id = order_id 
      AND ((select auth.uid()) = user_id OR (select woolwitch.is_admin()))
    )
  );

CREATE POLICY "Users can create items for their own orders" ON woolwitch.order_items
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM woolwitch.orders 
      WHERE id = order_id 
      AND (
        ((select auth.uid()) IS NULL AND user_id IS NULL)
        OR ((select auth.uid()) IS NOT NULL AND (select auth.uid()) = user_id)
        OR ((select auth.uid()) IS NOT NULL AND (select woolwitch.is_admin()))
      )
    )
  );

CREATE POLICY "Admins can update all order items" ON woolwitch.order_items
  FOR UPDATE USING ((select woolwitch.is_admin()));

CREATE POLICY "Admins can delete order items" ON woolwitch.order_items
  FOR DELETE USING ((select woolwitch.is_admin()));

-- ========================================
-- PAYMENTS TABLE
-- ========================================

-- Payment transaction records for audit trail
CREATE TABLE woolwitch.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES woolwitch.orders(id) ON DELETE CASCADE,
  payment_method text NOT NULL CHECK (payment_method IN ('card', 'paypal')),
  payment_id text, -- PayPal payment ID or card transaction reference
  status text NOT NULL CHECK (status IN ('pending', 'completed', 'failed', 'refunded')) DEFAULT 'pending',
  amount numeric(10, 2) NOT NULL CHECK (amount >= 0),
  currency text DEFAULT 'GBP',
  paypal_details jsonb, -- Store PayPal response data for audit
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE woolwitch.payments ENABLE ROW LEVEL SECURITY;

-- Indexes for performance
CREATE INDEX idx_payments_order_id ON woolwitch.payments(order_id);
CREATE INDEX idx_payments_payment_id ON woolwitch.payments(payment_id);
CREATE INDEX idx_payments_status ON woolwitch.payments(status);
CREATE INDEX idx_payments_created_at ON woolwitch.payments(created_at DESC);

-- RLS Policies (inherit from orders table)
CREATE POLICY "Users can view payments for their own orders" ON woolwitch.payments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM woolwitch.orders 
      WHERE id = order_id 
      AND ((select auth.uid()) = user_id OR (select woolwitch.is_admin()))
    )
  );

CREATE POLICY "System can create payments" ON woolwitch.payments
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM woolwitch.orders 
      WHERE id = order_id 
      AND (
        ((select auth.uid()) IS NULL AND user_id IS NULL)
        OR ((select auth.uid()) IS NOT NULL AND (select auth.uid()) = user_id)
        OR ((select auth.uid()) IS NOT NULL AND (select woolwitch.is_admin()))
      )
    )
  );

CREATE POLICY "Admins can update all payments" ON woolwitch.payments
  FOR UPDATE USING ((select woolwitch.is_admin()));

CREATE POLICY "Admins can delete payments" ON woolwitch.payments
  FOR DELETE USING ((select woolwitch.is_admin()));

-- ========================================
-- UTILITY FUNCTIONS
-- ========================================

-- Function to automatically update updated_at timestamps
CREATE OR REPLACE FUNCTION woolwitch.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_orders_updated_at 
  BEFORE UPDATE ON woolwitch.orders 
  FOR EACH ROW EXECUTE FUNCTION woolwitch.update_updated_at_column();

CREATE TRIGGER update_payments_updated_at 
  BEFORE UPDATE ON woolwitch.payments 
  FOR EACH ROW EXECUTE FUNCTION woolwitch.update_updated_at_column();

-- ========================================
-- TABLE PERMISSIONS
-- ========================================

-- Grant permissions on orders table
GRANT SELECT, INSERT, UPDATE, DELETE ON woolwitch.orders TO authenticated;
GRANT SELECT, INSERT ON woolwitch.orders TO anon;

-- Grant permissions on order_items table
GRANT SELECT, INSERT, UPDATE, DELETE ON woolwitch.order_items TO authenticated;
GRANT SELECT, INSERT ON woolwitch.order_items TO anon;

-- Grant permissions on payments table
GRANT SELECT, INSERT, UPDATE, DELETE ON woolwitch.payments TO authenticated;
GRANT SELECT, INSERT ON woolwitch.payments TO anon;

-- Grant usage on sequences for auto-generated IDs
GRANT USAGE ON ALL SEQUENCES IN SCHEMA woolwitch TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA woolwitch TO anon;

-- Function permissions
GRANT EXECUTE ON FUNCTION woolwitch.update_updated_at_column() TO authenticated;
GRANT EXECUTE ON FUNCTION woolwitch.update_updated_at_column() TO anon;

-- ========================================
-- COMMENTS FOR DOCUMENTATION
-- ========================================

COMMENT ON TABLE woolwitch.orders IS 'Customer orders with shipping and payment information - RLS controls access, table grants enable basic operations';
COMMENT ON TABLE woolwitch.order_items IS 'Individual products within each order with historical pricing - RLS controls access, table grants enable basic operations';
COMMENT ON TABLE woolwitch.payments IS 'Payment transaction records for audit and reconciliation - RLS controls access, table grants enable basic operations';

COMMENT ON COLUMN woolwitch.orders.address IS 'JSON object containing address, city, and postcode';
COMMENT ON COLUMN woolwitch.orders.status IS 'Order status: pending, paid, shipped, delivered, cancelled';
COMMENT ON COLUMN woolwitch.orders.payment_method IS 'Payment method used: card or paypal';

COMMENT ON COLUMN woolwitch.order_items.product_name IS 'Snapshot of product name at time of order';
COMMENT ON COLUMN woolwitch.order_items.product_price IS 'Product price at time of order for historical accuracy';

COMMENT ON COLUMN woolwitch.payments.payment_id IS 'External payment system identifier (PayPal transaction ID, etc.)';
COMMENT ON COLUMN woolwitch.payments.paypal_details IS 'Full PayPal response data for audit and troubleshooting';

COMMENT ON POLICY "Users can create their own orders" ON woolwitch.orders IS 
  'Allows authenticated users to create their own orders and anonymous users to create orders with NULL user_id';