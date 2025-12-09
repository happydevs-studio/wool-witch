/*
  # Fix Orders RLS for Anonymous Users

  ## Problem
  Anonymous (unauthenticated) users cannot create orders because the RLS policy 
  requires auth.uid() = user_id, but NULL = NULL evaluates differently in PostgreSQL.

  ## Solution
  Update the INSERT policy to explicitly allow:
  1. Authenticated users creating their own orders (auth.uid() = user_id)
  2. Anonymous users creating orders (auth.uid() IS NULL AND user_id IS NULL)
  3. Admins creating any orders
*/

-- Drop the existing INSERT policy
DROP POLICY IF EXISTS "Users can create their own orders" ON woolwitch.orders;

-- Create new INSERT policy that properly handles anonymous users
CREATE POLICY "Users can create their own orders" ON woolwitch.orders
  FOR INSERT WITH CHECK (
    -- Authenticated users can create orders for themselves
    auth.uid() = user_id 
    -- Anonymous users can create orders (both NULL)
    OR (auth.uid() IS NULL AND user_id IS NULL)
    -- Admins can create any orders
    OR woolwitch.is_admin()
  );

-- Update order_items policy to also handle anonymous orders
DROP POLICY IF EXISTS "Users can create items for their own orders" ON woolwitch.order_items;

CREATE POLICY "Users can create items for their own orders" ON woolwitch.order_items
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM woolwitch.orders 
      WHERE id = order_id 
      AND (
        auth.uid() = user_id 
        OR (auth.uid() IS NULL AND user_id IS NULL)
        OR woolwitch.is_admin()
      )
    )
  );

-- Update payments policy to also handle anonymous orders
DROP POLICY IF EXISTS "System can create payments" ON woolwitch.payments;

CREATE POLICY "System can create payments" ON woolwitch.payments
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM woolwitch.orders 
      WHERE id = order_id 
      AND (
        auth.uid() = user_id 
        OR (auth.uid() IS NULL AND user_id IS NULL)
        OR woolwitch.is_admin()
      )
    )
  );

COMMENT ON POLICY "Users can create their own orders" ON woolwitch.orders IS 
  'Allows authenticated users to create their own orders and anonymous users to create orders with NULL user_id';
