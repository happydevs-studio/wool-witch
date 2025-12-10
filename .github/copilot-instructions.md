# Copilot Instructions - Wool Witch

React + TypeScript e-commerce application for handmade crochet goods, built with Supabase backend and Vite tooling.

## Architecture Overview

**State Management**: React Context pattern with two main providers:
- `AuthContext` - User authentication, admin role checking, session management. Includes mock Google auth for local dev
- `CartContext` - Shopping cart state with localStorage persistence and delivery charge calculations

**Navigation**: Single-page app using state-based routing in `App.tsx` (`shop | cart | checkout | admin | about | contact`)

**Data Layer**: Supabase client with `woolwitch` schema. Database types in `src/types/database.ts`. All app data lives in `woolwitch` schema, not `public`.

**Authentication Flow**: Email/password + Google OAuth with role-based access control via `user_roles` table. Admin status checked on auth state change, NOT from JWT claims.

## Development Workflow

**Primary Commands** (use [Task](https://taskfile.dev/) runner):
```bash
task setup    # First-time setup: deps + env + database
task dev      # Start Supabase + dev server (full stack)
task dev-only # Start only dev server (assumes DB running)
task test     # Run lint + typecheck
task db:reset # Reset local database with fresh migrations
```

**Quick Start Without Database** (frontend only):
```bash
npm start     # Auto-creates .env.local, starts dev server
```

**Database**: Local Supabase in Docker. Access Studio at `http://localhost:54323`, API at `http://localhost:54321`. Migration files use `YYYYMMDDHHMMSS_woolwitch_description.sql` naming convention.

**Environment**: Auto-generated `.env.local` with local Supabase credentials. See `Taskfile.yml` setup-env task for auto-creation logic.

**Schema**: App uses `woolwitch` schema exclusively - import supabase client with `db: { schema: 'woolwitch' }`. All queries hit `woolwitch.products`, `woolwitch.user_roles`, etc.

## Key Patterns

**Component Structure**:
- Pages in `src/pages/` - main route components
- Shared components in `src/components/` - reusable UI pieces
- Context hooks pattern: `useAuth()`, `useCart()` with error boundaries

**Database Operations**:
- Row Level Security (RLS) policies protect admin operations
- Products table has public read, admin-only write policies
- User roles checked via `user_roles` table join on auth state change
- All queries use `woolwitch` schema: `supabase.from('products')` → `woolwitch.products`

**Product Management**:
- Images stored in Supabase Storage (`product-images` bucket)
- Upload script: `bin/upload-products.mjs` (requires SUPABASE_SERVICE_ROLE_KEY)
- Demo products via `task setup-products` or `task upload-products-if-needed`

**State-based Routing**: `App.tsx` manages `currentPage` state instead of React Router. Navigation via `setCurrentPage('shop' | 'cart' | 'checkout' | 'admin' | 'about' | 'contact')`.

## Critical Implementation Details

**Admin Access**: Check `AuthContext.isAdmin` before showing admin features. Admin status comes from database query, not JWT claims.

**Mock Authentication**: Local development includes mock Google OAuth - creates fake Gmail accounts and signs them in automatically when `isLocal` detected.

**Image Handling**: Product images reference Supabase Storage URLs. Use `upload-products.mjs` script to sync local images in `src/assets/products/` to storage.

**Local Development**: Database runs in Docker via Supabase CLI. Migrations in `supabase/migrations/` auto-apply. Use `task db:status` to check connection.

**TypeScript**: Strict database types generated from Supabase schema. Import from `src/types/database.ts`.

**Testing**: Use `bin/test-schema.mjs` to verify schema configuration and `npm run test` for lint + typecheck.

## Common Tasks

**Add New Product**: Update database via Admin UI or use `upload-products.mjs` script for batch operations

**Database Changes**: Create migration files in `supabase/migrations/` using the naming convention `YYYYMMDDHHMMSS_woolwitch_description.sql`, update types in `src/types/database.ts`

**Migration Naming**: All migration files must include the `woolwitch_` prefix after the timestamp to maintain consistency and clear project identification

**Admin Testing**: Use SQL script `docs/promote_user_to_admin.sql` to grant admin role to test users

**Styling**: Tailwind CSS with design system focused on rose/pink palette, serif fonts for headings

When working on this codebase, always start the database first (`task db:start` or `task dev`) and check admin role requirements for any product management features.