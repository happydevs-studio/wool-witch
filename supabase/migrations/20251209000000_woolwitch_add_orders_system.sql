-- Orders and Payments System - Optimized Implementation
-- Comprehensive order management with PayPal, Stripe, and card payment support

-- ========================================
-- UTILITY FUNCTIONS
-- ========================================

-- Optimized timestamp update function
CREATE OR REPLACE FUNCTION woolwitch.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- ORDERS TABLE
-- ========================================

CREATE TABLE woolwitch.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  email text NOT NULL,
  full_name text NOT NULL,
  address jsonb NOT NULL, 
  subtotal numeric(10, 2) NOT NULL CHECK (subtotal >= 0),
  delivery_total numeric(10, 2) NOT NULL CHECK (delivery_total >= 0),
  total numeric(10, 2) NOT NULL CHECK (total >= 0),
  status text NOT NULL DEFAULT 'pending' 
    CHECK (status IN ('pending', 'paid', 'shipped', 'delivered', 'cancelled')),
  payment_method text NOT NULL 
    CHECK (payment_method IN ('card', 'paypal', 'stripe')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE woolwitch.orders ENABLE ROW LEVEL SECURITY;

-- Optimized indexes for common query patterns
CREATE INDEX idx_orders_user_status ON woolwitch.orders(user_id, status) WHERE user_id IS NOT NULL;
CREATE INDEX idx_orders_email_recent ON woolwitch.orders(email, created_at DESC);
CREATE INDEX idx_orders_status_created ON woolwitch.orders(status, created_at DESC);
CREATE INDEX idx_orders_payment_method ON woolwitch.orders(payment_method, status);

-- Efficient RLS policies with combined conditions
CREATE POLICY "Order access control" ON woolwitch.orders
  FOR SELECT USING (
    auth.uid() = user_id OR 
    woolwitch.is_admin()
  );

CREATE POLICY "Order creation control" ON woolwitch.orders
  FOR INSERT WITH CHECK (
    -- Anonymous orders (checkout without account)
    (auth.uid() IS NULL AND user_id IS NULL) OR
    -- Authenticated users creating their own orders
    (auth.uid() = user_id) OR
    -- Admin creating any orders
    woolwitch.is_admin()
  );

CREATE POLICY "Admin order management" ON woolwitch.orders
  FOR ALL TO authenticated
  USING (woolwitch.is_admin())
  WITH CHECK (woolwitch.is_admin());

-- ========================================
-- ORDER ITEMS TABLE
-- ========================================

CREATE TABLE woolwitch.order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES woolwitch.orders(id) ON DELETE CASCADE,
  product_id uuid REFERENCES woolwitch.products(id) ON DELETE SET NULL,
  product_name text NOT NULL,
  product_price numeric(10, 2) NOT NULL CHECK (product_price >= 0),
  quantity integer NOT NULL CHECK (quantity > 0),
  delivery_charge numeric(10, 2) NOT NULL CHECK (delivery_charge >= 0),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE woolwitch.order_items ENABLE ROW LEVEL SECURITY;

-- Efficient indexes
CREATE INDEX idx_order_items_order_id ON woolwitch.order_items(order_id);
CREATE INDEX idx_order_items_product_id ON woolwitch.order_items(product_id) WHERE product_id IS NOT NULL;

-- RLS policies inherit from orders
CREATE POLICY "Order items access" ON woolwitch.order_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM woolwitch.orders 
      WHERE id = order_id 
      AND (auth.uid() = user_id OR woolwitch.is_admin())
    )
  );

CREATE POLICY "Order items creation" ON woolwitch.order_items
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM woolwitch.orders 
      WHERE id = order_id 
      AND (
        (auth.uid() IS NULL AND user_id IS NULL) OR
        (auth.uid() = user_id) OR
        woolwitch.is_admin()
      )
    )
  );

CREATE POLICY "Admin order items management" ON woolwitch.order_items
  FOR ALL TO authenticated
  USING (woolwitch.is_admin())
  WITH CHECK (woolwitch.is_admin());

-- ========================================
-- PAYMENTS TABLE WITH STRIPE SUPPORT
-- ========================================

CREATE TABLE woolwitch.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES woolwitch.orders(id) ON DELETE CASCADE,
  payment_method text NOT NULL 
    CHECK (payment_method IN ('card', 'paypal', 'stripe')),
  payment_id text,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  amount numeric(10, 2) NOT NULL CHECK (amount >= 0),
  currency text DEFAULT 'GBP' NOT NULL,
  paypal_details jsonb,
  stripe_details jsonb, -- Consolidated Stripe support
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE woolwitch.payments ENABLE ROW LEVEL SECURITY;

-- Optimized indexes with better query patterns
CREATE INDEX idx_payments_order_status ON woolwitch.payments(order_id, status);
CREATE INDEX idx_payments_external_id ON woolwitch.payments(payment_id) WHERE payment_id IS NOT NULL;
CREATE INDEX idx_payments_method_status ON woolwitch.payments(payment_method, status, created_at DESC);
CREATE INDEX idx_payments_stripe_details ON woolwitch.payments USING GIN (stripe_details) WHERE stripe_details IS NOT NULL;
CREATE INDEX idx_payments_paypal_details ON woolwitch.payments USING GIN (paypal_details) WHERE paypal_details IS NOT NULL;

-- RLS policies
CREATE POLICY "Payment access control" ON woolwitch.payments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM woolwitch.orders 
      WHERE id = order_id 
      AND (auth.uid() = user_id OR woolwitch.is_admin())
    )
  );

CREATE POLICY "Payment creation control" ON woolwitch.payments
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM woolwitch.orders 
      WHERE id = order_id 
      AND (
        (auth.uid() IS NULL AND user_id IS NULL) OR
        (auth.uid() = user_id) OR
        woolwitch.is_admin()
      )
    )
  );

CREATE POLICY "Admin payment management" ON woolwitch.payments
  FOR ALL TO authenticated
  USING (woolwitch.is_admin())
  WITH CHECK (woolwitch.is_admin());

-- ========================================
-- TRIGGERS
-- ========================================

CREATE TRIGGER update_orders_updated_at 
  BEFORE UPDATE ON woolwitch.orders 
  FOR EACH ROW EXECUTE FUNCTION woolwitch.update_updated_at_column();

CREATE TRIGGER update_payments_updated_at 
  BEFORE UPDATE ON woolwitch.payments 
  FOR EACH ROW EXECUTE FUNCTION woolwitch.update_updated_at_column();

-- ========================================
-- CONSOLIDATED PERMISSIONS
-- ========================================

-- Table permissions for all new tables
GRANT SELECT, INSERT ON woolwitch.orders TO anon;
GRANT SELECT, INSERT ON woolwitch.order_items TO anon; 
GRANT SELECT, INSERT ON woolwitch.payments TO anon;

GRANT ALL ON woolwitch.orders TO authenticated;
GRANT ALL ON woolwitch.order_items TO authenticated;
GRANT ALL ON woolwitch.payments TO authenticated;

GRANT ALL PRIVILEGES ON woolwitch.orders TO service_role, postgres;
GRANT ALL PRIVILEGES ON woolwitch.order_items TO service_role, postgres;
GRANT ALL PRIVILEGES ON woolwitch.payments TO service_role, postgres;

-- Function permissions
GRANT EXECUTE ON FUNCTION woolwitch.update_updated_at_column() TO authenticated, anon;
GRANT ALL PRIVILEGES ON FUNCTION woolwitch.update_updated_at_column() TO service_role, postgres;

-- Sequence permissions
GRANT USAGE ON ALL SEQUENCES IN SCHEMA woolwitch TO authenticated, anon;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA woolwitch TO service_role, postgres;

-- ========================================
-- DOCUMENTATION
-- ========================================

COMMENT ON TABLE woolwitch.orders IS 'Customer orders with shipping and payment information';
COMMENT ON TABLE woolwitch.order_items IS 'Individual products within each order with historical pricing';
COMMENT ON TABLE woolwitch.payments IS 'Payment transaction records supporting PayPal, Stripe, and card payments';

COMMENT ON COLUMN woolwitch.orders.address IS 'JSON object: {address, city, postcode}';
COMMENT ON COLUMN woolwitch.payments.stripe_details IS 'Stripe payment metadata: payment_intent_id, payment_method_id, card details';
COMMENT ON COLUMN woolwitch.payments.paypal_details IS 'PayPal response data for audit and troubleshooting';
