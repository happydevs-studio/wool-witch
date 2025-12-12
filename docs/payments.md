# Payment Processing Guide

## Overview

Wool Witch supports two payment methods:
- **Card Payment** - Mock system for testing and development
- **PayPal Payment** - Secure PayPal integration for real payments

This document serves as the single source of truth for all payment-related configuration, testing, and deployment.

## Payment Methods

### Card Payment (Testing Only)
The card payment system is designed for testing and development purposes:

- **Test Card Number**: `4242 4242 4242 4242`
- **Expiry**: Any future date (e.g., `12/25`)
- **CVC**: Any 3 digits (e.g., `123`)
- **Order Processing**: Immediate order creation with mock transaction ID

### PayPal Payment (Production Ready)
PayPal integration provides secure, real payment processing:

- **Sandbox Testing**: Full PayPal sandbox integration for development
- **Production Ready**: Live PayPal payments for customer orders
- **Currency**: GBP (British Pounds)
- **Transaction Flow**: PayPal window → payment approval → order creation

## Environment Configuration

### Development Environment (.env.local)
```bash
# PayPal Configuration
VITE_PAYPAL_CLIENT_ID_SANDBOX=your_sandbox_client_id
VITE_PAYPAL_CLIENT_ID_PRODUCTION=your_production_client_id
VITE_APP_ENV=development
```

### Production Environment
```bash
# PayPal Configuration
VITE_PAYPAL_CLIENT_ID_PRODUCTION=your_live_production_client_id
VITE_APP_ENV=production
```

## PayPal Setup

### 1. Development Setup (Sandbox)
1. Visit [PayPal Developer Portal](https://developer.paypal.com/developer/applications/)
2. Create a sandbox application
3. Copy the **Client ID** from your sandbox app
4. Add `VITE_PAYPAL_CLIENT_ID_SANDBOX` to `.env.local`

### 2. Production Setup
1. Create PayPal Business Account (or use existing)
2. Complete business verification in PayPal
3. Create production application in PayPal Developer Portal
4. Copy the **Client ID** from your production app
5. Set `VITE_PAYPAL_CLIENT_ID_PRODUCTION` in production environment
6. Set `VITE_APP_ENV=production` in production deployment

### 3. Test Accounts (Sandbox)
- **Test Buyer Email**: `buyer@example.com`
- **Test Buyer Password**: `test123456`
- **Currency**: GBP
- **Delivery**: Calculated per item

## Database Schema

The payment system uses three main tables in the `woolwitch` schema:

### Orders Table
```sql
CREATE TABLE woolwitch.orders (
  id uuid PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id),
  email text NOT NULL,
  full_name text NOT NULL,
  address jsonb NOT NULL,
  subtotal numeric(10, 2) NOT NULL,
  delivery_total numeric(10, 2) NOT NULL,
  total numeric(10, 2) NOT NULL,
  status text CHECK (status IN ('pending', 'paid', 'shipped', 'delivered', 'cancelled')),
  payment_method text CHECK (payment_method IN ('card', 'paypal')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

### Order Items Table
```sql
CREATE TABLE woolwitch.order_items (
  id uuid PRIMARY KEY,
  order_id uuid REFERENCES woolwitch.orders(id),
  product_id uuid REFERENCES woolwitch.products(id),
  product_name text NOT NULL,
  product_price numeric(10, 2) NOT NULL,
  quantity integer NOT NULL,
  delivery_charge numeric(10, 2) NOT NULL
);
```

### Payments Table
```sql
CREATE TABLE woolwitch.payments (
  id uuid PRIMARY KEY,
  order_id uuid REFERENCES woolwitch.orders(id),
  payment_method text CHECK (payment_method IN ('card', 'paypal')),
  payment_id text, -- PayPal transaction ID or card reference
  status text CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  amount numeric(10, 2) NOT NULL,
  currency text DEFAULT 'GBP',
  paypal_details jsonb -- PayPal response data for auditing
);
```

## Development Workflow

### Start Development Environment
```bash
task dev          # Start Supabase + development server
task dev-only     # Start only dev server (assumes DB running)
```

### Database Management
```bash
task db:reset     # Reset and apply all migrations
task db:status    # Check database connection
```

### Testing
```bash
npm run test      # Run lint and typecheck
npm run typecheck # TypeScript validation only
```

## Customer Payment Flow

### 1. Add Items to Cart
- Browse products and add to cart
- Cart persists in localStorage
- Delivery charges calculated per item

### 2. Proceed to Checkout
- Enter shipping information (required for both payment methods)
- All fields must be completed before payment options appear

### 3. Choose Payment Method
- **Card Payment**: Fill in card details form
- **PayPal Payment**: Click PayPal button (requires shipping info first)

### 4. Complete Payment

#### Card Payment Flow:
1. Enter test card number: `4242 4242 4242 4242`
2. Enter any future expiry and CVC
3. Submit form
4. Order created immediately with mock transaction ID

#### PayPal Payment Flow:
1. Click PayPal button after completing shipping form
2. PayPal popup window opens
3. Login with sandbox credentials (`buyer@example.com` / `test123456`)
4. Review and approve payment in PayPal
5. Return to Wool Witch for order confirmation
6. Order created with PayPal transaction details

### 5. Order Confirmation
- Order confirmation displayed
- Cart cleared automatically
- Order stored in database with payment details

## API Integration

### Order Creation
```typescript
const orderData: CreateOrderData = {
  email: 'customer@example.com',
  fullName: 'John Doe',
  address: { 
    address: '123 Main St', 
    city: 'London', 
    postcode: 'SW1A 1AA' 
  },
  cartItems: [{ product, quantity: 2 }],
  paymentMethod: 'paypal', // or 'card'
  paymentId: 'PAYPAL_TRANSACTION_ID',
  paypalDetails: { /* PayPal response data */ }
};

const order = await createOrder(orderData);
```

### Order Retrieval
```typescript
// Get user's orders
const userOrders = await getUserOrders(limit);

// Get specific order
const order = await getOrderById(orderId);

// Admin: Get all orders with filters
const allOrders = await getAllOrders({
  status: 'pending',
  paymentMethod: 'paypal',
  limit: 50
});
```

## Security

### Row Level Security (RLS)
- Enabled on all order-related tables
- Users can only access their own orders
- Admin users can access all orders
- PayPal payment verification ensures order totals match payments

### Data Protection
- No sensitive payment data stored locally
- PayPal handles all payment processing
- Only transaction IDs and audit information stored
- Environment-based configuration prevents credential leakage

### Payment Verification
- PayPal payments verified through PayPal API before order creation
- Order totals validated against payment amounts
- Failed payments do not create orders
- Comprehensive error handling for payment failures

## Troubleshooting

### PayPal Button Not Loading
1. Check browser console for PayPal SDK errors
2. Verify correct PayPal client ID is set for current environment
3. Ensure shipping information is completed before PayPal button appears
4. Check that `VITE_APP_ENV` matches your intended environment

### Database Connection Issues
1. Run `task db:status` to check Supabase connection
2. Try `task db:reset` to refresh database with latest migrations
3. Ensure Docker is running for local Supabase development
4. Check that environment variables are properly set

### Payment Processing Errors
1. **PayPal Errors**: Check PayPal developer console for API errors
2. **Order Creation Failures**: Verify database permissions and schema
3. **Environment Issues**: Ensure correct PayPal client IDs for environment
4. **Type Errors**: Run `npm run typecheck` and regenerate types if needed

### Common Error Messages
- `PayPal client ID not configured`: Check environment variables
- `PayPal SDK failed to load`: Network or configuration issue
- `Order validation failed`: Check order data structure
- `Payment verification failed`: PayPal payment amount mismatch

## Testing

### Manual Testing Checklist
- [ ] Card payment completes successfully
- [ ] PayPal sandbox payment completes successfully
- [ ] Order appears in database with correct details
- [ ] Cart clears after successful payment
- [ ] Error handling works for failed payments
- [ ] PayPal button loads correctly
- [ ] Mobile responsive checkout flow

### Automated Testing
```bash
# Run PayPal integration tests
npm run test:paypal

# Test database schema
node bin/test-schema.mjs

# Comprehensive test suite
npm run test
```

## Production Deployment

### Pre-Deployment Checklist
- [ ] PayPal Business Account verified
- [ ] Production PayPal application created
- [ ] Production client ID obtained
- [ ] Environment variables configured correctly
- [ ] Staging environment tested with production PayPal credentials

### Deployment Steps
1. Set `VITE_PAYPAL_CLIENT_ID_PRODUCTION` in production environment
2. Set `VITE_APP_ENV=production` in production deployment
3. Deploy application with updated environment variables
4. Verify PayPal production integration
5. Monitor initial transactions for any issues

### Post-Deployment Verification
- [ ] Production PayPal payments working
- [ ] Order creation and storage functioning
- [ ] Customer payment flow smooth
- [ ] Error handling appropriate for customers
- [ ] Payment success rates monitored

## Monitoring

### Key Metrics
- Payment success rate (target: >95%)
- Order completion rate
- PayPal payment failures
- Customer checkout abandonment

### Error Monitoring
- PayPal API errors
- Order creation failures
- Payment verification issues
- Customer experience problems

### Regular Maintenance
- Monitor PayPal developer updates
- Review payment error logs
- Update test credentials as needed
- Validate security configurations

## Support

### Customer Issues
- Provide clear error messages for payment failures
- Direct customers to retry with different payment method if needed
- Ensure customer support has access to order and payment status

### Development Issues
- Check environment configuration first
- Review PayPal developer documentation
- Use PayPal sandbox for testing
- Consult payment integration logs for debugging

### Business Requirements
- All payments in GBP currency
- Delivery charges calculated per item
- Order tracking for customer service
- Payment audit trail for accounting
