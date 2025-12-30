# Security Documentation

## Overview

This document outlines the security measures, policies, and best practices implemented in the Woolwitch e-commerce platform database and application.

**Last Security Audit**: 2024-12-30  
**Compliance Standards**: GDPR, PCI-DSS (payment processing)

## Table of Contents

1. [Database Security](#database-security)
2. [Authentication & Authorization](#authentication--authorization)
3. [Payment Security](#payment-security)
4. [Data Protection](#data-protection)
5. [Access Control](#access-control)
6. [Security Policies](#security-policies)
7. [Incident Response](#incident-response)

---

## Database Security

### Row Level Security (RLS)

All tables in the `woolwitch` schema have Row Level Security enabled:

- ✅ `woolwitch.products` - RLS enabled
- ✅ `woolwitch.user_roles` - RLS enabled
- ✅ `woolwitch.orders` - RLS enabled
- ✅ `woolwitch.order_items` - RLS enabled
- ✅ `woolwitch.payments` - RLS enabled

### Permission Model

The database follows the **Principle of Least Privilege**:

| Role | Products | Orders | Payments | User Roles | Admin Functions |
|------|----------|--------|----------|------------|-----------------|
| `anon` | SELECT (via RLS) | INSERT (own orders) | INSERT (own payments) | ❌ | ❌ |
| `authenticated` | SELECT (via RLS) | SELECT/INSERT/UPDATE (own) | SELECT/INSERT (own) | SELECT (own) | ❌ |
| `admin` (via is_admin()) | ALL | ALL | ALL | SELECT | ✅ |
| `service_role` | ALL (bypasses RLS) | ALL | ALL | ALL | ✅ |

### Security Functions

#### `woolwitch.is_admin()`

```sql
CREATE FUNCTION woolwitch.is_admin() RETURNS boolean
  SECURITY DEFINER
  STABLE
  SET search_path = woolwitch, auth;
```

**Security Properties**:
- `SECURITY DEFINER` - Runs with elevated privileges to check user_roles table
- `STABLE` - Allows query optimization, safe because role doesn't change during transaction
- Limited search_path - Prevents SQL injection via schema manipulation
- Only returns current user's admin status (RLS prevents access to other users)

#### `woolwitch.handle_new_user()`

```sql
CREATE FUNCTION woolwitch.handle_new_user() RETURNS trigger
  SECURITY DEFINER
  SET search_path = woolwitch, auth;
```

**Security Properties**:
- Auto-assigns 'user' role to new signups
- Uses `ON CONFLICT DO NOTHING` to prevent duplicate roles
- Includes error handling to avoid breaking user creation
- Logs warnings for debugging without exposing sensitive data

---

## Authentication & Authorization

### Authentication Methods

1. **Email/Password** - Standard Supabase Auth
   - Passwords hashed with bcrypt
   - Password reset via secure email tokens
   - Email confirmation disabled for local development

2. **Google OAuth** - Third-party authentication
   - Production: Real Google OAuth via Supabase
   - Development: Mock authentication for testing
   - Redirect URL validation enforced

### Authorization Levels

1. **Anonymous Users**
   - Can view available products
   - Can create orders and payments (checkout without account)
   - Cannot access other users' data

2. **Authenticated Users**
   - Can view their own orders and payment history
   - Can view all available products
   - Can manage their profile

3. **Admin Users**
   - Full access to all products (including unavailable)
   - Can view all orders and payments
   - Can manage products (create, update, delete)
   - Can upload/delete product images

### Admin Role Assignment

Admins are assigned via database:

```sql
UPDATE woolwitch.user_roles 
SET role = 'admin' 
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'admin@example.com');
```

**Security Notes**:
- Admin status is NOT in JWT claims (prevents token manipulation)
- Admin status checked via database query on each auth state change
- RLS policies enforce admin checks at database level

---

## Payment Security

### PCI-DSS Compliance

**Card Data Handling**:
- ✅ We do NOT store full credit card numbers
- ✅ We do NOT store CVV/CVC codes
- ✅ We do NOT store card expiration dates
- ✅ Card data is handled exclusively by Stripe Elements (PCI-compliant iframe)
- ✅ Only last 4 digits and card brand are stored (allowed by PCI-DSS)

**Stored Payment Information**:

```typescript
// Stripe payment details stored in database
interface StripeDetails {
  payment_intent_id: string;      // Stripe payment identifier
  payment_method_id?: string;     // Stripe payment method ID
  last_four?: string;              // Last 4 digits of card (PCI-compliant)
  card_brand?: string;             // Card brand (Visa, Mastercard, etc.)
  // client_secret: NEVER STORED   // Intentionally excluded for security
}
```

### Payment Processing Flow

1. Customer enters card details in Stripe Elements (secure iframe)
2. Stripe creates payment intent (handled by Supabase Edge Function)
3. Payment confirmed with Stripe
4. Only payment metadata stored in database (no card details)
5. Order created with reference to Stripe payment_intent_id

### PayPal Security

**Stored PayPal Information**:

```typescript
interface PayPalDetails {
  paypal_order_id?: string;
  payer_id?: string;
  payer_email?: string;           // Minimize retention, consider masking
  transaction_id?: string;
  capture_id?: string;
  gross_amount?: number;
  fee_amount?: number;
  net_amount?: number;
}
```

**Security Considerations**:
- `payer_email` contains PII - should be masked or minimized in retention policies
- PayPal transaction IDs used for refund processing and audit trails
- All PayPal data protected by RLS policies

### Stripe Edge Function Security

File: `supabase/functions/create-payment-intent/index.ts`

**Security Features**:
- CORS headers properly configured
- Stripe secret key stored in Supabase Edge Function secrets (not in code)
- Amount validation required
- Customer email validation required
- Error messages sanitized to prevent information leakage

**Environment Variables**:
```bash
# Never commit these to git!
STRIPE_SECRET_KEY=sk_live_...  # Stored in Supabase Edge Function config
```

---

## Data Protection

### Personal Identifiable Information (PII)

The following PII is collected and stored:

| Data Type | Location | Purpose | Retention | Protection |
|-----------|----------|---------|-----------|------------|
| Email | `orders.email`, `auth.users` | Order communication, account | Indefinite | RLS policies |
| Full Name | `orders.full_name` | Shipping label | Indefinite | RLS policies |
| Shipping Address | `orders.address` (JSONB) | Order fulfillment | Indefinite | RLS policies, JSONB |
| Payment Email | `payments.paypal_details` | PayPal audit | 90 days* | RLS policies |
| Card Last 4 | `payments.stripe_details` | Customer reference | Indefinite | RLS policies, PCI-compliant |

\* _Recommended retention policy - not yet automated_

### GDPR Compliance

**Rights Supported**:

1. **Right to Access** - Users can view their order history via Orders page
2. **Right to Erasure** - Admin can delete user data (manual process)
3. **Right to Portability** - Order data available via API (authenticated users)
4. **Right to Rectification** - Users can contact admin to correct data

**Data Processing Basis**:
- **Contract Performance** - Order fulfillment requires shipping address
- **Legitimate Interest** - Payment records for accounting and fraud prevention

**Privacy Policy**: `/privacy-policy` page documents data collection and usage

### Data Encryption

**At Rest**:
- Database encryption provided by Supabase (AES-256)
- Backup encryption enabled
- Storage bucket files encrypted

**In Transit**:
- HTTPS enforced for all API requests
- TLS 1.2+ for database connections
- Supabase handles certificate management

**Application Level**:
- No additional encryption implemented for database fields
- Sensitive data protected by RLS and access controls
- Consider adding field-level encryption for highly sensitive data in future

---

## Access Control

### Storage Bucket Security

Bucket: `woolwitch-images`

**Policies**:
```sql
-- Public read for product images
CREATE POLICY "Public read product images" ON storage.objects
  FOR SELECT USING (bucket_id = 'woolwitch-images');

-- Admin-only upload (prevents abuse)
CREATE POLICY "Admin upload product images" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'woolwitch-images' AND woolwitch.is_admin());

-- Admin-only management
CREATE POLICY "Admin manage product images" ON storage.objects
  FOR ALL TO authenticated
  USING (bucket_id = 'woolwitch-images' AND woolwitch.is_admin())
  WITH CHECK (bucket_id = 'woolwitch-images' AND woolwitch.is_admin());
```

**Security Features**:
- File size limit: 50KB (prevents large file uploads)
- Allowed MIME types: Only image types
- Public read, admin-only write
- Direct URL access for performance

**Previous Issue (Fixed)**:
- ❌ Previously allowed all authenticated users to upload
- ✅ Now restricted to admins only

### API Access Control

**PostgREST API**:
- Max rows per query: 1000 (prevents DoS)
- RLS enforced on all queries
- JWT validation required for authenticated endpoints
- Schema isolation prevents cross-application access

**Anonymous Access**:
- Limited to read-only operations on public data
- Order creation allowed (checkout without account)
- Rate limiting recommended (not implemented)

---

## Security Policies

### RLS Policy Matrix

#### Products Table

| Policy | Role | Operation | Condition |
|--------|------|-----------|-----------|
| Product visibility | ALL | SELECT | `is_available = true OR is_admin()` |
| Admin product management | authenticated | ALL | `is_admin()` |

#### Orders Table

| Policy | Role | Operation | Condition |
|--------|------|-----------|-----------|
| Order access control | ALL | SELECT | `user_id = auth.uid() OR is_admin()` |
| Order creation control | ALL | INSERT | Anonymous orders OR own orders OR admin |
| Admin order management | authenticated | ALL | `is_admin()` |

#### Order Items Table

| Policy | Role | Operation | Condition |
|--------|------|-----------|-----------|
| Order items access | ALL | SELECT | User owns parent order OR admin |
| Order items creation | ALL | INSERT | Can create parent order |
| Admin order items management | authenticated | ALL | `is_admin()` |

#### Payments Table

| Policy | Role | Operation | Condition |
|--------|------|-----------|-----------|
| Payment access control | ALL | SELECT | User owns parent order OR admin |
| Payment creation control | ALL | INSERT | Can create parent order |
| Admin payment management | authenticated | ALL | `is_admin()` |

#### User Roles Table

| Policy | Role | Operation | Condition |
|--------|------|-----------|-----------|
| Users view own role | authenticated | SELECT | `user_id = auth.uid()` |

### Secure Development Practices

1. **Environment Variables**
   - Never commit `.env` files to git (`.gitignore` configured)
   - Use `.env.example` as template
   - Supabase secrets for production credentials

2. **SQL Migrations**
   - All migration files include `woolwitch_` prefix
   - Use parameterized queries (Supabase client handles this)
   - Test migrations on local database before deploying

3. **Code Review**
   - Security-sensitive changes require review
   - Check for SQL injection vulnerabilities
   - Verify RLS policies before deploying

4. **Dependency Management**
   - Regular `npm audit` for vulnerability scanning
   - Update dependencies quarterly (or when security patches released)
   - Pin major versions to prevent breaking changes

---

## Incident Response

### Security Incident Procedures

**If a security vulnerability is discovered**:

1. **Assess Severity**
   - Critical: Data breach, exposed credentials, RLS bypass
   - High: Privilege escalation, DoS vulnerability
   - Medium: Information disclosure, missing validation
   - Low: Minor information leakage, non-exploitable issues

2. **Immediate Actions**
   - For Critical/High: Disable affected functionality if possible
   - Document the vulnerability and affected systems
   - Notify team lead/security contact

3. **Remediation**
   - Develop and test fix in local environment
   - Create migration if database changes required
   - Deploy fix to production
   - Monitor for exploitation attempts

4. **Post-Incident**
   - Document root cause and fix in security log
   - Update this documentation if processes changed
   - Consider if similar vulnerabilities exist elsewhere

### Contact Information

**Security Contact**: [Configure in production]  
**Reporting Email**: [Configure in production]

---

## Security Checklist

Use this checklist when making changes:

### Adding New Table
- [ ] Enable RLS: `ALTER TABLE tablename ENABLE ROW LEVEL SECURITY;`
- [ ] Create appropriate RLS policies
- [ ] Grant minimal permissions to anon/authenticated roles
- [ ] Document PII if table contains sensitive data
- [ ] Add table to security matrix in this document

### Adding New Function
- [ ] Use `SECURITY DEFINER` only when necessary
- [ ] Set explicit `search_path` to prevent injection
- [ ] Mark as `STABLE` or `IMMUTABLE` if appropriate
- [ ] Add security comments explaining privilege model
- [ ] Test with different user roles

### Adding New API Endpoint
- [ ] Verify authentication requirements
- [ ] Check RLS policies apply correctly
- [ ] Validate all input parameters
- [ ] Sanitize error messages (no sensitive data)
- [ ] Test with anonymous and authenticated users

### Processing Payments
- [ ] Never store full card numbers
- [ ] Never store CVV/CVC
- [ ] Use Stripe/PayPal official SDKs only
- [ ] Store only allowed metadata (last 4, brand)
- [ ] Verify PCI-DSS compliance

### Handling PII
- [ ] Document in this file what PII is collected
- [ ] Explain purpose and legal basis (GDPR)
- [ ] Implement RLS policies to protect data
- [ ] Consider data retention requirements
- [ ] Update Privacy Policy page

---

## Audit History

| Date | Auditor | Changes | Migration |
|------|---------|---------|-----------|
| 2024-12-30 | Security Review | Initial security hardening, permission tightening, storage policy fixes | `20251230133235_woolwitch_security_hardening.sql` |

---

## Future Security Enhancements

### Recommended Improvements

1. **Rate Limiting**
   - Implement rate limiting on order creation (prevent abuse)
   - Consider using Supabase Edge Functions with Deno KV for rate limiting

2. **Data Retention**
   - Automate deletion of PayPal payer_email after 90 days
   - Implement order archive after 7 years (accounting requirements)
   - Regular cleanup of abandoned carts

3. **Monitoring**
   - Set up alerts for failed authentication attempts
   - Monitor for unusual admin activity
   - Track payment failures for fraud patterns

4. **Additional Encryption**
   - Consider field-level encryption for shipping addresses
   - Encrypt PayPal payer_email if long-term retention needed

5. **Audit Logging**
   - Implement audit trail for admin actions
   - Log order status changes
   - Track product modifications

6. **Backup Security**
   - Regular backup testing
   - Encrypted backup storage
   - Point-in-time recovery procedures

7. **Security Testing**
   - Annual penetration testing
   - Automated security scans in CI/CD
   - Regular dependency vulnerability scanning

---

## References

- [Supabase Security Best Practices](https://supabase.com/docs/guides/security)
- [PostgreSQL RLS Documentation](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
- [PCI DSS Requirements](https://www.pcisecuritystandards.org/)
- [GDPR Guidelines](https://gdpr.eu/)
- [Stripe Security](https://stripe.com/docs/security)
- [PayPal Security](https://developer.paypal.com/docs/security/)

---

**Document Version**: 1.0  
**Last Updated**: 2024-12-30  
**Next Review**: 2025-06-30
