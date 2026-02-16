-- Consolidated price range support after sort_order migrations
-- Migration: 20260216193000_woolwitch_price_range_support.sql

-- Add price_max column for optional price ranges
ALTER TABLE woolwitch.products
ADD COLUMN price_max numeric(10, 2) CHECK (price_max IS NULL OR price_max >= 0);

-- Ensure price_max is greater than or equal to price when set
ALTER TABLE woolwitch.products
ADD CONSTRAINT price_range_valid CHECK (price_max IS NULL OR price_max >= price);

-- Document price_max usage
COMMENT ON COLUMN woolwitch.products.price_max IS 'Optional maximum price for products with price ranges (e.g., varying sizes/complexity)';

-- Update get_products function to include price_max
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
    p.price_max,
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

-- Update get_product_by_id to include price_max
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
    p.price_max,
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

-- Update get_products_by_ids to include price_max
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
  delivery_charge numeric
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
    p.delivery_charge
  FROM woolwitch.products p
  WHERE p.id = ANY(p_product_ids);
END;
$$;

-- Update create_product to accept both sort_order and price_max
DROP FUNCTION IF EXISTS woolwitch_api.create_product(text, text, numeric, text, text, integer, numeric, boolean, integer) CASCADE;
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
  p_price_max numeric DEFAULT NULL
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
  IF NOT woolwitch.is_admin() THEN
    RAISE EXCEPTION 'Only admins can create products';
  END IF;

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
    sort_order,
    price_max
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
    p_price_max
  )
  RETURNING id INTO v_product_id;

  RETURN v_product_id;
END;
$$;

-- Update update_product to include both sort_order and price_max
DROP FUNCTION IF EXISTS woolwitch_api.update_product(uuid, text, text, numeric, text, text, integer, numeric, boolean, integer) CASCADE;
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
  p_price_max numeric DEFAULT NULL
)
RETURNS void
SECURITY DEFINER
SET search_path = woolwitch, woolwitch_api, public
LANGUAGE plpgsql
AS $$
BEGIN
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
    sort_order = COALESCE(p_sort_order, sort_order),
    price_max = p_price_max
  WHERE id = p_product_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Product not found';
  END IF;
END;
$$;

-- Permissions
GRANT EXECUTE ON FUNCTION woolwitch_api.get_products TO authenticated, anon;
GRANT EXECUTE ON FUNCTION woolwitch_api.get_product_by_id TO authenticated, anon;
GRANT EXECUTE ON FUNCTION woolwitch_api.get_products_by_ids TO authenticated, anon;
GRANT EXECUTE ON FUNCTION woolwitch_api.create_product TO authenticated;
GRANT EXECUTE ON FUNCTION woolwitch_api.update_product TO authenticated;

-- Update products_view to include price_max and sort_order
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
  sort_order
FROM woolwitch.products
WHERE is_available = true OR woolwitch.is_admin();

COMMENT ON VIEW woolwitch_api.products_view IS 'Public view of available products with price range and sort order support';

GRANT SELECT ON woolwitch_api.products_view TO authenticated, anon;
