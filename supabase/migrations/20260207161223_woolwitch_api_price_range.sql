-- Update API layer to support price_max for price ranges
-- Migration: 20260207161223_woolwitch_api_price_range

-- Update products view to include price_max
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
  created_at
FROM woolwitch.products
WHERE is_available = true OR woolwitch.is_admin();

-- Update get_products function to include price_max
CREATE OR REPLACE FUNCTION woolwitch_api.get_products(
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
  created_at timestamptz
) AS $$
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
    p.created_at
  FROM woolwitch.products p
  WHERE 
    (p.is_available = true OR woolwitch.is_admin())
    AND (p_category IS NULL OR p.category = p_category)
    AND (
      p_search IS NULL 
      OR p.name ILIKE '%' || p_search || '%'
      OR p.description ILIKE '%' || p_search || '%'
      OR p.category ILIKE '%' || p_search || '%'
    )
  ORDER BY p.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Update get_product_by_id function to include price_max
CREATE OR REPLACE FUNCTION woolwitch_api.get_product_by_id(p_product_id uuid)
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
  created_at timestamptz
) AS $$
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
    p.created_at
  FROM woolwitch.products p
  WHERE p.id = p_product_id
    AND (p.is_available = true OR woolwitch.is_admin());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Update get_products_by_ids function to include price_max
CREATE OR REPLACE FUNCTION woolwitch_api.get_products_by_ids(p_product_ids uuid[])
RETURNS TABLE (
  id uuid,
  name text,
  description text,
  price numeric,
  price_max numeric,
  image_url text,
  category text,
  delivery_charge numeric
) AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Update create_product function to include price_max
CREATE OR REPLACE FUNCTION woolwitch_api.create_product(
  p_name text,
  p_description text,
  p_price numeric,
  p_image_url text,
  p_category text,
  p_stock_quantity integer DEFAULT 0,
  p_delivery_charge numeric DEFAULT 0,
  p_is_available boolean DEFAULT true,
  p_price_max numeric DEFAULT NULL
)
RETURNS uuid AS $$
DECLARE
  v_product_id uuid;
BEGIN
  IF NOT woolwitch.is_admin() THEN
    RAISE EXCEPTION 'Admin access required';
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
    p_price_max
  )
  RETURNING id INTO v_product_id;
  
  RETURN v_product_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update update_product function to include price_max
CREATE OR REPLACE FUNCTION woolwitch_api.update_product(
  p_product_id uuid,
  p_name text,
  p_description text,
  p_price numeric,
  p_image_url text,
  p_category text,
  p_stock_quantity integer,
  p_delivery_charge numeric,
  p_is_available boolean,
  p_price_max numeric DEFAULT NULL
)
RETURNS void AS $$
BEGIN
  IF NOT woolwitch.is_admin() THEN
    RAISE EXCEPTION 'Admin access required';
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
    price_max = p_price_max
  WHERE id = p_product_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
