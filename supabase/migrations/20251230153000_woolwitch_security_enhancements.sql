-- Woolwitch - Enhanced Security and Rate Limiting
-- Adds additional security constraints and protections for orders and payments

-- ========================================
-- RATE LIMITING FOR ANONYMOUS ORDERS
-- ========================================

-- Function to check order creation rate (prevent abuse)
CREATE OR REPLACE FUNCTION woolwitch.check_order_rate_limit()
RETURNS boolean AS $$
DECLARE
  recent_orders_count integer;
  request_ip text;
BEGIN
  -- For authenticated users, no strict rate limit
  IF auth.uid() IS NOT NULL THEN
    RETURN true;
  END IF;
  
  -- For anonymous users, check recent order count
  -- Note: This is a basic implementation. In production, consider using
  -- a more sophisticated rate limiting solution like Redis
  SELECT COUNT(*) INTO recent_orders_count
  FROM woolwitch.orders
  WHERE created_at > (now() - interval '1 hour')
    AND user_id IS NULL;
  
  -- Allow up to 50 anonymous orders per hour globally
  -- This prevents abuse while allowing legitimate guest checkouts
  -- Note: For production, consider implementing IP-based rate limiting
  IF recent_orders_count >= 50 THEN
    RAISE EXCEPTION 'Rate limit exceeded. Please try again later or sign in.';
  END IF;
  
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- ENHANCED ORDER VALIDATION
-- ========================================

-- Function to validate order totals before insertion
CREATE OR REPLACE FUNCTION woolwitch.validate_order_totals()
RETURNS trigger AS $$
BEGIN
  -- Ensure totals are positive
  IF NEW.subtotal < 0 OR NEW.delivery_total < 0 OR NEW.total < 0 THEN
    RAISE EXCEPTION 'Order totals must be non-negative';
  END IF;
  
  -- Ensure total is reasonable (subtotal + delivery)
  IF NEW.total <> (NEW.subtotal + NEW.delivery_total) THEN
    RAISE EXCEPTION 'Order total does not match subtotal + delivery';
  END IF;
  
  -- Prevent unreasonably large orders (> £50,000)
  -- Note: Adjust this limit based on business requirements
  -- For higher limits, consider requiring manual approval or authentication
  IF NEW.total > 50000 THEN
    RAISE EXCEPTION 'Order total exceeds maximum allowed amount';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER validate_order_before_insert
  BEFORE INSERT ON woolwitch.orders
  FOR EACH ROW EXECUTE FUNCTION woolwitch.validate_order_totals();

-- ========================================
-- ENHANCED PAYMENT VALIDATION
-- ========================================

-- Function to validate payment amounts match order totals
CREATE OR REPLACE FUNCTION woolwitch.validate_payment_amount()
RETURNS trigger AS $$
DECLARE
  order_total numeric(10, 2);
BEGIN
  -- Get the order total
  SELECT total INTO order_total
  FROM woolwitch.orders
  WHERE id = NEW.order_id;
  
  -- Ensure payment amount matches order total
  IF NEW.amount <> order_total THEN
    RAISE EXCEPTION 'Payment amount must match order total';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = woolwitch;

CREATE TRIGGER validate_payment_before_insert
  BEFORE INSERT ON woolwitch.payments
  FOR EACH ROW EXECUTE FUNCTION woolwitch.validate_payment_amount();

-- ========================================
-- AUDIT LOGGING FOR SENSITIVE OPERATIONS
-- ========================================

-- Create audit log table for security events
CREATE TABLE IF NOT EXISTS woolwitch.audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  table_name text NOT NULL,
  record_id uuid,
  user_id uuid REFERENCES auth.users(id),
  event_data jsonb,
  ip_address text,
  user_agent text,
  created_at timestamptz DEFAULT now()
);

-- Index for querying audit logs
CREATE INDEX idx_audit_log_created ON woolwitch.audit_log(created_at DESC);
CREATE INDEX idx_audit_log_user ON woolwitch.audit_log(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_audit_log_event_type ON woolwitch.audit_log(event_type);

-- RLS for audit log (admin only)
ALTER TABLE woolwitch.audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin view audit logs" ON woolwitch.audit_log
  FOR SELECT TO authenticated
  USING (woolwitch.is_admin());

-- Function to log order creation
CREATE OR REPLACE FUNCTION woolwitch.log_order_creation()
RETURNS trigger AS $$
BEGIN
  INSERT INTO woolwitch.audit_log (
    event_type,
    table_name,
    record_id,
    user_id,
    event_data
  ) VALUES (
    'order_created',
    'orders',
    NEW.id,
    NEW.user_id,
    jsonb_build_object(
      'email', NEW.email,
      'total', NEW.total,
      'payment_method', NEW.payment_method,
      'is_anonymous', NEW.user_id IS NULL
    )
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = woolwitch;

CREATE TRIGGER log_order_after_insert
  AFTER INSERT ON woolwitch.orders
  FOR EACH ROW EXECUTE FUNCTION woolwitch.log_order_creation();

-- ========================================
-- ENHANCED STORAGE SECURITY
-- ========================================

-- Policies to prevent directory traversal and path manipulation in storage
-- Note: These policies complement the existing admin-only policies from the initial migration

-- Prevent path manipulation on INSERT
CREATE POLICY "Prevent storage path manipulation on insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'woolwitch-images' 
    AND name !~ '\.\.'  -- Prevent .. in paths
    AND name !~ '^/'    -- Prevent absolute paths
    AND length(name) < 256  -- Reasonable filename length
  );

-- Prevent path manipulation on UPDATE
CREATE POLICY "Prevent storage path manipulation on update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'woolwitch-images')
  WITH CHECK (
    bucket_id = 'woolwitch-images'
    AND name !~ '\.\.'  -- Prevent .. in paths
    AND name !~ '^/'    -- Prevent absolute paths
    AND length(name) < 256  -- Reasonable filename length
  );

-- Additional DELETE protection (requires admin via existing policies)
-- The existing "Admin manage product images" policy handles admin-only deletes

-- ========================================
-- PERMISSIONS
-- ========================================

GRANT SELECT ON woolwitch.audit_log TO authenticated;
GRANT ALL PRIVILEGES ON woolwitch.audit_log TO service_role, postgres;

GRANT EXECUTE ON FUNCTION woolwitch.check_order_rate_limit() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION woolwitch.validate_order_totals() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION woolwitch.validate_payment_amount() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION woolwitch.log_order_creation() TO anon, authenticated;

-- ========================================
-- DOCUMENTATION
-- ========================================

COMMENT ON FUNCTION woolwitch.check_order_rate_limit() IS 'Prevents abuse by rate limiting anonymous order creation';
COMMENT ON FUNCTION woolwitch.validate_order_totals() IS 'Validates order totals are correct and reasonable';
COMMENT ON FUNCTION woolwitch.validate_payment_amount() IS 'Ensures payment amounts match order totals';
COMMENT ON TABLE woolwitch.audit_log IS 'Security audit log for tracking sensitive operations';
