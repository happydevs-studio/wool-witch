-- Add price_max to products_view (after sort_order migration)
-- Migration: 20260216192227_woolwitch_add_price_max_to_products_view.sql

-- Update products_view to include both sort_order and price_max columns
CREATE OR REPLACE VIEW woolwitch_api.products_view AS
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
  sort_order
FROM woolwitch.products
WHERE is_available = true OR woolwitch.is_admin();

-- Update comment for documentation
COMMENT ON VIEW woolwitch_api.products_view IS 'Public view of available products with price range and sort order support';
