# Schema Migration Summary: woolwitch → woolwitch_api

## Overview

This document summarizes the migration from direct `woolwitch` schema access to using the `woolwitch_api` schema layer exclusively in the application.

## Problem Statement

The application was directly accessing tables in the `woolwitch` schema (the data layer), which broke when security policies were applied to secure the schema. The issue manifested as "No products display in the website if I secure the woolwitch schema layer."

## Solution

Migrate all application code to use the `woolwitch_api` schema, which provides:
- **Views** for read-only data access with Row Level Security (RLS)
- **Functions** for data mutations with built-in security checks and validation

## Architecture

```
┌─────────────────────────────────────────────────┐
│           Application Layer (React/TS)          │
│  - Uses supabase client configured for         │
│    woolwitch_api schema                         │
└─────────────────┬───────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────┐
│         API Layer (woolwitch_api schema)        │
│  - Views: products_view, user_roles_view, etc.  │
│  - Functions: get_products(), create_order(),   │
│               update_product(), etc.            │
└─────────────────┬───────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────┐
│        Data Layer (woolwitch schema)            │
│  - Tables: products, orders, user_roles, etc.   │
│  - Internal functions: is_admin(), triggers     │
│  - Business logic and validation                │
└─────────────────────────────────────────────────┘
```

## Files Changed

### 1. Core Configuration

**src/lib/supabase.ts**
- Changed: `db: { schema: 'woolwitch' }` → `db: { schema: 'woolwitch_api' }`
- Impact: All Supabase client operations now default to woolwitch_api schema

### 2. Authentication

**src/contexts/AuthContext.tsx**
- Changed: `.from('user_roles')` → `.from('user_roles_view')`
- Impact: Admin status checking now uses view with RLS

### 3. Data Services

**src/lib/dataService.ts**
- Changed: All `.from('products')` → `.from('products_view')`
- Methods affected:
  - `getProductList()`
  - `getProductSummaries()`
  - `getProductDetails()`
  - `getCategories()`
- Impact: Product data fetching now uses read-only view

**src/lib/cartDebug.ts**
- Changed: `.from('products')` → `.from('products_view')`
- Impact: Cart validation uses view instead of direct table access

### 4. Order Services

**src/lib/orderService.ts**
- Complete migration from direct table access to API functions
- Now imports and uses functions from `apiService.ts`:
  - `createOrder()` → uses `apiCreateOrder()` function
  - `updateOrderStatus()` → uses `apiUpdateOrderStatus()` function
  - `getUserOrders()` → uses `apiGetUserOrders()` function
  - `getAllOrders()` → uses `apiGetAllOrders()` function
  - `getOrderById()` → uses `apiGetOrderById()` function
  - `getOrderItems()` → uses `apiGetOrderItems()` function
  - `createPaymentRecord()` → uses `apiCreatePayment()` function
- Impact: All order operations now go through secure API functions with validation

### 5. Admin Interface

**src/pages/Admin.tsx**
- Changed to import and use API functions from `apiService.ts`:
  - `fetchAllProducts()` → uses `getProducts()` function
  - `handleSave()` → uses `createProduct()` or `updateProduct()` functions
  - `handleDelete()` → uses `deleteProduct()` function
- Impact: Admin operations now use API layer with built-in security checks

### 6. Test Scripts

**bin/test-api-layer.mjs**
- Changed: `db: { schema: 'woolwitch' }` → `db: { schema: 'woolwitch_api' }`
- Impact: Test script now validates woolwitch_api schema functionality

## API Layer Functions Used

### Product Operations
- `get_products(category, search, limit, offset)` - Fetch products with filters
- `get_product_by_id(product_id)` - Fetch single product
- `get_products_by_ids(product_ids[])` - Fetch multiple products
- `get_categories()` - Get available categories
- `create_product(...)` - Create product (admin only)
- `update_product(...)` - Update product (admin only)
- `delete_product(product_id)` - Delete product (admin only)

### Order Operations
- `create_order(...)` - Create order with items (validates prices)
- `create_payment(...)` - Record payment
- `update_order_status(order_id, status)` - Update order status (admin)
- `update_payment_status(payment_id, status, details)` - Update payment
- `get_user_orders(limit)` - Fetch user's orders
- `get_all_orders(filters...)` - Fetch all orders (admin)
- `get_order_by_id(order_id)` - Fetch specific order
- `get_order_items(order_id)` - Fetch order items

### Views Used
- `products_view` - Available products (read-only)
- `user_roles_view` - User role information (read-only)
- `orders_view` - User's orders (read-only)
- `order_items_view` - Order line items (read-only)
- `payments_view` - Payment information (read-only)

## Security Benefits

1. **Row Level Security (RLS)**: Views enforce RLS policies automatically
2. **Admin Checks**: Functions include `woolwitch.is_admin()` checks where needed
3. **Price Validation**: Order creation validates prices against product table server-side
4. **Payment Security**: Payment status restricted to 'pending' from client
5. **Audit Trail**: Functions can log operations centrally
6. **Rate Limiting**: Built into API functions (e.g., `check_order_rate_limit()`)

## Testing

To verify the migration:

1. **Start the database**:
   ```bash
   task db:start
   # or
   supabase start
   ```

2. **Run API layer tests**:
   ```bash
   node bin/test-api-layer.mjs
   ```

3. **Test in development**:
   ```bash
   task dev
   # or
   npm start
   ```

4. **Verify**:
   - Products display on shop page
   - Admin can create/edit/delete products
   - Orders can be created
   - Authentication works correctly

## Files NOT Changed

The following files remain unchanged as they use service role keys or are specific tests:

- `bin/upload-products.mjs` - Uses SERVICE_ROLE_KEY for admin operations
- `bin/test-schema.mjs` - Tests direct schema access (intentionally left to verify blocking)
- `bin/debug-products.mjs` - Debug utility
- `bin/analyze-optimization.mjs` - Analysis utility

These scripts have elevated permissions and can access the data layer directly.

## Migration Checklist

- [x] Update Supabase client configuration
- [x] Migrate AuthContext to use views
- [x] Migrate dataService to use views
- [x] Migrate cartDebug to use views
- [x] Migrate orderService to use API functions
- [x] Migrate Admin component to use API functions
- [x] Update test scripts
- [x] Document changes

## Rollback Instructions

If you need to rollback these changes:

1. Revert `src/lib/supabase.ts` to use `woolwitch` schema
2. Revert all `.from('*_view')` calls back to `.from('table_name')`
3. Revert orderService.ts to use direct table access instead of API functions
4. Revert Admin.tsx to use direct table access

However, the better approach is to fix any issues with the API layer rather than rolling back, as the API layer provides better security and abstraction.

## Next Steps

1. **Testing**: Thoroughly test all functionality in development
2. **Monitoring**: Monitor for any errors in production after deployment
3. **Documentation**: Update any additional documentation that references direct table access
4. **Training**: Ensure team members understand the new API layer pattern

## References

- [DATABASE_API_LAYER.md](./DATABASE_API_LAYER.md) - Complete API layer documentation
- Migration files: `supabase/migrations/20260111104650_woolwitch_api_layer.sql`
