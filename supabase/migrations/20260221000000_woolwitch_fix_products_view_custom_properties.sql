-- Fix products_view to include custom_properties column
-- This migration adds the missing custom_properties column to the products_view
-- which was added in the custom_properties migration but not propagated to the view

DROP VIEW IF EXISTS woolwitch_api.products_view CASCADE;
CREATE VIEW woolwitch_api.products_view AS
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
