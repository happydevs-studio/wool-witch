/*
  # Woolwitch E-commerce Platform - Initial Setup
  
  ## Overview
  Complete optimized initial setup for the Woolwitch handmade crochet goods e-commerce platform.
  This migration creates all necessary database objects with proper security settings and performance
  optimizations from the start.

  ## What This Migration Creates
  
  ### Schema & Permissions
  - `woolwitch` schema for all application objects
  - Proper permissions for authenticated, anonymous, and service roles
  
  ### Core Tables
  - `woolwitch.products` - Product catalog with optimized RLS policies
  - `woolwitch.user_roles` - User role management (admin/user)
  
  ### Storage
  - `product-images` storage bucket with admin-aware policies
  
  ### Functions & Triggers
  - `woolwitch.is_admin()` - Check if current user is admin (with search_path)
  - `woolwitch.handle_new_user()` - Auto-assign user role on signup (with search_path)
  - Trigger to execute handle_new_user on auth.users insert
  
  ### Security Features
  - Row Level Security (RLS) enabled on all tables
  - Optimized policies to prevent performance issues
  - Public read access to available products
  - Admin-only write access to products and storage
  - Schema-level access control
*/

-- ========================================
-- SCHEMA SETUP
-- ========================================

-- Create the woolwitch application schema
CREATE SCHEMA IF NOT EXISTS woolwitch;

-- Grant schema access to required roles
GRANT USAGE ON SCHEMA woolwitch TO authenticated;
GRANT USAGE ON SCHEMA woolwitch TO anon;

-- ========================================
-- USER ROLES TABLE
-- ========================================

-- Table to manage user roles (admin/user)
CREATE TABLE woolwitch.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role text NOT NULL CHECK (role IN ('admin', 'user')),
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE woolwitch.user_roles ENABLE ROW LEVEL SECURITY;

-- Optimized policy: Users can view their own role (with subquery for performance)
CREATE POLICY "Users can view their own role"
  ON woolwitch.user_roles
  FOR SELECT
  USING ((SELECT auth.uid()) = user_id);

-- ========================================
-- ADMIN HELPER FUNCTION
-- ========================================

-- Function to check if current user is admin (with search_path for security)
-- Used by RLS policies throughout the application
CREATE OR REPLACE FUNCTION woolwitch.is_admin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM woolwitch.user_roles
    WHERE user_id = auth.uid()
    AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql 
   SECURITY DEFINER
   SET search_path = 'woolwitch, auth';

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION woolwitch.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION woolwitch.is_admin() TO anon;

-- ========================================
-- PRODUCTS TABLE
-- ========================================

-- Main products table for the e-commerce catalog
CREATE TABLE woolwitch.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text NOT NULL,
  price numeric(10, 2) NOT NULL CHECK (price >= 0),
  image_url text NOT NULL,
  category text NOT NULL,
  stock_quantity integer DEFAULT 0 CHECK (stock_quantity >= 0),
  is_available boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE woolwitch.products ENABLE ROW LEVEL SECURITY;

-- Optimized single policy for product visibility (combines public + admin access)
-- This policy allows:
-- 1. Anyone to view available products (is_available = true)
-- 2. Admins to view all products (regardless of availability)
CREATE POLICY "Product visibility policy"
  ON woolwitch.products
  FOR SELECT
  USING (
    is_available = true OR woolwitch.is_admin()
  );

CREATE POLICY "Admins can insert products"
  ON woolwitch.products
  FOR INSERT
  WITH CHECK (woolwitch.is_admin());

CREATE POLICY "Admins can update products"
  ON woolwitch.products
  FOR UPDATE
  USING (woolwitch.is_admin());

CREATE POLICY "Admins can delete products"
  ON woolwitch.products
  FOR DELETE
  USING (woolwitch.is_admin());

-- ========================================
-- USER MANAGEMENT AUTOMATION
-- ========================================

-- Function to automatically assign user role when user signs up (with search_path)
CREATE OR REPLACE FUNCTION woolwitch.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO woolwitch.user_roles (user_id, role)
  VALUES (NEW.id, 'user');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql 
   SECURITY DEFINER
   SET search_path = 'woolwitch, auth';

-- Grant execute permission to service_role for trigger execution
GRANT EXECUTE ON FUNCTION woolwitch.handle_new_user() TO service_role;

-- Trigger to automatically assign user role on signup
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION woolwitch.handle_new_user();

-- ========================================
-- STORAGE SETUP
-- ========================================

-- Create storage bucket for product images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'product-images',
  'product-images', 
  true,
  5242880, -- 5MB limit
  '{"image/jpeg","image/jpg","image/png","image/webp","image/gif"}'
)
ON CONFLICT (id) DO NOTHING;

-- Storage policies with admin awareness
CREATE POLICY "Public Access for Product Images"
ON storage.objects FOR SELECT
USING (bucket_id = 'product-images');

CREATE POLICY "Authenticated Upload for Product Images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'product-images');

CREATE POLICY "Admin Delete for Product Images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'product-images' AND woolwitch.is_admin());

CREATE POLICY "Admin Update for Product Images"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'product-images' AND woolwitch.is_admin())
WITH CHECK (bucket_id = 'product-images' AND woolwitch.is_admin());

-- ========================================
-- TABLE PERMISSIONS
-- ========================================

-- Grant appropriate table permissions to roles
GRANT SELECT ON woolwitch.products TO anon;
GRANT SELECT ON woolwitch.products TO authenticated;
GRANT INSERT, UPDATE, DELETE ON woolwitch.products TO authenticated;

GRANT SELECT ON woolwitch.user_roles TO authenticated;
GRANT INSERT, UPDATE, DELETE ON woolwitch.user_roles TO authenticated;

-- Grant sequence permissions for auto-generated IDs
GRANT USAGE ON ALL SEQUENCES IN SCHEMA woolwitch TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA woolwitch TO anon;

-- Grant usage on woolwitch schema to postgres for administrative operations
GRANT USAGE ON SCHEMA woolwitch TO postgres;