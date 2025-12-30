-- Woolwitch Database Security Hardening
-- Addresses security vulnerabilities identified in security audit
-- This migration tightens permissions and improves data protection

-- ========================================
-- REVOKE OVERLY PERMISSIVE GRANTS
-- ========================================

-- Remove blanket SELECT grant on all tables for anon role
-- This was too permissive and exposed sensitive data
REVOKE SELECT ON ALL TABLES IN SCHEMA woolwitch FROM anon;

-- Remove blanket ALL grant on all tables for authenticated role
-- We'll use RLS policies instead for fine-grained control
REVOKE ALL ON ALL TABLES IN SCHEMA woolwitch FROM authenticated;

-- ========================================
-- GRANT SPECIFIC TABLE PERMISSIONS
-- ========================================

-- Products table - allow public read through RLS
GRANT SELECT ON woolwitch.products TO anon, authenticated;

-- User roles - users can only see their own role through RLS
GRANT SELECT ON woolwitch.user_roles TO authenticated;

-- Orders - allow anonymous order creation, authenticated view through RLS
GRANT SELECT, INSERT ON woolwitch.orders TO anon, authenticated;
GRANT UPDATE, DELETE ON woolwitch.orders TO authenticated;

-- Order items - allow anonymous order item creation, authenticated view through RLS
GRANT SELECT, INSERT ON woolwitch.order_items TO anon, authenticated;
GRANT UPDATE, DELETE ON woolwitch.order_items TO authenticated;

-- Payments - allow anonymous payment creation, authenticated view through RLS
-- Note: Payment details are protected by RLS policies
GRANT SELECT, INSERT ON woolwitch.payments TO anon, authenticated;
GRANT UPDATE, DELETE ON woolwitch.payments TO authenticated;

-- ========================================
-- TIGHTEN STORAGE POLICIES
-- ========================================

-- Remove the generic authenticated upload policy
DROP POLICY IF EXISTS "Authenticated upload product images" ON storage.objects;

-- Only admins can upload product images (prevents abuse)
CREATE POLICY "Admin upload product images" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'woolwitch-images' AND woolwitch.is_admin());

-- ========================================
-- IMPROVE SECURITY DEFINER FUNCTIONS
-- ========================================

-- Update is_admin function with security improvements
-- Add comment explaining security model
COMMENT ON FUNCTION woolwitch.is_admin() IS 
  'SECURITY DEFINER function to check admin status. Uses STABLE for query optimization. '
  'Access to user_roles table is restricted by RLS, so this function only reveals '
  'the current user''s admin status, not other users'' statuses.';

-- Update handle_new_user with better error handling
CREATE OR REPLACE FUNCTION woolwitch.handle_new_user()
RETURNS trigger AS $$
BEGIN
  -- Only insert if the user doesn't already have a role
  INSERT INTO woolwitch.user_roles (user_id, role)
  VALUES (NEW.id, 'user')
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Log error but don't fail user creation
  RAISE WARNING 'Failed to create user role for user %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql 
   SECURITY DEFINER
   SET search_path = woolwitch, auth;

COMMENT ON FUNCTION woolwitch.handle_new_user() IS 
  'SECURITY DEFINER trigger function to auto-assign user role on signup. '
  'Includes error handling to prevent user creation failures.';

-- ========================================
-- ADD INDEXES FOR SECURITY
-- ========================================

-- Remove potentially problematic email index that could be abused for enumeration
-- Email lookups should be done by authenticated users or through specific APIs
DROP INDEX IF EXISTS woolwitch.idx_orders_email_recent;

-- Add index that's more privacy-preserving (only for admin queries)
-- This index is still useful for admin dashboard but harder to abuse
CREATE INDEX idx_orders_created_status ON woolwitch.orders(created_at DESC, status)
WHERE status IN ('pending', 'paid');

-- ========================================
-- SENSITIVE DATA PROTECTION
-- ========================================

-- Add comments documenting sensitive data handling
COMMENT ON COLUMN woolwitch.orders.email IS 
  'Customer email address. Required for order communication. '
  'Protected by RLS - only visible to order owner and admins.';

COMMENT ON COLUMN woolwitch.orders.address IS 
  'Customer shipping address as JSONB. Contains PII. '
  'Protected by RLS - only visible to order owner and admins.';

COMMENT ON COLUMN woolwitch.payments.paypal_details IS 
  'PayPal payment metadata for audit and troubleshooting. '
  'May contain payer_email - minimize data retention. '
  'Protected by RLS - only visible to order owner and admins.';

COMMENT ON COLUMN woolwitch.payments.stripe_details IS 
  'Stripe payment metadata: payment_intent_id, payment_method_id, last 4 digits, card brand. '
  'Does NOT contain full card numbers or CVV. Compliant with PCI-DSS. '
  'Protected by RLS - only visible to order owner and admins.';

-- ========================================
-- VERIFY RLS IS ENABLED
-- ========================================

-- Ensure RLS is enabled on all sensitive tables
-- These should already be enabled but we verify here for security
ALTER TABLE woolwitch.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE woolwitch.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE woolwitch.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE woolwitch.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE woolwitch.payments ENABLE ROW LEVEL SECURITY;

-- ========================================
-- SECURITY AUDIT LOG
-- ========================================

-- Document this security hardening for compliance
COMMENT ON SCHEMA woolwitch IS 
  'Woolwitch e-commerce schema. Security features: RLS on all tables, '
  'principle of least privilege, sensitive data protection, admin-only upload policies. '
  'See docs/SECURITY.md for full security documentation and audit history.';

-- ========================================
-- DEFAULT PRIVILEGES FOR FUTURE OBJECTS
-- ========================================

-- Update default privileges to be more restrictive
ALTER DEFAULT PRIVILEGES IN SCHEMA woolwitch 
  REVOKE ALL ON TABLES FROM anon, authenticated;

-- Service role and postgres keep full access
ALTER DEFAULT PRIVILEGES IN SCHEMA woolwitch 
  GRANT ALL ON TABLES TO service_role, postgres;

-- Sequences can remain accessible (they don't contain sensitive data)
-- Functions remain executable (they're protected by RLS and SECURITY DEFINER)
