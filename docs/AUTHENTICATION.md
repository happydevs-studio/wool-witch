# Authentication Guide

Complete authentication setup and configuration for the Wool Witch application.

## Overview

The application supports multiple authentication methods with role-based access control:

- **Email/Password**: Standard Supabase authentication
- **Google OAuth**: Smart environment detection (mock for local, real OAuth for production)
- **Role-Based Access**: Users get 'user' role, admins get 'admin' role
- **Database Security**: Row Level Security (RLS) policies enforce permissions

## Quick Setup

### Development
```bash
# Complete setup (first time)
task setup

# Start development
task dev
```

- Frontend: <http://localhost:5174>
- Supabase Studio: <http://localhost:54323>

### Creating Admin Users

1. Sign up a new user through the UI
2. Open Supabase Studio at <http://localhost:54323>
3. Navigate to Table Editor → `user_roles`
4. Update user role from 'user' to 'admin'
5. Sign out and sign in again

Or use SQL:
```sql
-- Replace email with actual user email
UPDATE woolwitch.user_roles 
SET role = 'admin' 
WHERE user_id = (
  SELECT id FROM auth.users 
  WHERE email = 'user@example.com'
);
```

## Google OAuth Setup

### Local Development
- **Automatic Mock Auth**: No setup required
- **Smart Detection**: Uses environment detection to provide mock Google users
- **Mock User Format**: `google.user.{timestamp}@gmail.com`

### Production Setup

1. **Google Cloud Console**:
   - Create project at [Google Cloud Console](https://console.cloud.google.com/)
   - Enable Google+ API
   - Create OAuth 2.0 credentials
   - Add redirect URI: `https://your-project-ref.supabase.co/auth/v1/callback`

2. **Supabase Dashboard**:
   - Go to Authentication → Providers
   - Enable Google provider
   - Add Google OAuth credentials
   - Go to Authentication → URL Configuration and set:
     - **Site URL**: `https://your-site.netlify.app` (your production URL)
     - **Redirect URLs**: add `https://your-site.netlify.app`
   > ⚠️ If the Site URL is left as `http://localhost:5173`, Google OAuth will redirect
   > back to localhost after authentication instead of your production site.

3. **Environment Variables** (Netlify Dashboard → Site settings → Environment variables):
   ```bash
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   # Must match the Redirect URL added to Supabase Dashboard above
   VITE_SITE_URL=https://your-site.netlify.app
   ```

## Database Schema

### User Roles Table
```sql
-- woolwitch.user_roles
- id (uuid) - Primary key
- user_id (uuid) - References auth.users
- role (text) - 'admin' or 'user'
- created_at (timestamptz)
```

### Row Level Security Policies

**Products Table**:
- Anyone can view available products (`is_available = true`)
- Admins can view all products
- Only admins can create, update, or delete products

**Storage**:
- Public read access to product images
- Admin-only write access to product images

## User Flows

### Regular Users
1. Browse products (no auth required)
2. Optional: Sign up/sign in for checkout
3. Add products to cart and proceed to checkout

### Admin Users
1. Sign in with admin credentials
2. Access Admin dashboard via header menu
3. Full CRUD operations on products:
   - Create new products
   - Edit existing products
   - Delete products
   - Toggle availability
   - Manage product images

## Troubleshooting

### Admin menu doesn't appear
- Verify user role is set to 'admin' in `woolwitch.user_roles`
- Sign out and sign in to refresh session

### Products not loading
- Check Supabase connection
- Verify RLS policies are correctly applied

### Google auth issues
- **Local**: Mock auth should work automatically
- **Production — redirects to localhost**: The Supabase project's **Site URL** is still set to
  `http://localhost:5173`. Fix:
  1. In Supabase Dashboard → Authentication → URL Configuration, update **Site URL** to your
     production URL (e.g. `https://your-site.netlify.app`) and add the same value to **Redirect URLs**.
  2. Set `VITE_SITE_URL=https://your-site.netlify.app` in your deployment environment variables.
  Both values must match exactly.
- **Production — other errors**: Verify Google OAuth credentials in Supabase dashboard
