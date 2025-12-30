# Deployment Security Guide

This document outlines security best practices and requirements for deploying the Wool Witch application.

## Table of Contents

- [GitHub Secrets Configuration](#github-secrets-configuration)
- [Database Security](#database-security)
- [Network Security](#network-security)
- [Authentication Security](#authentication-security)
- [Monitoring and Auditing](#monitoring-and-auditing)
- [Incident Response](#incident-response)

## GitHub Secrets Configuration

### Required Secrets

The following secrets must be configured in GitHub repository settings (Settings → Secrets and variables → Actions):

1. **SUPABASE_PROJECT_REF** (Added for security)
   - Description: Your Supabase project reference ID
   - Format: `abcdefghijklmnop` (20 characters)
   - Security: Keep this private, never log or expose in workflow outputs
   - How to get: Extract from your Supabase project URL: `https://[PROJECT_REF].supabase.co`

2. **SUPABASE_ACCESS_TOKEN**
   - Description: Personal access token for Supabase CLI
   - How to get: Generate at https://app.supabase.com/account/tokens
   - Permissions: Project write access
   - Security: Rotate every 90 days

3. **VITE_SUPABASE_URL**
   - Description: Your Supabase project API URL
   - Format: `https://[project-ref].supabase.co`
   - Security: Can be public (embedded in client), but keep in secrets for consistency

4. **VITE_SUPABASE_ANON_KEY**
   - Description: Supabase anonymous (public) key
   - Security: This is safe to expose in client code (RLS protects data)
   - Never use: service_role key in client code

5. **NETLIFY_AUTH_TOKEN**
   - Description: Netlify authentication token
   - How to get: Netlify User Settings → Applications → Personal access tokens
   - Permissions: Deploy access to site
   - Security: Rotate every 90 days

6. **NETLIFY_SITE_ID**
   - Description: Netlify site identifier
   - Format: UUID
   - How to get: Netlify site settings → Site details → API ID

### Security Best Practices for Secrets

- ✅ Never commit secrets to git
- ✅ Never log secrets in workflow outputs
- ✅ Use GitHub's secret masking (automatic for configured secrets)
- ✅ Rotate secrets every 90 days
- ✅ Use environment-specific secrets
- ✅ Limit secret access to necessary workflows only
- ❌ Never use service_role key in workflows (unless absolutely necessary and audited)
- ❌ Never extract sensitive data from secrets using string manipulation
- ❌ Never store secrets in environment files committed to git

### Previous Security Issue (FIXED)

**Issue**: The deployment workflow previously extracted the project reference from the VITE_SUPABASE_URL using sed:
```yaml
# ❌ INSECURE (old code)
supabase link --project-ref $(echo "${{ secrets.VITE_SUPABASE_URL }}" | sed 's/.*\/\/\([^.]*\).*/\1/')
```

**Problem**: This exposed the project reference in workflow logs, which could be used by attackers to identify the target Supabase project.

**Fix**: Now uses dedicated secret:
```yaml
# ✅ SECURE (current code)
supabase link --project-ref "${{ secrets.SUPABASE_PROJECT_REF }}"
```

## Database Security

### Row Level Security (RLS)

All tables have RLS enabled with carefully designed policies:

#### Products Table
- **Public Read**: Anyone can view available products
- **Admin Only Write**: Only admins can create/update/delete products
- **Policy Functions**: Use `woolwitch.is_admin()` for admin checks

#### Orders Table
- **User Access**: Users can view their own orders
- **Admin Access**: Admins can view all orders
- **Anonymous Orders**: Allowed for guest checkout (with rate limiting)
- **Validation**: Order totals validated before insertion

#### Payments Table
- **Linked to Orders**: Access controlled through order ownership
- **Amount Validation**: Payment amounts must match order totals
- **Audit Trail**: All payment operations logged

#### User Roles Table
- **Self-View**: Users can view their own role
- **Admin Only Write**: Only admins can change roles (via database)

### Security Enhancements (Added in Migration 20251230153000)

1. **Rate Limiting**
   - Anonymous order creation limited to 10 per hour globally
   - Prevents order flooding attacks
   - Authenticated users have no limit

2. **Order Validation**
   - Totals must be non-negative
   - Total = Subtotal + Delivery (exactly)
   - Maximum order total: £10,000
   - Prevents manipulation of order totals

3. **Payment Validation**
   - Payment amount must match order total
   - Prevents payment/order mismatch attacks

4. **Audit Logging**
   - All order creation events logged
   - Includes user, timestamp, totals, and anonymous flag
   - Admin-only access to audit logs
   - Useful for security investigations

5. **Storage Security**
   - Prevents directory traversal (.. in paths)
   - Prevents absolute paths
   - Filename length validation
   - Only authenticated users can upload

### Database Best Practices

- ✅ All tables have RLS enabled
- ✅ Policies use SECURITY DEFINER functions for admin checks
- ✅ Separate woolwitch schema for application data
- ✅ Service role used only for admin operations
- ✅ Anonymous key used for client operations (RLS enforced)
- ✅ Triggers validate data integrity
- ✅ Audit logs track sensitive operations

## Network Security

### Supabase Configuration

- **Anonymous Key**: Safe to expose (RLS enforced)
- **Service Role Key**: Never expose in client code
- **JWT Tokens**: Short-lived (1 hour), auto-refresh enabled
- **CORS**: Configured in Supabase dashboard
- **API Rate Limiting**: Default Supabase limits apply

### Netlify Configuration

- **HTTPS**: Enforced by default
- **Headers**: Security headers configured (see below)
- **Environment Variables**: Set in Netlify dashboard
- **Build Environment**: Isolated per deployment

### Recommended Security Headers

Add to `netlify.toml` or Netlify dashboard:

```toml
[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "DENY"
    X-Content-Type-Options = "nosniff"
    X-XSS-Protection = "1; mode=block"
    Referrer-Policy = "strict-origin-when-cross-origin"
    Permissions-Policy = "geolocation=(), microphone=(), camera=()"
    Content-Security-Policy = "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com; connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.stripe.com; img-src 'self' data: https://*.supabase.co; style-src 'self' 'unsafe-inline'; font-src 'self' data:; frame-src https://js.stripe.com;"
```

## Authentication Security

### User Authentication

- **Methods**: Email/Password, Google OAuth
- **Password Requirements**: Enforced by Supabase (min 6 chars)
- **Email Confirmation**: Optional (disabled for ease of local dev)
- **Session Management**: JWT with refresh tokens
- **Token Rotation**: Enabled (10 second reuse interval)

### Admin Authentication

- **Role Assignment**: Manual via database
- **Role Check**: Server-side function `woolwitch.is_admin()`
- **Session Validation**: Checked on every request
- **Privilege Escalation**: Not possible (role stored in database)

### OAuth Security (Google)

**Local Development**:
- Mock authentication for convenience
- No real OAuth credentials needed
- Auto-generates test users

**Production**:
- Real Google OAuth
- Client ID and Secret in Supabase dashboard
- Redirect URL whitelisted
- User metadata stored securely

## Monitoring and Auditing

### Security Scanning

The security workflow (`.github/workflows/security.yml`) runs:

1. **CodeQL Analysis**
   - Scans for code vulnerabilities
   - Runs on push, PR, and daily schedule
   - Blocks deployment on critical issues

2. **Dependency Review**
   - Scans for vulnerable dependencies
   - Runs on pull requests
   - Blocks merge on high severity issues
   - Denies GPL-2.0 and GPL-3.0 licenses

3. **Secret Scanning**
   - Uses TruffleHog to detect committed secrets
   - Scans entire git history
   - Alerts on verified secrets only

4. **NPM Audit**
   - Checks for known vulnerabilities in npm packages
   - Runs on every deployment
   - Alerts on critical and high severity issues

### Audit Logs

Application audit logs are stored in `woolwitch.audit_log`:

```sql
-- View recent security events
SELECT * FROM woolwitch.audit_log 
ORDER BY created_at DESC 
LIMIT 100;

-- Check for suspicious anonymous orders
SELECT * FROM woolwitch.audit_log 
WHERE event_type = 'order_created' 
  AND event_data->>'is_anonymous' = 'true'
ORDER BY created_at DESC;
```

### Monitoring Checklist

- [ ] Check Supabase dashboard for unusual activity
- [ ] Review audit logs weekly
- [ ] Monitor GitHub security alerts
- [ ] Review Netlify deployment logs
- [ ] Check for failed authentication attempts
- [ ] Monitor anonymous order patterns

## Incident Response

### Security Incident Procedure

1. **Identify**: Detect potential security issue
2. **Contain**: Limit the impact
3. **Investigate**: Determine scope and cause
4. **Remediate**: Fix the vulnerability
5. **Document**: Record incident details
6. **Review**: Update security procedures

### Common Incidents

#### Compromised Credentials

**Symptoms**: Unexpected database changes, unauthorized deployments

**Actions**:
1. Rotate all affected secrets immediately
2. Review audit logs for unauthorized access
3. Check git history for committed secrets
4. Force logout all users if needed
5. Document the incident

#### SQL Injection Attempt

**Symptoms**: Unusual database errors, audit log entries

**Actions**:
1. Review RLS policies
2. Check for bypassed policies
3. Review query logs in Supabase
4. Verify parameterized queries used
5. Update policies if needed

#### Rate Limit Exceeded

**Symptoms**: High order creation rate, performance issues

**Actions**:
1. Review audit logs for suspicious patterns
2. Temporarily reduce rate limit if needed
3. Block suspicious IP addresses at Netlify level
4. Consider adding IP-based rate limiting

#### Exposed Secret

**Symptoms**: GitHub security alert, secret scanner detection

**Actions**:
1. Rotate the exposed secret immediately
2. Review where the secret was exposed
3. Check if the secret was used
4. Update .gitignore if necessary
5. Consider git history rewrite if in commit history

### Emergency Contacts

- **Supabase Support**: support@supabase.io
- **Netlify Support**: support@netlify.com
- **GitHub Security**: https://github.com/security/advisories

## Compliance

### Data Protection

- **User Data**: Stored in Supabase (EU region recommended)
- **Personal Information**: Email, name, address (for orders)
- **Data Retention**: Indefinite (for order history)
- **Data Access**: Users can view their own data
- **Data Deletion**: Manual via admin or on request

### Privacy Policy

- Document what data is collected
- Explain how data is used
- Describe data retention policy
- Provide contact for data requests
- Comply with GDPR if serving EU customers

## Security Checklist

### Pre-Deployment

- [ ] All secrets configured in GitHub
- [ ] Service role key never used in client code
- [ ] RLS policies tested and working
- [ ] Security headers configured
- [ ] OAuth providers configured
- [ ] Rate limiting enabled
- [ ] Audit logging enabled
- [ ] Security scanning passing

### Post-Deployment

- [ ] Verify site loads correctly
- [ ] Test authentication flows
- [ ] Verify admin access control
- [ ] Check security headers (use securityheaders.com)
- [ ] Monitor initial traffic
- [ ] Review deployment logs

### Regular Maintenance

- [ ] Rotate secrets every 90 days
- [ ] Review audit logs monthly
- [ ] Update dependencies monthly
- [ ] Review security alerts weekly
- [ ] Test backup and restore procedures quarterly

## Additional Resources

- [Supabase Security Documentation](https://supabase.com/docs/guides/security)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [GitHub Security Best Practices](https://docs.github.com/en/actions/security-guides/security-hardening-for-github-actions)
- [Netlify Security](https://docs.netlify.com/security/)

---

*Last Updated: 2025-12-30*
*Document Version: 1.0*
