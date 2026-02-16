-- Add sort_order to products_view
-- Migration: 20260207163616_woolwitch_add_sort_order_to_view.sql

-- Update products_view to include sort_order column
CREATE OR REPLACE VIEW woolwitch_api.products_view AS
SELECT 
  id,
  name,
  description,
  price,
  image_url,
  category,
  stock_quantity,
  delivery_charge,
  is_available,
  created_at,
  sort_order
FROM woolwitch.products
WHERE is_available = true OR woolwitch.is_admin();

-- Add comment for documentation
COMMENT ON VIEW woolwitch_api.products_view IS 'Public view of available products with proper access control and sort order';
