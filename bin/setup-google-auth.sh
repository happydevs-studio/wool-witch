#!/bin/bash
# Google Auth Production Setup Script
# Run this on your production environment

echo "🔐 Google Authentication Production Setup"
echo "======================================"
echo ""

echo "Please enter your Google OAuth credentials:"
echo ""

read -p "Enter Google Client ID: " GOOGLE_CLIENT_ID
read -p "Enter Google Client Secret: " GOOGLE_CLIENT_SECRET
read -p "Enter your Supabase Project URL: " SUPABASE_URL
read -p "Enter your Supabase Anon Key: " SUPABASE_ANON_KEY

echo ""
echo "📝 Environment Variables for Production:"
echo "========================================"
echo ""
echo "# Google OAuth Configuration"
echo "VITE_SUPABASE_URL=$SUPABASE_URL"
echo "VITE_SUPABASE_ANON_KEY=$SUPABASE_ANON_KEY"
echo ""
echo "# Configure these in your Supabase Dashboard > Authentication > Providers:"
echo "# Google Client ID: $GOOGLE_CLIENT_ID"
echo "# Google Client Secret: $GOOGLE_CLIENT_SECRET"
echo ""
echo "🎯 Next Steps:"
echo "1. Set these environment variables in your hosting platform"
echo "2. Configure Google OAuth in Supabase Dashboard"
echo "3. Add redirect URIs in Google Cloud Console:"
echo "   - $SUPABASE_URL/auth/v1/callback"
echo "4. Test the authentication flow"
echo ""
echo "✅ Setup complete! Check docs/GOOGLE_AUTH_SETUP.md for detailed instructions."