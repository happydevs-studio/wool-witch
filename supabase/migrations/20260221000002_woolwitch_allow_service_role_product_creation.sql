-- Allow service role to create products for server-side uploads
-- 
-- SECURITY MODEL:
-- - Service Role (SUPABASE_SERVICE_ROLE_KEY): Full access (for server-side scripts only)
-- - Authenticated Users: Must be admin to create products
-- - Anon Users: Cannot call this function (no GRANT permission)
--
-- CRITICAL: SUPABASE_SERVICE_ROLE_KEY must NEVER be exposed in client code or committed to git
-- This should only exist in:
--   - Local: .env.local (added to .gitignore)
--   - Production: Secure server environment variables
--
-- DEPLOYMENT SAFETY:
-- This migration is backward compatible - existing authenticated admin calls will continue to work.
-- It only adds new functionality for service_role access.

DROP FUNCTION IF EXISTS woolwitch_api.create_product(text, text, numeric, text, text, integer, numeric, boolean, integer, numeric, jsonb) CASCADE;

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
  -- PERMISSION CHECK:
  -- Allow: Service role (auth.uid() IS NULL) when called with SUPABASE_SERVICE_ROLE_KEY
  -- Allow: Authenticated users who are admins
  -- Deny: Authenticated users who are not admins
  --
  -- auth.uid() IS NULL when using service_role key (server-side)
  -- auth.uid() IS NOT NULL when using authenticated user credentials (checked by is_admin())
  IF auth.uid() IS NOT NULL AND NOT woolwitch.is_admin() THEN
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

-- Permissions: Both authenticated users and service_role can call the function
-- The function itself enforces who can actually use it
GRANT EXECUTE ON FUNCTION woolwitch_api.create_product TO authenticated, service_role;

-- Also update update_product to allow service_role for consistency
DROP FUNCTION IF EXISTS woolwitch_api.update_product(uuid, text, text, numeric, text, text, integer, numeric, boolean, integer, numeric, jsonb) CASCADE;

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
  -- PERMISSION CHECK:
  -- Allow: Service role (auth.uid() IS NULL) when called with SUPABASE_SERVICE_ROLE_KEY
  -- Allow: Authenticated users who are admins
  -- Deny: Authenticated users who are not admins
  IF auth.uid() IS NOT NULL AND NOT woolwitch.is_admin() THEN
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

GRANT EXECUTE ON FUNCTION woolwitch_api.update_product TO authenticated, service_role;

