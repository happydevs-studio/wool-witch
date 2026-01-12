# Database API Layer Architecture

## Overview

The Wool Witch application follows a **separation of concerns** pattern where the database is divided into two schemas:

1. **`woolwitch`** - The data layer (internal tables, business logic)
2. **`woolwitch_api`** - The API layer (exposed functions and views)

This architecture ensures that:
- Only necessary operations are exposed to the UI
- Implementation details are hidden from the client
- Database schema can evolve without breaking the UI
- Security is enforced at the API boundary
- Business logic is centralized in the database

## Schema Structure

### Data Layer (`woolwitch` schema)

Contains all tables and internal business logic:

**Tables:**
- `user_roles` - User role assignments
- `products` - Product catalog
- `orders` - Customer orders
- `order_items` - Line items in orders
- `payments` - Payment transactions
- `audit_log` - Audit trail

**Internal Functions:**
- `is_admin()` - Check if user is admin
- `handle_new_user()` - Auto-assign user role on signup
- `update_updated_at_column()` - Trigger function for timestamps
- `validate_order_totals()` - Business logic validation
- `validate_payment_amount()` - Payment validation
- `check_order_rate_limit()` - Rate limiting
- `log_order_creation()` - Audit logging

### API Layer (`woolwitch_api` schema)

Contains only functions and views exposed to the UI:

**Views (Read-Only):**
- `products_view` - Available products
- `user_roles_view` - User role information
- `orders_view` - User's orders
- `order_items_view` - Order line items
- `payments_view` - Payment information

**Functions (Operations):**

*Product Operations:*
- `get_products(category, search, limit, offset)` - Fetch products with filters
- `get_product_by_id(product_id)` - Fetch single product
- `get_products_by_ids(product_ids[])` - Fetch multiple products for cart
- `get_categories()` - Get available categories
- `create_product(...)` - Create product (admin only)
- `update_product(...)` - Update product (admin only)
- `delete_product(product_id)` - Delete product (admin only)

*Order Operations:*
- `create_order(...)` - Create order with items (validates prices against product table)
- `create_payment(...)` - Record payment (validates amount, restricts status to 'pending')
- `update_payment_status(payment_id, status, details)` - Update payment status (admin/service only)
- `update_order_status(order_id, status)` - Update order status (admin only)
- `get_user_orders(limit)` - Fetch user's orders
- `get_all_orders(filters...)` - Fetch all orders (admin only)
- `get_order_by_id(order_id)` - Fetch specific order
- `get_order_items(order_id)` - Fetch order items

## Client Usage

### Using the API Service

The application provides an `apiService` module that wraps all API calls:

```typescript
import { 
  getProducts, 
  createOrder, 
  updateOrderStatus 
} from '@/lib/apiService';

// Fetch products
const products = await getProducts({ 
  category: 'Crochet', 
  limit: 20 
});

// Create order
const orderId = await createOrder({
  email: 'customer@example.com',
  fullName: 'Jane Doe',
  address: { address: '123 Main St', city: 'London', postcode: 'SW1A 1AA' },
  subtotal: 45.00,
  deliveryTotal: 5.00,
  total: 50.00,
  paymentMethod: 'card',
  orderItems: [
    {
      product_id: 'uuid-here',
      product_name: 'Crochet Blanket',
      product_price: 45.00,
      quantity: 1,
      delivery_charge: 5.00
    }
  ]
});

// Update order status (admin only)
await updateOrderStatus(orderId, 'shipped');

// Update payment status (admin/service only - typically from webhooks)
await updatePaymentStatus(paymentId, 'completed', {
  transaction_id: 'txn_123',
  timestamp: new Date().toISOString()
});
```

**Payment Workflow:**
1. Client calls `createOrder()` with product IDs and quantities
2. Server validates prices against product table
3. Client calls `createPayment()` with order ID (status: 'pending')
4. Payment provider processes payment (Stripe/PayPal)
5. Webhook handler calls `updatePaymentStatus()` to mark as 'completed'
6. Order status automatically updates to 'paid'

### Direct View Access (Advanced)

For read-only operations where you need more control:

```typescript
const { data } = await supabase
  .from('products_view')
  .select('*')
  .eq('category', 'Crochet')
  .limit(10);
```

**Important:** Views are read-only. All mutations must go through API functions.

## Benefits of This Pattern

### 1. Security
- Tables are not directly accessible from the UI
- All operations go through controlled API functions
- Row Level Security (RLS) is still applied
- Admin-only operations are enforced in functions
- **Price validation**: Order creation validates all prices against the product table server-side
- **Payment security**: Payment status restricted to 'pending' from client; updates require admin/service role
- **Amount validation**: Payment amounts validated against order totals

### 2. Abstraction
- UI doesn't need to know about table structure
- Complex joins are hidden in views
- Business logic is centralized
- Implementation can change without breaking UI

### 3. Maintainability
- Clear separation of concerns
- Single source of truth for operations
- Easier to test and debug
- Consistent error handling

### 4. Performance
- Functions can be optimized independently
- Views can include pre-computed data
- Caching is easier with stable APIs
- Network round trips are reduced

## Migration Strategy

When migrating from direct table access to API layer:

1. **Create API functions** - Add functions to `woolwitch_api` schema
2. **Update client code** - Replace direct table access with API calls
3. **Test thoroughly** - Ensure all operations work correctly
4. **Remove table grants** - Optionally restrict direct table access
5. **Update documentation** - Document all API functions

## Best Practices

### For Developers

**DO:**
- Use API functions for all data operations
- Add business logic to database functions
- Document function parameters and return types
- Handle errors appropriately in the UI
- Use views for read-only queries when appropriate

**DON'T:**
- Bypass API layer to access tables directly
- Put business logic in the UI
- Expose internal implementation details
- Create functions without proper security checks
- Forget to grant execute permissions on new functions
- Create functions without setting explicit search_path (security risk)

### For Database Changes

When adding new features:

1. **Add tables** to `woolwitch` schema
2. **Create views/functions** in `woolwitch_api` schema
3. **Update TypeScript types** in `src/types/database.ts`
4. **Update apiService** to expose new operations
5. **Document** the new APIs in this file

## Security Considerations

### Function Security

All API functions use `SECURITY DEFINER` which means they run with the privileges of the function owner (postgres). This allows:

- Controlled access to underlying tables
- Consistent permission enforcement
- Centralized security logic
- Audit logging

**Important:** Every function must check permissions explicitly and set search_path:

```sql
CREATE OR REPLACE FUNCTION woolwitch_api.admin_operation()
RETURNS void AS $$
BEGIN
  IF NOT woolwitch.is_admin() THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;
  
  -- Perform operation
END;
$$ LANGUAGE plpgsql 
   SECURITY DEFINER
   SET search_path = woolwitch, woolwitch_api, auth, pg_catalog;
```

**Search Path Security:** Always set an explicit `search_path` on functions with `SECURITY DEFINER` to prevent search_path hijacking attacks. This ensures functions only access objects from trusted schemas.

Recommended search paths:
- For woolwitch_api functions: `SET search_path = woolwitch, woolwitch_api, auth, pg_catalog`
- For woolwitch functions: `SET search_path = woolwitch, auth, pg_catalog`
- For trigger functions: `SET search_path = woolwitch, pg_catalog`

### View Security

Views inherit the permissions of the underlying tables but provide an additional layer:

- Row Level Security (RLS) still applies
- Filters can be built into the view
- Only necessary columns are exposed
- Joins are pre-computed securely

## Troubleshooting

### Common Issues

**"Function does not exist"**
- Ensure migration has been applied
- Check schema name: `woolwitch_api.function_name`
- Verify function is granted to appropriate roles

**"Permission denied"**
- Check if function has SECURITY DEFINER
- Verify execute permissions are granted
- Ensure user role is correct (for admin operations)

**"Cannot access table"**
- This is expected - use API functions instead
- Views are for read-only access only
- Check if you're using the right API function

### Testing API Functions

Use Supabase Studio SQL editor:

```sql
-- Test product fetch
SELECT * FROM woolwitch_api.get_products(
  p_category := 'Crochet',
  p_search := NULL,
  p_limit := 10,
  p_offset := 0
);

-- Test order creation
SELECT woolwitch_api.create_order(
  p_email := 'test@example.com',
  p_full_name := 'Test User',
  p_address := '{"address": "123 Main St", "city": "London", "postcode": "SW1A 1AA"}'::jsonb,
  p_subtotal := 45.00,
  p_delivery_total := 5.00,
  p_total := 50.00,
  p_payment_method := 'card',
  p_order_items := '[{"product_id": "uuid-here", "product_name": "Test", "product_price": 45.00, "quantity": 1, "delivery_charge": 5.00}]'::jsonb
);
```

## TypeScript Integration

### Type Definitions

After applying the migration, you may need to update `src/types/database.ts` to include the new RPC functions. The current Supabase TypeScript generator may not automatically detect custom functions.

**Temporary Solution:**
The `apiService.ts` wrapper handles all type conversions and provides proper TypeScript types for the API functions. Use it instead of direct `supabase.rpc()` calls.

**Future Enhancement:**
Consider using Supabase CLI's type generation after migrations:
```bash
# Generate types (when supported)
supabase gen types typescript --local > src/types/database.ts
```

### Using API Service

The recommended pattern is to use the typed wrapper functions:

```typescript
import { getProducts, createOrder } from '@/lib/apiService';

// TypeScript knows the exact return types
const products: Product[] = await getProducts({ category: 'Crochet' });
const orderId: string = await createOrder(orderData);
```

This provides better type safety than direct RPC calls.

## Future Enhancements

Potential improvements to the API layer:

1. **Pagination metadata** - Return total count with paginated queries
2. **Batch operations** - Functions for bulk updates
3. **Webhooks** - Database triggers to external services
4. **Materialized views** - For performance-critical queries
5. **Query optimization** - Index creation based on API usage
6. **Rate limiting** - Built into API functions
7. **Caching headers** - Function-level cache hints

## References

- [PostgreSQL Functions](https://www.postgresql.org/docs/current/sql-createfunction.html)
- [PostgreSQL Views](https://www.postgresql.org/docs/current/sql-createview.html)
- [Supabase Database Functions](https://supabase.com/docs/guides/database/functions)
- [Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
