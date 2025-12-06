/*
  # Setup Authentication and User Roles

  ## Overview
  Sets up authentication and user roles (admin/user) for the Woolwitch shop.
  Only authenticated admins can create, update, or delete products.

  ## New Tables
    - `user_roles`
      - `id` (uuid, primary key) - Unique identifier
      - `user_id` (uuid) - References auth.users
      - `role` (text) - Either 'admin' or 'user'
      - `created_at` (timestamptz) - When the role was assigned

  ## Security
    - Enable RLS on `user_roles` table
    - Update RLS policies on `products` table to allow admin modifications
    - Anyone can still view available products
    - Only admins can insert, update, or delete products

  ## Functions
    - Helper function to check if a user is an admin
*/

-- Create user_roles table
CREATE TABLE IF NOT EXISTS user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role text NOT NULL CHECK (role IN ('admin', 'user')),
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own role
CREATE POLICY "Users can view their own role"
  ON user_roles
  FOR SELECT
  USING (auth.uid() = user_id);

-- Helper function to check if current user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing product policies
DROP POLICY IF EXISTS "Anyone can view available products" ON products;

-- New policies for products table
CREATE POLICY "Anyone can view available products"
  ON products
  FOR SELECT
  USING (is_available = true);

CREATE POLICY "Admins can view all products"
  ON products
  FOR SELECT
  USING (is_admin());

CREATE POLICY "Admins can insert products"
  ON products
  FOR INSERT
  WITH CHECK (is_admin());

CREATE POLICY "Admins can update products"
  ON products
  FOR UPDATE
  USING (is_admin());

CREATE POLICY "Admins can delete products"
  ON products
  FOR DELETE
  USING (is_admin());

-- Function to automatically create a user role when a user signs up
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO user_roles (user_id, role)
  VALUES (NEW.id, 'user');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create user role on signup
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
