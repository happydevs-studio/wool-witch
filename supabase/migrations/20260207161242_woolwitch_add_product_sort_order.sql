-- Add sort_order column to products table for admin-controlled product ordering
-- Migration: 20260207161242_woolwitch_add_product_sort_order.sql

-- Add sort_order column to products table
ALTER TABLE woolwitch.products 
ADD COLUMN sort_order integer DEFAULT 0 NOT NULL;

-- Create index for efficient ordering
CREATE INDEX idx_products_sort_order ON woolwitch.products(sort_order, created_at DESC);

-- Set initial sort_order values based on created_at (newest first)
WITH ranked_products AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at DESC) as row_num
  FROM woolwitch.products
)
UPDATE woolwitch.products p
SET sort_order = rp.row_num
FROM ranked_products rp
WHERE p.id = rp.id;

-- Add comment for documentation
COMMENT ON COLUMN woolwitch.products.sort_order IS 'Admin-controlled sort order for products display. Lower numbers appear first.';

-- Update get_products function to use sort_order
DROP FUNCTION IF EXISTS woolwitch_api.get_products(text, text, int, int) CASCADE;
CREATE FUNCTION woolwitch_api.get_products(
  p_category text DEFAULT NULL,
  p_search text DEFAULT NULL,
  p_limit int DEFAULT 50,
  p_offset int DEFAULT 0
)
RETURNS TABLE (
  id uuid,
  name text,
  description text,
  price numeric,
  image_url text,
  category text,
  stock_quantity integer,
  delivery_charge numeric,
  is_available boolean,
  created_at timestamptz,
  sort_order integer
) 
SECURITY DEFINER
SET search_path = woolwitch, woolwitch_api, public
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.name,
    p.description,
    p.price,
    p.image_url,
    p.category,
    p.stock_quantity,
    p.delivery_charge,
    p.is_available,
    p.created_at,
    p.sort_order
  FROM woolwitch.products p
  WHERE 
    (p_category IS NULL OR p.category = p_category)
    AND (p_search IS NULL OR 
         p.name ILIKE '%' || p_search || '%' OR 
         p.description ILIKE '%' || p_search || '%' OR
         p.category ILIKE '%' || p_search || '%')
  ORDER BY p.sort_order ASC, p.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- Update get_product_by_id to include sort_order
DROP FUNCTION IF EXISTS woolwitch_api.get_product_by_id(uuid) CASCADE;
CREATE FUNCTION woolwitch_api.get_product_by_id(p_product_id uuid)
RETURNS TABLE (
  id uuid,
  name text,
  description text,
  price numeric,
  image_url text,
  category text,
  stock_quantity integer,
  delivery_charge numeric,
  is_available boolean,
  created_at timestamptz,
  sort_order integer
)
SECURITY DEFINER
SET search_path = woolwitch, woolwitch_api, public
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.name,
    p.description,
    p.price,
    p.image_url,
    p.category,
    p.stock_quantity,
    p.delivery_charge,
    p.is_available,
    p.created_at,
    p.sort_order
  FROM woolwitch.products p
  WHERE p.id = p_product_id;
END;
$$;

-- Update create_product function to accept sort_order
DROP FUNCTION IF EXISTS woolwitch_api.create_product(text, text, numeric, text, text, integer, numeric, boolean) CASCADE;
CREATE FUNCTION woolwitch_api.create_product(
  p_name text,
  p_description text,
  p_price numeric,
  p_image_url text,
  p_category text,
  p_stock_quantity integer DEFAULT 0,
  p_delivery_charge numeric DEFAULT 0,
  p_is_available boolean DEFAULT true,
  p_sort_order integer DEFAULT NULL
)
RETURNS uuid
SECURITY DEFINER
SET search_path = woolwitch, woolwitch_api, public
LANGUAGE plpgsql
AS $$
DECLARE
  v_product_id uuid;
  v_sort_order integer;
BEGIN
  -- Check if user is admin
  IF NOT woolwitch.is_admin() THEN
    RAISE EXCEPTION 'Only admins can create products';
  END IF;

  -- If sort_order not provided, use max + 1
  IF p_sort_order IS NULL THEN
    SELECT COALESCE(MAX(sort_order), 0) + 1 INTO v_sort_order
    FROM woolwitch.products;
  ELSE
    v_sort_order := p_sort_order;
  END IF;

  INSERT INTO woolwitch.products (
    name,
    description,
    price,
    image_url,
    category,
    stock_quantity,
    delivery_charge,
    is_available,
    sort_order
  ) VALUES (
    p_name,
    p_description,
    p_price,
    p_image_url,
    p_category,
    p_stock_quantity,
    p_delivery_charge,
    p_is_available,
    v_sort_order
  )
  RETURNING id INTO v_product_id;

  RETURN v_product_id;
END;
$$;

-- Update update_product function to include sort_order
DROP FUNCTION IF EXISTS woolwitch_api.update_product(uuid, text, text, numeric, text, text, integer, numeric, boolean) CASCADE;
CREATE FUNCTION woolwitch_api.update_product(
  p_product_id uuid,
  p_name text,
  p_description text,
  p_price numeric,
  p_image_url text,
  p_category text,
  p_stock_quantity integer DEFAULT 0,
  p_delivery_charge numeric DEFAULT 0,
  p_is_available boolean DEFAULT true,
  p_sort_order integer DEFAULT NULL
)
RETURNS void
SECURITY DEFINER
SET search_path = woolwitch, woolwitch_api, public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Check if user is admin
  IF NOT woolwitch.is_admin() THEN
    RAISE EXCEPTION 'Only admins can update products';
  END IF;

  UPDATE woolwitch.products
  SET
    name = p_name,
    description = p_description,
    price = p_price,
    image_url = p_image_url,
    category = p_category,
    stock_quantity = p_stock_quantity,
    delivery_charge = p_delivery_charge,
    is_available = p_is_available,
    sort_order = COALESCE(p_sort_order, sort_order)
  WHERE id = p_product_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Product not found';
  END IF;
END;
$$;

-- Create new function to bulk update product sort orders
CREATE OR REPLACE FUNCTION woolwitch_api.update_product_sort_orders(
  p_product_orders jsonb
)
RETURNS void
SECURITY DEFINER
SET search_path = woolwitch, woolwitch_api, public
LANGUAGE plpgsql
AS $$
DECLARE
  v_item jsonb;
BEGIN
  -- Check if user is admin
  IF NOT woolwitch.is_admin() THEN
    RAISE EXCEPTION 'Only admins can update product sort orders';
  END IF;

  -- Update each product's sort_order
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_product_orders)
  LOOP
    UPDATE woolwitch.products
    SET sort_order = (v_item->>'sort_order')::integer
    WHERE id = (v_item->>'id')::uuid;
  END LOOP;
END;
$$;

-- Add permissions
GRANT EXECUTE ON FUNCTION woolwitch_api.get_products TO authenticated, anon;
GRANT EXECUTE ON FUNCTION woolwitch_api.get_product_by_id TO authenticated, anon;
GRANT EXECUTE ON FUNCTION woolwitch_api.create_product TO authenticated;
GRANT EXECUTE ON FUNCTION woolwitch_api.update_product TO authenticated;
GRANT EXECUTE ON FUNCTION woolwitch_api.update_product_sort_orders TO authenticated;

-- Add comments for documentation
COMMENT ON FUNCTION woolwitch_api.update_product_sort_orders IS 'Admin function to bulk update product sort orders. Expects jsonb array of {id, sort_order} objects.';
