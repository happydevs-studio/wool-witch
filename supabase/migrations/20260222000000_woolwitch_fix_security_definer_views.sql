-- Fix Security Definer Views
-- Recreates all woolwitch_api views with SECURITY INVOKER to ensure RLS policies
-- on underlying tables are enforced for the querying user, not the view creator.
-- References: https://supabase.com/docs/guides/database/database-linter?lint=0010_security_definer_view

-- ========================================
-- PRODUCTS VIEW
-- ========================================

DROP VIEW IF EXISTS woolwitch_api.products_view CASCADE;
CREATE VIEW woolwitch_api.products_view
WITH (security_invoker = true)
AS
SELECT
  id,
  name,
  description,
  price,
  price_max,
  image_url,
  category,
  stock_quantity,
  delivery_charge,
  is_available,
  created_at,
  sort_order,
  custom_properties
FROM woolwitch.products
WHERE is_available = true OR woolwitch.is_admin();

COMMENT ON VIEW woolwitch_api.products_view IS 'Public view of available products with custom properties support';

GRANT SELECT ON woolwitch_api.products_view TO authenticated, anon;

-- ========================================
-- USER ROLES VIEW
-- ========================================

DROP VIEW IF EXISTS woolwitch_api.user_roles_view CASCADE;
CREATE VIEW woolwitch_api.user_roles_view
WITH (security_invoker = true)
AS
SELECT
  id,
  user_id,
  role,
  created_at
FROM woolwitch.user_roles
WHERE user_id = auth.uid() OR woolwitch.is_admin();

COMMENT ON VIEW woolwitch_api.user_roles_view IS 'View of user roles for current user or admin';

GRANT SELECT ON woolwitch_api.user_roles_view TO authenticated;

-- ========================================
-- ORDERS VIEW
-- ========================================

DROP VIEW IF EXISTS woolwitch_api.orders_view CASCADE;
CREATE VIEW woolwitch_api.orders_view
WITH (security_invoker = true)
AS
SELECT
  o.id,
  o.user_id,
  o.email,
  o.full_name,
  o.address,
  o.subtotal,
  o.delivery_total,
  o.total,
  o.status,
  o.payment_method,
  o.created_at,
  o.updated_at
FROM woolwitch.orders o
WHERE o.user_id = auth.uid() OR woolwitch.is_admin();

COMMENT ON VIEW woolwitch_api.orders_view IS 'View of orders accessible by current user or admin';

GRANT SELECT ON woolwitch_api.orders_view TO authenticated, anon;

-- ========================================
-- ORDER ITEMS VIEW
-- ========================================

DROP VIEW IF EXISTS woolwitch_api.order_items_view CASCADE;
CREATE VIEW woolwitch_api.order_items_view
WITH (security_invoker = true)
AS
SELECT
  oi.id,
  oi.order_id,
  oi.product_id,
  oi.product_name,
  oi.product_price,
  oi.quantity,
  oi.delivery_charge,
  oi.created_at
FROM woolwitch.order_items oi
WHERE EXISTS (
  SELECT 1 FROM woolwitch.orders o
  WHERE o.id = oi.order_id
  AND (o.user_id = auth.uid() OR woolwitch.is_admin())
);

COMMENT ON VIEW woolwitch_api.order_items_view IS 'View of order items for accessible orders';

GRANT SELECT ON woolwitch_api.order_items_view TO authenticated, anon;

-- ========================================
-- PAYMENTS VIEW
-- ========================================

DROP VIEW IF EXISTS woolwitch_api.payments_view CASCADE;
CREATE VIEW woolwitch_api.payments_view
WITH (security_invoker = true)
AS
SELECT
  p.id,
  p.order_id,
  p.payment_method,
  p.payment_id,
  p.status,
  p.amount,
  p.currency,
  p.created_at,
  p.updated_at
FROM woolwitch.payments p
WHERE EXISTS (
  SELECT 1 FROM woolwitch.orders o
  WHERE o.id = p.order_id
  AND (o.user_id = auth.uid() OR woolwitch.is_admin())
);

COMMENT ON VIEW woolwitch_api.payments_view IS 'View of payment information for accessible orders';

GRANT SELECT ON woolwitch_api.payments_view TO authenticated, anon;
