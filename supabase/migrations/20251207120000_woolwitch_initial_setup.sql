-- Woolwitch E-commerce Platform - Initial Setup
-- Creates schema, core tables, functions, storage, and permissions with optimizations

-- ========================================
-- SCHEMA & BASIC PERMISSIONS
-- ========================================

CREATE SCHEMA IF NOT EXISTS woolwitch;

-- Consolidated schema permissions for all roles
GRANT USAGE ON SCHEMA woolwitch TO authenticated, anon;
GRANT ALL PRIVILEGES ON SCHEMA woolwitch TO service_role, postgres;

-- ========================================
-- USER ROLES & ADMIN FUNCTIONS
-- ========================================

CREATE TABLE woolwitch.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  role text NOT NULL CHECK (role IN ('admin', 'user')) DEFAULT 'user',
  created_at timestamptz DEFAULT now()
);

-- Optimized index for frequent admin checks
CREATE INDEX idx_user_roles_admin_lookup ON woolwitch.user_roles(user_id) 
WHERE role = 'admin';

ALTER TABLE woolwitch.user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own role" ON woolwitch.user_roles
  FOR SELECT USING (auth.uid() = user_id);

-- Optimized admin check function with caching hint
CREATE OR REPLACE FUNCTION woolwitch.is_admin()
RETURNS boolean AS $$
DECLARE
  is_admin_user boolean;
BEGIN
  SELECT (role = 'admin') INTO is_admin_user 
  FROM woolwitch.user_roles 
  WHERE user_id = auth.uid();
  
  RETURN COALESCE(is_admin_user, false);
END;
$$ LANGUAGE plpgsql 
   SECURITY DEFINER 
   STABLE
   SET search_path = woolwitch, auth;

-- Auto-assign user role on signup
CREATE OR REPLACE FUNCTION woolwitch.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO woolwitch.user_roles (user_id) VALUES (NEW.id);
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Log error but don't fail the user creation
  RETURN NEW;
END;
$$ LANGUAGE plpgsql 
   SECURITY DEFINER
   SET search_path = woolwitch, auth;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION woolwitch.handle_new_user();

-- ========================================
-- PRODUCTS TABLE
-- ========================================

CREATE TABLE woolwitch.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text NOT NULL,
  price numeric(10, 2) NOT NULL CHECK (price >= 0),
  image_url text NOT NULL,
  category text NOT NULL,
  stock_quantity integer DEFAULT 0 CHECK (stock_quantity >= 0),
  is_available boolean DEFAULT true NOT NULL,
  delivery_charge numeric(10, 2) DEFAULT 0 CHECK (delivery_charge >= 0),
  created_at timestamptz DEFAULT now()
);

-- Performance indexes
CREATE INDEX idx_products_available ON woolwitch.products(is_available, created_at DESC);
CREATE INDEX idx_products_category ON woolwitch.products(category) WHERE is_available;
CREATE INDEX idx_products_price ON woolwitch.products(price) WHERE is_available;

ALTER TABLE woolwitch.products ENABLE ROW LEVEL SECURITY;

-- Efficient RLS policies
CREATE POLICY "Product visibility" ON woolwitch.products
  FOR SELECT USING (is_available OR woolwitch.is_admin());

CREATE POLICY "Admin product management" ON woolwitch.products
  FOR ALL TO authenticated
  USING (woolwitch.is_admin())
  WITH CHECK (woolwitch.is_admin());

-- ========================================
-- OPTIMIZED STORAGE SETUP
-- ========================================

-- Create optimized storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'woolwitch-images',
  'woolwitch-images',
  true,
  52428800, -- 50MB for flexibility
  '{"image/jpeg","image/jpg","image/png","image/webp","image/avif","image/gif"}'
) ON CONFLICT (id) DO UPDATE SET
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Optimized storage policies
CREATE POLICY "Public read product images" ON storage.objects
  FOR SELECT USING (bucket_id = 'woolwitch-images');

CREATE POLICY "Authenticated upload product images" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'woolwitch-images');

CREATE POLICY "Admin manage product images" ON storage.objects
  FOR ALL TO authenticated
  USING (bucket_id = 'woolwitch-images' AND woolwitch.is_admin())
  WITH CHECK (bucket_id = 'woolwitch-images' AND woolwitch.is_admin());

-- ========================================
-- CONSOLIDATED PERMISSIONS
-- ========================================

-- Table permissions
GRANT SELECT ON ALL TABLES IN SCHEMA woolwitch TO anon;
GRANT ALL ON ALL TABLES IN SCHEMA woolwitch TO authenticated;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA woolwitch TO service_role, postgres;

-- Sequence permissions
GRANT USAGE ON ALL SEQUENCES IN SCHEMA woolwitch TO authenticated, anon;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA woolwitch TO service_role, postgres;

-- Function permissions
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA woolwitch TO authenticated, anon;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA woolwitch TO service_role, postgres;

-- Default privileges for future objects
ALTER DEFAULT PRIVILEGES IN SCHEMA woolwitch 
  GRANT ALL ON TABLES TO service_role, postgres;
ALTER DEFAULT PRIVILEGES IN SCHEMA woolwitch 
  GRANT ALL ON SEQUENCES TO service_role, postgres;
ALTER DEFAULT PRIVILEGES IN SCHEMA woolwitch 
  GRANT ALL ON FUNCTIONS TO service_role, postgres;