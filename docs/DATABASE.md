# Database & Schema Guide

Database schema, security implementation, and product management for Wool Witch.

## Migration Files

All migration files must follow the naming convention:

```
YYYYMMDDHHMMSS_woolwitch_description.sql
```

For example:

- `20251207120000_woolwitch_initial_setup.sql`
- `20251209000000_woolwitch_add_orders_system.sql`

The `woolwitch_` prefix after the timestamp ensures consistent identification of project-specific migrations.

## Schema Overview

The application uses the `woolwitch` schema for namespace isolation and enhanced security.

### Core Tables

**Products** (`woolwitch.products`):
```sql
- id (uuid, primary key)
- name (text)
- description (text)
- price (decimal)
- category (text)
- stock_quantity (integer)
- image_url (text)
- is_available (boolean)
- created_at (timestamptz)
- updated_at (timestamptz)
```

**User Roles** (`woolwitch.user_roles`):
```sql
- id (uuid, primary key)
- user_id (uuid, references auth.users)
- role (text: 'admin' or 'user')
- created_at (timestamptz)
```

### Security Implementation

**Row Level Security (RLS) Policies**:

Products table:
- Public read access for available products (`is_available = true`)
- Admin-only read access for all products
- Admin-only write operations (INSERT, UPDATE, DELETE)

Storage bucket (`product-images`):
- Public read access for viewing product images
- Admin-only upload/delete permissions

**Functions**:
- `woolwitch.is_admin()` - Checks if current user has admin role
- `woolwitch.handle_new_user()` - Auto-assigns 'user' role to new signups

## Product Image Management

### Setup

**Environment Variables**:
```bash
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### Adding Products

1. **Place Images**: Add files to `src/assets/products/`
   - Supported: JPEG, PNG, WebP, GIF
   - Recommended: Optimized for web (< 500KB)

2. **Configure Products**: Edit `bin/upload-products.mjs`:
   ```javascript
   {
     name: 'Product Name',
     description: 'Product description...',
     price: 25.00,
     category: 'Crochet', // or 'Knitted', 'Home Decor'
     stock_quantity: 10,
     image_filename: 'your-image.jpg'
   }
   ```

3. **Upload**: Run upload script:
   ```bash
   task upload-products
   # or
   npm run upload-products
   ```

### Development Workflow

```bash
# Setup (first time)
task setup

# Upload demo products  
task setup-products

# Start development
task dev
```

## Database Operations

### Local Development

**Access Points**:
- Supabase Studio: <http://localhost:54323>
- API Endpoint: <http://localhost:54321>
- Migrations: `supabase/migrations/`

**Common Tasks**:
```bash
# Reset database
task db:reset

# Check database status
task db:status

# Apply migrations manually
supabase db push
```

### Admin User Management

**Promote User to Admin** (via Supabase Studio SQL Editor):
```sql
UPDATE woolwitch.user_roles 
SET role = 'admin' 
WHERE user_id = (
  SELECT id FROM auth.users 
  WHERE email = 'user@example.com'
);
```

Or use the provided script: `docs/promote_user_to_admin.sql`

## Storage Configuration

**Bucket**: `product-images`
- **Access**: Public read, admin write
- **File Size Limit**: 50MB
- **Cache Control**: 1 hour (3600 seconds)
- **Public URLs**: Direct access for product display

### Troubleshooting

**Upload Failures**:
1. Check environment variables are set
2. Verify Supabase project is running
3. Ensure image files exist and are valid formats
4. Check file permissions

**Image Display Issues**:
1. Verify image uploaded to Supabase Storage
2. Check public URL accessibility
3. Validate bucket permissions

**Permission Errors**:
1. Verify `SUPABASE_SERVICE_ROLE_KEY` is correct
2. Check user admin status in database
3. Ensure RLS policies are properly configured
