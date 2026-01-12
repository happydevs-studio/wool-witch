-- Fix Security Issues in API Layer
-- Addresses code review feedback:
-- 1. Validate product prices in create_order
-- 2. Fix check_order_rate_limit to return boolean (not trigger)
-- 3. Update log_order_creation search_path
-- 4. Recreate triggers after function updates

-- ========================================
-- FIX check_order_rate_limit - Should return boolean, not be a trigger
-- ========================================

DROP FUNCTION IF EXISTS woolwitch.check_order_rate_limit() CASCADE;
CREATE FUNCTION woolwitch.check_order_rate_limit()
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
  SELECT COUNT(*) INTO recent_orders_count
  FROM woolwitch.orders
  WHERE created_at > (now() - interval '1 hour')
    AND user_id IS NULL;
  
  -- Allow up to 50 anonymous orders per hour globally
  IF recent_orders_count >= 50 THEN
    RAISE EXCEPTION 'Rate limit exceeded. Please try again later or sign in.';
  END IF;
  
  RETURN true;
END;
$$ LANGUAGE plpgsql 
   SECURITY DEFINER
   SET search_path = woolwitch, pg_catalog;

-- ========================================
-- FIX log_order_creation - Update search_path
-- ========================================

DROP FUNCTION IF EXISTS woolwitch.log_order_creation() CASCADE;
CREATE FUNCTION woolwitch.log_order_creation()
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
$$ LANGUAGE plpgsql 
   SECURITY DEFINER
   SET search_path = woolwitch, pg_catalog;

-- Recreate trigger for log_order_creation
DROP TRIGGER IF EXISTS log_order_after_insert ON woolwitch.orders;
CREATE TRIGGER log_order_after_insert
  AFTER INSERT ON woolwitch.orders
  FOR EACH ROW EXECUTE FUNCTION woolwitch.log_order_creation();

-- Recreate triggers that depend on updated functions
DROP TRIGGER IF EXISTS update_orders_updated_at ON woolwitch.orders;
CREATE TRIGGER update_orders_updated_at 
  BEFORE UPDATE ON woolwitch.orders 
  FOR EACH ROW EXECUTE FUNCTION woolwitch.update_updated_at_column();

DROP TRIGGER IF EXISTS update_payments_updated_at ON woolwitch.payments;
CREATE TRIGGER update_payments_updated_at 
  BEFORE UPDATE ON woolwitch.payments 
  FOR EACH ROW EXECUTE FUNCTION woolwitch.update_updated_at_column();

-- ========================================
-- FIX create_order - Validate prices against product table
-- ========================================

DROP FUNCTION IF EXISTS woolwitch_api.create_order(text, text, jsonb, numeric, numeric, numeric, text, jsonb) CASCADE;
CREATE FUNCTION woolwitch_api.create_order(
  p_email text,
  p_full_name text,
  p_address jsonb,
  p_subtotal numeric,
  p_delivery_total numeric,
  p_total numeric,
  p_payment_method text,
  p_order_items jsonb
)
RETURNS uuid AS $$
DECLARE
  v_order_id uuid;
  v_user_id uuid;
  v_item jsonb;
  v_calculated_subtotal numeric := 0;
  v_calculated_delivery numeric := 0;
  v_product_price numeric;
  v_product_delivery numeric;
  v_product_available boolean;
BEGIN
  -- Get current user ID (may be null for anonymous orders)
  v_user_id := auth.uid();
  
  -- Validate all products and calculate totals from database
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_order_items)
  LOOP
    -- Get actual product price and delivery charge from database
    SELECT price, delivery_charge, is_available 
    INTO v_product_price, v_product_delivery, v_product_available
    FROM woolwitch.products
    WHERE id = (v_item->>'product_id')::uuid;
    
    -- Ensure product exists and is available
    IF v_product_price IS NULL THEN
      RAISE EXCEPTION 'Product % not found', v_item->>'product_id';
    END IF;
    
    IF NOT v_product_available THEN
      RAISE EXCEPTION 'Product % is not available', v_item->>'product_name';
    END IF;
    
    -- Calculate running totals using database prices
    v_calculated_subtotal := v_calculated_subtotal + (v_product_price * (v_item->>'quantity')::integer);
    v_calculated_delivery := v_calculated_delivery + (COALESCE(v_product_delivery, 0) * (v_item->>'quantity')::integer);
  END LOOP;
  
  -- Validate that submitted totals match calculated totals (within 0.01 for rounding)
  IF ABS(v_calculated_subtotal - p_subtotal) > 0.01 THEN
    RAISE EXCEPTION 'Submitted subtotal % does not match calculated subtotal %', p_subtotal, v_calculated_subtotal;
  END IF;
  
  IF ABS(v_calculated_delivery - p_delivery_total) > 0.01 THEN
    RAISE EXCEPTION 'Submitted delivery total % does not match calculated delivery total %', p_delivery_total, v_calculated_delivery;
  END IF;
  
  IF ABS((v_calculated_subtotal + v_calculated_delivery) - p_total) > 0.01 THEN
    RAISE EXCEPTION 'Submitted total % does not match calculated total %', p_total, (v_calculated_subtotal + v_calculated_delivery);
  END IF;
  
  -- Create order with validated totals
  INSERT INTO woolwitch.orders (
    user_id,
    email,
    full_name,
    address,
    subtotal,
    delivery_total,
    total,
    status,
    payment_method
  ) VALUES (
    v_user_id,
    p_email,
    p_full_name,
    p_address,
    v_calculated_subtotal,  -- Use calculated value
    v_calculated_delivery,  -- Use calculated value
    v_calculated_subtotal + v_calculated_delivery,  -- Use calculated value
    'pending',
    p_payment_method
  )
  RETURNING id INTO v_order_id;
  
  -- Create order items using validated database prices
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_order_items)
  LOOP
    -- Get prices again for insert (ensures consistency)
    SELECT price, delivery_charge 
    INTO v_product_price, v_product_delivery
    FROM woolwitch.products
    WHERE id = (v_item->>'product_id')::uuid;
    
    INSERT INTO woolwitch.order_items (
      order_id,
      product_id,
      product_name,
      product_price,
      quantity,
      delivery_charge
    ) VALUES (
      v_order_id,
      (v_item->>'product_id')::uuid,
      v_item->>'product_name',
      v_product_price,  -- Use database price
      (v_item->>'quantity')::integer,
      COALESCE(v_product_delivery, 0)  -- Use database delivery charge
    );
  END LOOP;
  
  RETURN v_order_id;
END;
$$ LANGUAGE plpgsql 
   SECURITY DEFINER
   SET search_path = woolwitch, woolwitch_api, auth, pg_catalog;

-- ========================================
-- FIX create_payment - Validate amount and restrict status
-- ========================================

DROP FUNCTION IF EXISTS woolwitch_api.create_payment(uuid, text, text, numeric, text, jsonb, jsonb) CASCADE;
CREATE FUNCTION woolwitch_api.create_payment(
  p_order_id uuid,
  p_payment_method text,
  p_payment_id text,
  p_amount numeric,
  p_status text DEFAULT 'pending',
  p_paypal_details jsonb DEFAULT NULL,
  p_stripe_details jsonb DEFAULT NULL
)
RETURNS uuid AS $$
DECLARE
  v_payment_id uuid;
  v_order_total numeric;
  v_order_user_id uuid;
BEGIN
  -- Get order details and validate access
  SELECT total, user_id INTO v_order_total, v_order_user_id
  FROM woolwitch.orders
  WHERE id = p_order_id;
  
  -- Ensure order exists
  IF v_order_total IS NULL THEN
    RAISE EXCEPTION 'Order not found';
  END IF;
  
  -- Verify user has access to this order
  IF NOT (v_order_user_id = auth.uid() OR v_order_user_id IS NULL OR woolwitch.is_admin()) THEN
    RAISE EXCEPTION 'Access denied to order';
  END IF;
  
  -- Validate payment amount matches order total
  IF ABS(p_amount - v_order_total) > 0.01 THEN
    RAISE EXCEPTION 'Payment amount % does not match order total %', p_amount, v_order_total;
  END IF;
  
  -- Only allow 'pending' status from client
  -- Payment status should be updated by webhook/backend verification
  IF p_status != 'pending' AND NOT woolwitch.is_admin() THEN
    RAISE EXCEPTION 'Only admin can set payment status to %', p_status;
  END IF;
  
  INSERT INTO woolwitch.payments (
    order_id,
    payment_method,
    payment_id,
    status,
    amount,
    currency,
    paypal_details,
    stripe_details
  ) VALUES (
    p_order_id,
    p_payment_method,
    p_payment_id,
    p_status,
    v_order_total,  -- Use validated order total
    'GBP',
    p_paypal_details,
    p_stripe_details
  )
  RETURNING id INTO v_payment_id;
  
  RETURN v_payment_id;
END;
$$ LANGUAGE plpgsql 
   SECURITY DEFINER
   SET search_path = woolwitch, woolwitch_api, auth, pg_catalog;

-- ========================================
-- NEW FUNCTION: Update payment status (admin or webhook only)
-- ========================================

CREATE OR REPLACE FUNCTION woolwitch_api.update_payment_status(
  p_payment_id uuid,
  p_status text,
  p_payment_details jsonb DEFAULT NULL
)
RETURNS void AS $$
BEGIN
  -- Only admin or service_role can update payment status
  -- In production, this should be called by payment webhook handlers
  IF NOT woolwitch.is_admin() THEN
    RAISE EXCEPTION 'Only admin/service can update payment status';
  END IF;
  
  -- Validate status
  IF p_status NOT IN ('pending', 'completed', 'failed', 'refunded') THEN
    RAISE EXCEPTION 'Invalid payment status: %', p_status;
  END IF;
  
  UPDATE woolwitch.payments
  SET 
    status = p_status,
    updated_at = now(),
    -- Update payment details based on method
    paypal_details = CASE 
      WHEN payment_method = 'paypal' AND p_payment_details IS NOT NULL 
      THEN COALESCE(paypal_details, '{}'::jsonb) || p_payment_details
      ELSE paypal_details
    END,
    stripe_details = CASE 
      WHEN payment_method = 'stripe' AND p_payment_details IS NOT NULL 
      THEN COALESCE(stripe_details, '{}'::jsonb) || p_payment_details
      ELSE stripe_details
    END
  WHERE id = p_payment_id;
  
  -- Update order status if payment completed
  IF p_status = 'completed' THEN
    UPDATE woolwitch.orders o
    SET status = 'paid'
    WHERE id = (SELECT order_id FROM woolwitch.payments WHERE id = p_payment_id);
  END IF;
END;
$$ LANGUAGE plpgsql 
   SECURITY DEFINER
   SET search_path = woolwitch, woolwitch_api, auth, pg_catalog;

-- ========================================
-- PERMISSIONS
-- ========================================

-- Grant execute on new/updated functions
GRANT EXECUTE ON FUNCTION woolwitch.check_order_rate_limit() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION woolwitch.log_order_creation() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION woolwitch_api.create_order(text, text, jsonb, numeric, numeric, numeric, text, jsonb) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION woolwitch_api.create_payment(uuid, text, text, numeric, text, jsonb, jsonb) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION woolwitch_api.update_payment_status(uuid, text, jsonb) TO authenticated, service_role;

-- ========================================
-- DOCUMENTATION
-- ========================================

COMMENT ON FUNCTION woolwitch.check_order_rate_limit() IS 'Rate limiting function - returns boolean, checks anonymous order limits';
COMMENT ON FUNCTION woolwitch.log_order_creation() IS 'Audit trigger - logs order creation events with secure search_path';
COMMENT ON FUNCTION woolwitch_api.create_order IS 'Creates order with server-side price validation against product table - prevents price tampering';
COMMENT ON FUNCTION woolwitch_api.create_payment IS 'Creates payment record with amount validation and restricted status - only pending status allowed from client';
COMMENT ON FUNCTION woolwitch_api.update_payment_status IS 'Updates payment status - admin/service only, should be called by payment webhooks';
