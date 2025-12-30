# Data Retention and Privacy Policy

## Overview

This document outlines the data retention policies for the Woolwitch e-commerce platform, including legal requirements, compliance considerations, and implementation guidelines.

**Compliance Standards**: GDPR, UK Data Protection Act 2018, PCI-DSS

---

## Data Categories and Retention Periods

### 1. Customer Account Data

| Data Type | Retention Period | Legal Basis | Deletion Method |
|-----------|------------------|-------------|-----------------|
| Email address | Account lifetime + 30 days | Contract performance | Soft delete, then hard delete |
| Password hash | Account lifetime | Contract performance | Immediate on account deletion |
| Authentication tokens | 1 hour (JWT expiry) | Contract performance | Automatic expiry |
| User role assignments | Account lifetime | Legitimate interest | Cascade delete with account |

**Implementation Status**: ⚠️ Manual deletion only  
**Automated**: JWT tokens expire automatically  
**Recommended**: Implement automated account deletion workflow

### 2. Order and Transaction Data

| Data Type | Retention Period | Legal Basis | Deletion Method |
|-----------|------------------|-------------|-----------------|
| Order records | 7 years | Legal obligation (accounting) | Archive, then delete |
| Customer name | 7 years | Legal obligation | Archive with order |
| Shipping address | 7 years | Legal obligation | Archive with order |
| Order items | 7 years | Legal obligation | Archive with order |
| Order totals | 7 years | Legal obligation | Archive with order |

**Implementation Status**: ⚠️ No automated deletion  
**Legal Requirement**: UK HMRC requires 6 years, we keep 7 for safety  
**Recommended**: Implement order archival system

### 3. Payment Data

| Data Type | Retention Period | Legal Basis | Deletion Method |
|-----------|------------------|-------------|-----------------|
| Stripe payment_intent_id | 7 years | Legal obligation | Archive with order |
| Stripe payment_method_id | 7 years | Legitimate interest (refunds) | Archive with order |
| Card last 4 digits | 7 years | Customer service | Archive with order |
| Card brand | 7 years | Customer service | Archive with order |
| PayPal transaction IDs | 7 years | Legal obligation | Archive with order |
| **PayPal payer_email** | **90 days** | **Audit/fraud prevention** | **Delete after 90 days** |
| PayPal transaction amounts | 7 years | Legal obligation | Archive with order |

**Implementation Status**: ❌ PayPal email NOT automatically deleted  
**Security Concern**: `payer_email` in `paypal_details` JSONB contains PII  
**Action Required**: Implement automated deletion or masking

**PCI-DSS Compliance**:
- ✅ No full card numbers stored
- ✅ No CVV/CVC stored
- ✅ Only last 4 digits and brand stored (allowed)
- ✅ Card data handled by Stripe (PCI-compliant)

### 4. Product and Inventory Data

| Data Type | Retention Period | Legal Basis | Deletion Method |
|-----------|------------------|-------------|-----------------|
| Product information | Indefinite | Business operation | Manual deletion by admin |
| Product images | Indefinite | Business operation | Manual deletion by admin |
| Stock quantities | Indefinite | Business operation | Update in place |

**Implementation Status**: ✅ Manual management working as intended  
**No automation needed**: Products managed by admin

### 5. System Logs and Analytics

| Data Type | Retention Period | Legal Basis | Deletion Method |
|-----------|------------------|-------------|-----------------|
| Error logs | 90 days | Legitimate interest | Automated (Supabase) |
| Access logs | 90 days | Legitimate interest | Automated (Supabase) |
| Performance metrics | 90 days | Legitimate interest | Automated (Supabase) |

**Implementation Status**: ✅ Managed by Supabase  
**No action required**: Platform handles log rotation

---

## GDPR Rights Implementation

### Right to Access (Article 15)

**Status**: ✅ Implemented

Users can access their data through:
- Orders page (authenticated users see their order history)
- Profile data visible in auth context
- API endpoints respect RLS policies

**Admin Support**: Can export user data on request (manual process)

### Right to Erasure (Article 17)

**Status**: ⚠️ Partially Implemented (manual only)

**Current Process**:
1. User requests account deletion via email/support
2. Admin verifies identity
3. Admin runs SQL deletion script
4. Confirmation sent to user

**Exceptions**:
- Order records retained for 7 years (legal obligation)
- Payment records retained for 7 years (legal obligation)
- User account marked as deleted, PII anonymized

**Recommended Implementation**:
```sql
-- Anonymize user data while keeping orders
UPDATE woolwitch.orders 
SET email = 'deleted-user-' || id || '@example.com',
    full_name = 'Deleted User',
    address = jsonb_build_object(
      'address', 'Address Redacted',
      'city', 'City Redacted', 
      'postcode', 'REDACTED'
    )
WHERE user_id = '<user_id>' 
  AND created_at < NOW() - INTERVAL '7 years';

-- Delete user account
DELETE FROM auth.users WHERE id = '<user_id>';
```

### Right to Rectification (Article 16)

**Status**: ⚠️ Manual Process

**Current Process**:
- User contacts support to correct data
- Admin updates database manually
- Confirmation sent to user

**Recommended**: Add user profile editing functionality

### Right to Data Portability (Article 20)

**Status**: ⚠️ Manual Export

**Current Process**:
- User requests data export via support
- Admin queries database and exports JSON/CSV
- Secure delivery to user

**Recommended**: Implement self-service data export

### Right to Restrict Processing (Article 18)

**Status**: ❌ Not Implemented

**Recommended**: Add account suspension feature with data freeze

---

## Data Minimization Principles

### What We Collect

#### Essential Data (Required for Service)
- ✅ Email (order communication)
- ✅ Name (shipping label)
- ✅ Shipping address (order fulfillment)
- ✅ Payment metadata (accounting, refunds)

#### Optional Data (Service Enhancement)
- ✅ User account (order history, faster checkout)
- ❌ Marketing preferences (not implemented)
- ❌ Analytics/tracking (minimal, no third-party)

### What We DON'T Collect

- ❌ Phone numbers (not required)
- ❌ Date of birth (not required)
- ❌ Gender/demographics (not required)
- ❌ Social security numbers (never)
- ❌ Full credit card numbers (PCI-DSS violation)
- ❌ CVV/CVC codes (PCI-DSS violation)
- ❌ Unnecessary tracking cookies

---

## Implementation Roadmap

### Phase 1: Critical (Immediate)

- [ ] **Remove PayPal email after 90 days**
  - Create scheduled function to mask `payer_email` in `paypal_details`
  - Test on staging environment
  - Deploy and monitor

- [ ] **Document admin data access procedures**
  - Create runbook for customer data requests
  - Train admin staff on GDPR rights
  - Log all data access requests

### Phase 2: Important (Next 3 Months)

- [ ] **Implement order archival**
  - Create archive table for orders > 7 years
  - Move old orders to archive
  - Soft delete after archival

- [ ] **Add data export functionality**
  - Build self-service export page
  - Generate JSON export of user data
  - Include orders, payments, profile

- [ ] **Create account deletion workflow**
  - Self-service deletion request
  - Grace period (30 days)
  - Automated anonymization after grace period

### Phase 3: Enhancement (Next 6 Months)

- [ ] **Automated compliance reporting**
  - Track data subject requests
  - Generate compliance reports
  - Dashboard for privacy officer

- [ ] **Advanced data masking**
  - Implement field-level encryption for addresses
  - Mask email addresses in logs
  - Redact sensitive data in backups > 7 years

- [ ] **Privacy-enhancing technologies**
  - Consider homomorphic encryption for analytics
  - Implement differential privacy for aggregate queries
  - Evaluate zero-knowledge proofs for authentication

---

## Database Cleanup Scripts

### PayPal Email Cleanup (Run Monthly)

```sql
-- Mask PayPal payer_email after 90 days
-- This should be run as a scheduled job

UPDATE woolwitch.payments
SET paypal_details = paypal_details - 'payer_email'
WHERE 
  payment_method = 'paypal' 
  AND created_at < NOW() - INTERVAL '90 days'
  AND paypal_details IS NOT NULL
  AND paypal_details ? 'payer_email';

-- Log the cleanup
-- SELECT COUNT(*) AS cleaned_records FROM ...
```

**Recommended**: Set up as Supabase Edge Function with cron trigger

### Old Order Archival (Run Annually)

```sql
-- Archive orders older than 7 years
-- This script should be reviewed by legal before running

-- Step 1: Copy to archive table (create if needed)
CREATE TABLE IF NOT EXISTS woolwitch.orders_archive (LIKE woolwitch.orders INCLUDING ALL);

-- Step 2: Move old orders
INSERT INTO woolwitch.orders_archive 
SELECT * FROM woolwitch.orders 
WHERE created_at < NOW() - INTERVAL '7 years';

-- Step 3: Verify archive
-- Check count matches before deleting

-- Step 4: Delete from main table (ONLY after verification)
-- DELETE FROM woolwitch.orders WHERE created_at < NOW() - INTERVAL '7 years';
```

### Anonymize Deleted User Data

```sql
-- Anonymize orders for deleted users
-- Keeps order records for accounting but removes PII

UPDATE woolwitch.orders 
SET 
  email = 'deleted-user-' || id || '@woolwitch.local',
  full_name = 'Deleted User',
  address = jsonb_build_object(
    'address', '[Redacted]',
    'city', '[Redacted]',
    'postcode', '[Redacted]'
  )
WHERE 
  user_id IS NOT NULL
  AND user_id NOT IN (SELECT id FROM auth.users)
  AND updated_at < NOW() - INTERVAL '30 days'; -- Grace period

-- Log anonymization
-- SELECT COUNT(*) AS anonymized_orders FROM ...
```

---

## Backup and Recovery

### Backup Retention

| Backup Type | Frequency | Retention | Encryption |
|-------------|-----------|-----------|------------|
| Full database | Daily | 30 days | AES-256 |
| Transaction logs | Continuous | 7 days | AES-256 |
| Application logs | Daily | 90 days | AES-256 |

**Managed by**: Supabase Platform  
**Restoration**: Point-in-time recovery available

### Backup Security

- ✅ Backups encrypted at rest
- ✅ Access restricted to service_role
- ✅ Geographic redundancy enabled
- ✅ Backup integrity checks automated

---

## Compliance Checklist

### GDPR Compliance

- [x] Privacy Policy published and accessible
- [x] Data collection explained to users
- [x] Legal basis for processing documented
- [x] RLS policies protect user data
- [x] Access controls implemented
- [ ] Data export functionality (manual)
- [ ] Account deletion workflow (manual)
- [ ] Data retention automation
- [ ] Breach notification procedures

### PCI-DSS Compliance

- [x] No storage of full card numbers
- [x] No storage of CVV/CVC
- [x] Card data handled by certified processor (Stripe)
- [x] Only allowed data stored (last 4, brand)
- [x] Payment data encrypted in transit
- [x] Payment data encrypted at rest
- [x] Access to payment data logged (via RLS)

### UK Data Protection Act 2018

- [x] Data controller identified (business owner)
- [x] Data processor agreements (Supabase, Stripe, PayPal)
- [x] ICO registration (required if processing >250 people's data)
- [ ] Data Protection Impact Assessment (DPIA)
- [ ] Privacy by Design implemented
- [ ] Privacy by Default configured

---

## Monitoring and Auditing

### Regular Reviews

| Review Type | Frequency | Responsible |
|-------------|-----------|-------------|
| Access logs | Weekly | Admin |
| Failed authentications | Weekly | Admin |
| Payment failures | Weekly | Admin |
| RLS policy effectiveness | Monthly | Developer |
| Data retention compliance | Quarterly | Privacy Officer |
| Full security audit | Annually | External Auditor |

### Metrics to Track

- Number of data subject requests
- Average response time
- Data deleted per retention policy
- Backup success rate
- Failed authentication attempts
- Unusual admin activity

---

## Contact and Resources

**Data Protection Officer**: [Configure in production]  
**Privacy Policy**: `/privacy-policy` page  
**Terms of Service**: `/terms-of-service` page  
**Security Contact**: [Configure in production]

**External Resources**:
- ICO Guidance: https://ico.org.uk/
- GDPR Portal: https://gdpr.eu/
- PCI Security Standards: https://www.pcisecuritystandards.org/

---

**Document Version**: 1.0  
**Last Updated**: 2024-12-30  
**Next Review**: 2025-03-30 (Quarterly)
