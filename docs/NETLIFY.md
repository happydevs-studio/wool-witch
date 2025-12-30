# Netlify Deployment Guide

This document explains the Netlify configuration for the Wool Witch application.

## Quick Start

1. **Connect Repository**: Link your GitHub repository to Netlify
2. **Configuration**: Netlify will auto-detect settings from `netlify.toml`
3. **Environment Variables**: Set in Netlify Dashboard (Site settings → Environment variables):
   ```bash
   VITE_SUPABASE_URL=https://your-project-ref.supabase.co
   VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
   ```
4. **Deploy**: Push to main branch or trigger manual deploy

## Configuration Overview

The `netlify.toml` file configures:

### Build Settings
```toml
[build]
  command = "npm run build"
  publish = "dist"

[build.environment]
  NODE_VERSION = "20"
```

- **Build command**: Runs Vite production build
- **Publish directory**: Output directory containing built assets
- **Node version**: Node.js 20 for compatibility

### Secrets Scanning Configuration

```toml
[build.processing.secrets]
  omit_keys = [
    "VITE_SUPABASE_URL",
    "VITE_SUPABASE_ANON_KEY"
  ]
```

**Why these keys are allowed:**
- These are **public keys** designed for client-side use
- The anon key is protected by Row Level Security (RLS) in the database
- Supabase documentation confirms these are safe to expose
- Reference: https://supabase.com/docs/guides/api#api-url-and-keys

**Never add to omit_keys:**
- `SUPABASE_SERVICE_ROLE_KEY` - Server-side only, full admin access
- `STRIPE_SECRET_KEY` - Server-side payment processing
- Any other secret keys or API tokens

### Security Headers

The configuration adds several security headers to protect against common attacks:

| Header | Purpose | Value |
|--------|---------|-------|
| `X-Frame-Options` | Prevent clickjacking | `DENY` |
| `X-Content-Type-Options` | Prevent MIME sniffing | `nosniff` |
| `X-XSS-Protection` | Enable XSS filtering | `1; mode=block` |
| `Referrer-Policy` | Control referrer info | `strict-origin-when-cross-origin` |
| `Content-Security-Policy` | Restrict resource loading | See CSP section below |

### Content Security Policy (CSP)

The CSP is configured to allow required third-party services:

```toml
Content-Security-Policy = """
  default-src 'self';
  script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://www.paypal.com https://www.paypalobjects.com;
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: https: blob:;
  font-src 'self' data:;
  connect-src 'self' https://*.supabase.co https://api.stripe.com https://www.paypal.com;
  frame-src https://js.stripe.com https://www.paypal.com;
  object-src 'none';
  base-uri 'self';
  form-action 'self';
  frame-ancestors 'none';
  upgrade-insecure-requests;
"""
```

**Allowed Resources:**
- **Scripts**: Self, Stripe.js, PayPal SDK
- **Styles**: Self and inline styles (for React CSS-in-JS)
- **Images**: Self, data URLs, HTTPS, blob URLs
- **Connections**: Self, Supabase API, Stripe API, PayPal API
- **Frames**: Stripe Elements, PayPal Checkout

**Security Notes:**
- `unsafe-inline` and `unsafe-eval` are required for React and some third-party libraries
- Consider using nonces for stricter inline script control in future
- `frame-ancestors 'none'` prevents the app from being embedded in iframes

### SPA Routing

```toml
[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
  force = false
  conditions = {path = "^(?!.*\\.(js|css|png|jpg|jpeg|gif|svg|ico|json|xml|txt|html)$).*"}
```

**What this does:**
- Redirects all non-file requests to `index.html`
- Allows React Router to handle client-side routing
- Preserves direct access to static assets (JS, CSS, images)
- Uses regex pattern to exclude file extensions

**Example:**
- `/shop` → `index.html` (React handles routing)
- `/js/vendor.js` → Actual JS file (no redirect)
- `/img/product.jpg` → Actual image (no redirect)

## Environment Variables

### Required Variables

Set these in Netlify Dashboard:

| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_SUPABASE_URL` | Supabase project URL | `https://abc123.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Supabase anonymous key | `eyJhbGciOiJIUzI1NiIs...` |

### Optional Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_STRIPE_PUBLISHABLE_KEY` | Stripe public key | None |
| `VITE_PAYPAL_CLIENT_ID_PRODUCTION` | PayPal client ID | None |
| `VITE_APP_ENV` | Application environment | `production` |

## Troubleshooting

### Build Fails with "Secrets Scanning Found"

**Symptom:**
```
Secret env var "VITE_SUPABASE_ANON_KEY"'s value detected:
  found value at line 1 in dist/js/index-*.js
```

**Solution:**
1. Verify `netlify.toml` exists in repository root
2. Check `omit_keys` includes the detected variables
3. Ensure `netlify.toml` is committed and pushed
4. Trigger a new deploy after pushing the config

### CSP Blocks Third-Party Resources

**Symptom:** Browser console shows CSP violation errors

**Solution:**
1. Identify the blocked resource URL from console
2. Add the domain to appropriate CSP directive in `netlify.toml`
3. Common domains to add:
   - Analytics: `https://www.google-analytics.com`
   - Fonts: `https://fonts.googleapis.com`, `https://fonts.gstatic.com`
   - CDNs: `https://cdn.jsdelivr.net`

### SPA Routes Return 404

**Symptom:** Direct navigation to routes like `/shop` returns 404

**Solution:**
1. Verify `[[redirects]]` section exists in `netlify.toml`
2. Check `from = "/*"` and `to = "/index.html"`
3. Ensure `force = false` to allow static files through
4. Verify conditions regex excludes file extensions

### Environment Variables Not Available

**Symptom:** `import.meta.env.VITE_*` returns undefined

**Solution:**
1. Check variables are set in Netlify Dashboard
2. Verify variable names start with `VITE_` prefix
3. Trigger new deploy after adding variables
4. Check build logs for "Environment variables set"

## Testing Locally

Test the Netlify configuration locally:

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Build the project
npm run build

# Serve with Netlify redirects
netlify dev

# Or test production build
netlify deploy --prod
```

## Deployment Process

### Automatic Deployments

1. Push to `main` branch
2. Netlify detects changes
3. Runs `npm run build`
4. Deploys to production

### Manual Deployments

1. Go to Netlify Dashboard
2. Click "Deploys" → "Trigger deploy"
3. Select "Deploy site"
4. Monitor build logs

### Preview Deployments

- Pull requests automatically get preview URLs
- Test changes before merging
- Preview URL format: `deploy-preview-{pr-number}--{site-name}.netlify.app`

## Monitoring and Logs

### Build Logs

Access from Netlify Dashboard:
1. Go to "Deploys" tab
2. Click on a deploy
3. View full build log

### Function Logs

If using Netlify Functions:
1. Go to "Functions" tab
2. Click on a function
3. View recent invocations and logs

### Analytics

Enable Netlify Analytics:
1. Site settings → Analytics
2. Enable server-side analytics
3. View traffic, performance, and errors

## Best Practices

### Security
- ✅ Keep `netlify.toml` in version control
- ✅ Only add public keys to `omit_keys`
- ✅ Use environment variables for secrets
- ✅ Enable HTTPS (automatic with Netlify)
- ❌ Never commit `.env` files
- ❌ Never add service role keys to `omit_keys`

### Performance
- ✅ Use Netlify CDN for static assets
- ✅ Enable asset optimization in build settings
- ✅ Implement caching headers for images
- ✅ Use Vite's code splitting (already configured)

### Deployment
- ✅ Test in preview deployments first
- ✅ Monitor build logs for warnings
- ✅ Set up deploy notifications (Slack, email)
- ✅ Use branch deploys for staging

## Additional Resources

- [Netlify Docs](https://docs.netlify.com/)
- [Secrets Scanning](https://docs.netlify.com/security/secrets/secrets-scanning/)
- [Content Security Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)
- [Supabase API Keys](https://supabase.com/docs/guides/api#api-url-and-keys)
- [Netlify Headers](https://docs.netlify.com/routing/headers/)
- [Netlify Redirects](https://docs.netlify.com/routing/redirects/)

---

**Last Updated:** 2025-12-30
**Maintainer:** Wool Witch Development Team
