# Deployment Guide

Complete deployment configuration for the Wool Witch application.

## Overview

The application supports multiple deployment options:
- **Netlify** - Recommended for production (configured with `netlify.toml`)
- **GitHub Pages** - Alternative deployment option
- Both integrate with Supabase backend

## GitHub Pages Deployment

### Repository Setup

**Required GitHub Secrets** (Settings → Secrets and variables → Actions):
```bash
# Secrets
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_ACCESS_TOKEN=your-supabase-access-token

# Variables  
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
```

### Getting Supabase Access Token

1. Go to <https://supabase.com/dashboard/account/tokens>
2. Click "Generate new token"
3. Name it "GitHub Actions Deploy"
4. Copy the token and add as `SUPABASE_ACCESS_TOKEN` secret

### GitHub Actions Workflow

The deployment workflow (`.github/workflows/deploy.yml`):

1. **Triggers**: Pushes to `main` branch, PRs, manual dispatch
2. **Build Process**:
   - Install Node.js dependencies
   - Create production environment file
   - Build application using Vite
   - Deploy to GitHub Pages
3. **Database Migrations**: Automatically applies pending migrations

### Configuration Files

**Vite Config** (`vite.config.ts`):
```typescript
base: process.env.NODE_ENV === 'production' ? '/woolwitch/' : '/'
```

**GitHub Pages Settings**:
- Go to repository Settings → Pages
- Source: "GitHub Actions"
- URL: `https://woolwitch.github.io/woolwitch/`

### Supabase Configuration

**Site URLs** (Supabase Dashboard → Authentication → Settings):
```bash
Site URL: https://woolwitch.github.io
Additional redirect URLs: https://woolwitch.github.io
```

## Local vs Production Environments

| Environment | Supabase | Authentication | Database |
|-------------|----------|---------------|----------|
| **Local** | Local instance via Docker | Mock Google auth | Local PostgreSQL |
| **Production** | Hosted Supabase | Real Google OAuth | Hosted PostgreSQL |

## Manual Deployment

1. Go to repository Actions tab
2. Select "Deploy to GitHub Pages" workflow  
3. Click "Run workflow"

## Troubleshooting

### Build Failures
- Verify `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are set correctly
- Check Supabase project accessibility

### CORS Issues
- Ensure Supabase allows requests from `https://woolwitch.github.io`
- Add domain to Supabase authentication site URLs

### Asset Loading Issues
- Verify `base` configuration in `vite.config.ts` matches repository name

## Netlify Deployment

### Quick Setup

1. **Connect Repository**: Link your GitHub repository to Netlify
2. **Configure Build Settings** (auto-detected from `netlify.toml`):
   - Build command: `npm run build`
   - Publish directory: `dist`
   - Node version: 20
3. **Set Environment Variables** in Netlify Dashboard (Site settings → Environment variables):
   ```bash
   VITE_SUPABASE_URL=https://your-project-ref.supabase.co
   VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
   ```

### Secrets Scanning Configuration

The `netlify.toml` configuration includes special handling for Supabase environment variables:

```toml
[build.processing.secrets]
  omit_keys = [
    "VITE_SUPABASE_URL",
    "VITE_SUPABASE_ANON_KEY"
  ]
```

**Why these keys are safe to expose:**
- `VITE_SUPABASE_ANON_KEY` is the **anonymous/public key** designed for client-side use
- This key is **protected by Row Level Security (RLS)** policies in the database
- Supabase specifically documents this key as safe to expose publicly
- See [Supabase API Keys Documentation](https://supabase.com/docs/guides/api#api-url-and-keys)

**Security Note**: Never expose `SUPABASE_SERVICE_ROLE_KEY` - this is for server-side use only!

### Netlify Configuration Features

The `netlify.toml` file configures:

1. **Build Settings**: Node 20, npm build command, dist output
2. **Security Headers**: XSS protection, clickjacking prevention, CSP
3. **SPA Routing**: Redirects for single-page application navigation
4. **Secrets Scanning**: Allows safe Supabase public keys

### Supabase Configuration

**Site URLs** (Supabase Dashboard → Authentication → Settings):
```bash
Site URL: https://your-site.netlify.app
Additional redirect URLs: https://your-site.netlify.app
```

### Manual Deployment

Deploy through Netlify Dashboard:
1. Go to Deploys tab
2. Click "Trigger deploy" → "Deploy site"
3. Monitor build logs for any issues

### Environment-Specific Configuration

**Development** (`.env.local`):
```bash
VITE_SUPABASE_URL=http://localhost:54321
VITE_SUPABASE_ANON_KEY=<local-anon-key>
```

**Production** (Netlify Environment Variables):
```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=<production-anon-key>
```

### Netlify Troubleshooting

**Secrets Scanning Failure:**
- Ensure `netlify.toml` is in repository root
- Verify `omit_keys` includes required environment variables
- Check Netlify build logs for specific error messages

**Build Failures:**
- Verify environment variables are set in Netlify Dashboard
- Check Node version compatibility (requires Node 20+)
- Review build logs for dependency or compilation errors

**CORS Issues:**
- Add Netlify domain to Supabase authentication allowed URLs
- Verify Content-Security-Policy headers in `netlify.toml`
- Check browser console for specific CORS error messages
