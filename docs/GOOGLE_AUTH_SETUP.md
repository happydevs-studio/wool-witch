# Google Authentication Setup

This guide explains how to configure Google OAuth authentication for the Wool Witch application with support for both production and local development environments.

## Overview

The application supports:
- **Production**: Real Google OAuth integration
- **Local Development**: Mock Google authentication for testing without real OAuth credentials

## Production Setup

### 1. Google Cloud Console Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google+ API:
   - Navigate to "APIs & Services" > "Library"
   - Search for "Google+ API" 
   - Click "Enable"

4. Create OAuth 2.0 credentials:
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "OAuth 2.0 Client IDs"
   - Choose "Web application"
   - Add authorized redirect URIs:
     - `https://your-project-ref.supabase.co/auth/v1/callback`
     - `http://localhost:54321/auth/v1/callback` (for local testing)

5. Note down your:
   - Client ID
   - Client Secret

### 2. Supabase Dashboard Configuration

1. Go to your Supabase project dashboard
2. Navigate to Authentication > Providers
3. Enable Google provider
4. Enter your Google OAuth credentials:
   - Client ID from Google Cloud Console
   - Client Secret from Google Cloud Console

### 3. Environment Variables

For production deployment, ensure your hosting platform has these environment variables:

```bash
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

## Local Development Setup

### Automatic Mock Authentication

The application automatically detects local development and uses mock Google authentication:

- **Detection**: Checks if `VITE_SUPABASE_URL` contains 'localhost'
- **Mock User**: Creates temporary Google-like user accounts
- **Visual Indicator**: Console logs indicate mock mode is active

### Benefits of Mock Mode

1. **No OAuth Setup Required**: Start developing immediately
2. **Consistent Testing**: Predictable user data for testing
3. **Offline Development**: Works without internet connectivity
4. **Fast Iteration**: No external authentication flows

### Mock User Details

Mock users are created with:
- Email: `google.user.{timestamp}@gmail.com`
- Name: "Google User"
- Avatar: Placeholder Google-style image
- Provider metadata: Marked as 'google'

## Configuration Files

### Local Supabase Config (`supabase/config.toml`)

```toml
[auth.external.google]
enabled = true
client_id = "your-google-client-id"
secret = "your-google-client-secret"
redirect_uri = ""
```

**Note**: For local development, you can use placeholder values since mock authentication bypasses OAuth.

### Environment Configuration

The app uses different configurations based on environment:

```typescript
// Automatic environment detection
const isLocal = import.meta.env.VITE_SUPABASE_URL?.includes('localhost');

if (isLocal) {
  // Use mock authentication
} else {
  // Use real Google OAuth
}
```

## Usage in Components

### AuthContext Integration

```typescript
import { useAuth } from '../contexts/AuthContext';

function MyComponent() {
  const { signInWithGoogle } = useAuth();

  const handleGoogleSignIn = async () => {
    try {
      await signInWithGoogle();
      // User signed in successfully
    } catch (error) {
      console.error('Google sign-in failed:', error);
    }
  };

  return (
    <button onClick={handleGoogleSignIn}>
      Sign in with Google
    </button>
  );
}
```

### AuthModal Component

The `AuthModal` component includes:
- Email/password form
- Google sign-in button
- Automatic environment handling
- Loading states for both authentication methods

## Testing

### Local Testing

1. Start the development environment:
   ```bash
   task dev
   ```

2. Open the app and click "Sign in with Google"
3. Mock authentication creates a new user automatically
4. Check browser console for confirmation logs

### Production Testing

1. Deploy to your hosting platform
2. Ensure Google OAuth credentials are configured
3. Test real Google authentication flow
4. Verify user data is correctly stored in Supabase

## Troubleshooting

### Common Issues

1. **Google OAuth Errors in Production**:
   - Verify redirect URIs in Google Cloud Console
   - Check Supabase dashboard Google provider settings
   - Ensure client ID and secret are correct

2. **Mock Authentication Not Working**:
   - Check environment variable `VITE_SUPABASE_URL`
   - Verify it contains 'localhost'
   - Check browser console for error messages

3. **User Not Getting Admin Role**:
   - Mock users don't automatically get admin roles
   - Use the SQL script in `docs/promote_user_to_admin.sql`
   - Apply to the mock user's ID after sign-in

### Debug Steps

1. **Check Environment Detection**:
   ```javascript
   console.log('Is Local:', import.meta.env.VITE_SUPABASE_URL?.includes('localhost'));
   ```

2. **Verify Supabase Connection**:
   ```bash
   task db:status
   ```

3. **Check Auth State**:
   ```javascript
   // In browser console
   supabase.auth.getUser().then(console.log);
   ```

## Security Considerations

### Production
- Store Google OAuth credentials securely
- Use environment variables, never commit secrets
- Regularly rotate client secrets
- Monitor authentication logs

### Local Development
- Mock users are temporary and don't persist
- No real Google data is accessed
- Safe for development and testing

## Migration from Email-Only Auth

Existing email/password users can:
1. Continue using email authentication
2. Link Google account to existing account (manual process)
3. Admin users maintain their roles regardless of auth method

The authentication system is additive - Google auth complements existing email auth rather than replacing it.
