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

-- Update create_product function to include custom_properties
CREATE OR REPLACE FUNCTION woolwitch_api.create_product(
  p_name text,
  p_description text,
  p_price numeric,
  p_image_url text,
  p_category text,
  p_stock_quantity integer DEFAULT 0,
  p_delivery_charge numeric DEFAULT 0,
  p_is_available boolean DEFAULT true,
  p_price_max numeric DEFAULT NULL,
  p_custom_properties jsonb DEFAULT NULL
)
RETURNS uuid AS $$
DECLARE
  v_product_id uuid;
BEGIN
  -- Check admin permissions
  IF NOT woolwitch.is_admin() THEN
    RAISE EXCEPTION 'Admin access required to create products';
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
    p_price_max,
    p_custom_properties
  ) RETURNING id INTO v_product_id;

  RETURN v_product_id;
END;
$$ LANGUAGE plpgsql 
   SECURITY DEFINER
   SET search_path = woolwitch, woolwitch_api, auth, pg_catalog;

-- Update update_product function to include custom_properties
CREATE OR REPLACE FUNCTION woolwitch_api.update_product(
  p_product_id uuid,
  p_name text DEFAULT NULL,
  p_description text DEFAULT NULL,
  p_price numeric DEFAULT NULL,
  p_image_url text DEFAULT NULL,
  p_category text DEFAULT NULL,
  p_stock_quantity integer DEFAULT NULL,
  p_delivery_charge numeric DEFAULT NULL,
  p_is_available boolean DEFAULT NULL,
  p_price_max numeric DEFAULT NULL,
  p_custom_properties jsonb DEFAULT NULL
)
RETURNS void AS $$
BEGIN
  -- Check admin permissions
  IF NOT woolwitch.is_admin() THEN
    RAISE EXCEPTION 'Admin access required to update products';
  END IF;

  -- Update product (only non-null values)
  UPDATE woolwitch.products
  SET
    name = COALESCE(p_name, name),
    description = COALESCE(p_description, description),
    price = COALESCE(p_price, price),
    image_url = COALESCE(p_image_url, image_url),
    category = COALESCE(p_category, category),
    stock_quantity = COALESCE(p_stock_quantity, stock_quantity),
    delivery_charge = COALESCE(p_delivery_charge, delivery_charge),
    is_available = COALESCE(p_is_available, is_available),
    price_max = CASE WHEN p_price_max IS NOT NULL THEN p_price_max ELSE price_max END,
    custom_properties = CASE WHEN p_custom_properties IS NOT NULL THEN p_custom_properties ELSE custom_properties END
  WHERE id = p_product_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Product not found: %', p_product_id;
  END IF;
END;
$$ LANGUAGE plpgsql 
   SECURITY DEFINER
   SET search_path = woolwitch, woolwitch_api, auth, pg_catalog;

-- Grant permissions
GRANT EXECUTE ON FUNCTION woolwitch_api.create_product TO authenticated;
GRANT EXECUTE ON FUNCTION woolwitch_api.update_product TO authenticated;
