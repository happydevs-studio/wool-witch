-- Add custom properties support to products
-- Allows products to have configurable custom fields (dropdowns, text inputs, etc.)

-- ========================================
-- ADD CUSTOM_PROPERTIES COLUMN
-- ========================================

-- Add JSONB column to store custom properties configuration
-- Structure: {
--   "properties": [
--     {
--       "id": "size",
--       "label": "Size",
--       "type": "dropdown",
--       "required": true,
--       "options": ["Small", "Medium", "Large"]
--     },
--     {
--       "id": "color",
--       "label": "Custom Color",
--       "type": "text",
--       "required": false,
--       "placeholder": "Enter preferred color"
--     }
--   ]
-- }

ALTER TABLE woolwitch.products 
  ADD COLUMN custom_properties jsonb DEFAULT NULL;

-- Add index for querying products with custom properties
CREATE INDEX idx_products_custom_properties ON woolwitch.products 
  USING GIN (custom_properties) WHERE custom_properties IS NOT NULL;

COMMENT ON COLUMN woolwitch.products.custom_properties IS 
  'JSONB column storing custom property definitions for product customization (dropdowns, text fields, etc.)';

-- ========================================
-- UPDATE API LAYER FUNCTIONS
-- ========================================

-- Update get_products to include custom_properties
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
  price_max numeric,
  image_url text,
  category text,
  stock_quantity integer,
  delivery_charge numeric,
  is_available boolean,
  created_at timestamptz,
  sort_order integer,
  custom_properties jsonb
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
    p.price_max,
    p.image_url,
    p.category,
    p.stock_quantity,
    p.delivery_charge,
    p.is_available,
    p.created_at,
    p.sort_order,
    p.custom_properties
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

-- Update get_product_by_id to include custom_properties
DROP FUNCTION IF EXISTS woolwitch_api.get_product_by_id(uuid) CASCADE;
CREATE FUNCTION woolwitch_api.get_product_by_id(p_product_id uuid)
RETURNS TABLE (
  id uuid,
  name text,
  description text,
  price numeric,
  price_max numeric,
  image_url text,
  category text,
  stock_quantity integer,
  delivery_charge numeric,
  is_available boolean,
  created_at timestamptz,
  sort_order integer,
  custom_properties jsonb
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
    p.price_max,
    p.image_url,
    p.category,
    p.stock_quantity,
    p.delivery_charge,
    p.is_available,
    p.created_at,
    p.sort_order,
    p.custom_properties
  FROM woolwitch.products p
  WHERE p.id = p_product_id;
END;
$$;

-- Update get_products_by_ids to include custom_properties
DROP FUNCTION IF EXISTS woolwitch_api.get_products_by_ids(uuid[]) CASCADE;
CREATE FUNCTION woolwitch_api.get_products_by_ids(p_product_ids uuid[])
RETURNS TABLE (
  id uuid,
  name text,
  description text,
  price numeric,
  price_max numeric,
  image_url text,
  category text,
  stock_quantity integer,
  delivery_charge numeric,
  is_available boolean,
  created_at timestamptz,
  sort_order integer,
  custom_properties jsonb
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
    p.price_max,
    p.image_url,
    p.category,
    p.stock_quantity,
    p.delivery_charge,
    p.is_available,
    p.created_at,
    p.sort_order,
    p.custom_properties
  FROM woolwitch.products p
  WHERE p.id = ANY(p_product_ids);
END;
$$;

-- Drop existing create_product function to avoid ambiguity
DROP FUNCTION IF EXISTS woolwitch_api.create_product(text, text, numeric, text, text, integer, numeric, boolean, integer, numeric) CASCADE;

-- Update create_product function to include custom_properties
CREATE FUNCTION woolwitch_api.create_product(
  p_name text,
  p_description text,
  p_price numeric,
  p_image_url text,
  p_category text,
  p_stock_quantity integer DEFAULT 0,
  p_delivery_charge numeric DEFAULT 0,
  p_is_available boolean DEFAULT true,
  p_sort_order integer DEFAULT NULL,
  p_price_max numeric DEFAULT NULL,
  p_custom_properties jsonb DEFAULT NULL
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
  -- Check admin permissions
  IF NOT woolwitch.is_admin() THEN
    RAISE EXCEPTION 'Only admins can create products';
  END IF;

  -- Calculate sort_order if not provided
  IF p_sort_order IS NULL THEN
    SELECT COALESCE(MAX(sort_order), 0) + 1 INTO v_sort_order
    FROM woolwitch.products;
  ELSE
    v_sort_order := p_sort_order;
  END IF;

  -- Insert product with custom properties
  INSERT INTO woolwitch.products (
    name,
    description,
    price,
    image_url,
    category,
    stock_quantity,
    delivery_charge,
    is_available,
    sort_order,
    price_max,
    custom_properties
  ) VALUES (
    p_name,
    p_description,
    p_price,
    p_image_url,
    p_category,
    p_stock_quantity,
    p_delivery_charge,
    p_is_available,
    v_sort_order,
    p_price_max,
    p_custom_properties
  ) RETURNING id INTO v_product_id;

  RETURN v_product_id;
END;
$$;

-- Drop existing update_product function to avoid ambiguity
DROP FUNCTION IF EXISTS woolwitch_api.update_product(uuid, text, text, numeric, text, text, integer, numeric, boolean, integer, numeric) CASCADE;

-- Update update_product function to include custom_properties
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
  p_sort_order integer DEFAULT NULL,
  p_price_max numeric DEFAULT NULL,
  p_custom_properties jsonb DEFAULT NULL
)
RETURNS void
SECURITY DEFINER
SET search_path = woolwitch, woolwitch_api, public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Check admin permissions
  IF NOT woolwitch.is_admin() THEN
    RAISE EXCEPTION 'Only admins can update products';
  END IF;

  -- Update product
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
    sort_order = COALESCE(p_sort_order, sort_order),
    price_max = p_price_max,
    custom_properties = p_custom_properties
  WHERE id = p_product_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Product not found';
  END IF;
END;
$$;

-- Grant permissions (function signatures are now unambiguous)
GRANT EXECUTE ON FUNCTION woolwitch_api.get_products TO authenticated, anon;
GRANT EXECUTE ON FUNCTION woolwitch_api.get_product_by_id TO authenticated, anon;
GRANT EXECUTE ON FUNCTION woolwitch_api.get_products_by_ids TO authenticated, anon;
GRANT EXECUTE ON FUNCTION woolwitch_api.create_product TO authenticated;
GRANT EXECUTE ON FUNCTION woolwitch_api.update_product TO authenticated;
