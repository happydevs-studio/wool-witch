#!/bin/bash

# Demo script to show how the product upload system works
# This script demonstrates the automated setup for local development

echo "🧶 Wool Witch - Product Image Upload Demo"
echo "========================================"
echo

# Check if required environment variables are set
echo "📋 Checking environment variables..."

if [ -z "$VITE_SUPABASE_URL" ]; then
    echo "❌ VITE_SUPABASE_URL is not set"
    echo "   Please set your Supabase project URL"
    exit 1
fi

if [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
    echo "❌ SUPABASE_SERVICE_ROLE_KEY is not set"
    echo "   Please set your Supabase service role key for admin operations"
    exit 1
fi

echo "✅ Environment variables configured"
echo

# Check if product images exist
echo "🖼️  Checking product images..."
if [ ! -f "src/assets/products/gloves.jpg" ]; then
    echo "❌ gloves.jpg not found in src/assets/products/"
    echo "   Please ensure the image file is present"
    exit 1
fi

echo "✅ Found gloves.jpg ($(du -h src/assets/products/gloves.jpg | cut -f1))"
echo

# Show what will be uploaded
echo "📦 Products to be created:"
echo "   • Crochet Gloves (£24.00) - gloves.jpg"
echo

# Run the upload script
echo "🚀 Running product upload script..."
echo "   This will:"
echo "   1. Upload images to Supabase Storage bucket 'woolwitch-images'"
echo "   2. Add products to the database with storage URLs"
echo "   3. Handle updates if products already exist"
echo

read -p "Continue? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Demo cancelled"
    exit 0
fi

echo "🔄 Starting upload..."
npm run upload-products

if [ $? -eq 0 ]; then
    echo
    echo "✨ Demo completed successfully!"
    echo
    echo "🎯 What happened:"
    echo "   • Images uploaded to Supabase Storage"
    echo "   • Products added to database"
    echo "   • Images are now publicly accessible"
    echo
    echo "🔗 Next steps:"
    echo "   • Start the dev server: npm run dev"
    echo "   • Visit the shop page to see your products"
    echo "   • Check Supabase dashboard to see storage and database"
else
    echo
    echo "❌ Upload failed. Please check the error messages above."
    echo "   Common issues:"
    echo "   • Check environment variables are correct"
    echo "   • Ensure Supabase project is running"
    echo "   • Verify image files exist and are readable"
fi