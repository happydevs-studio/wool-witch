# Wool Witch Documentation

Technical documentation for the Wool Witch e-commerce platform - a React/TypeScript application with Supabase backend.

## Quick Start

```bash
# First-time setup
task setup

# Daily development
task dev
```

For complete development setup, see [CONTRIBUTING.md](../CONTRIBUTING.md) in the project root.

## 📚 Core Guides

### Database & API
- **[DATABASE_API_LAYER.md](DATABASE_API_LAYER.md)** - Complete API layer architecture and documentation
- **[DATABASE.md](DATABASE.md)** - Database schema, security, and product management
- **[WOOLWITCH_SCHEMA_SECURITY.md](WOOLWITCH_SCHEMA_SECURITY.md)** - Detailed schema security implementation

### Authentication & Deployment
- **[AUTHENTICATION.md](AUTHENTICATION.md)** - Complete authentication setup including Google OAuth
- **[DEPLOYMENT.md](DEPLOYMENT.md)** - GitHub Pages deployment configuration

## 🔄 Schema Migration Documentation

**Recent migration** from direct `woolwitch` schema access to secure `woolwitch_api` layer. Choose the guide that fits your needs:

### For Everyone
👉 **[EXECUTIVE_SUMMARY.md](EXECUTIVE_SUMMARY.md)** - High-level business overview
- What changed and why
- Benefits and impact
- Next steps

### For Developers
👉 **[SCHEMA_MIGRATION_SUMMARY.md](SCHEMA_MIGRATION_SUMMARY.md)** - Complete technical guide
- Architecture diagrams
- File-by-file changes
- API reference
- Testing instructions

👉 **[SCHEMA_MIGRATION_VISUAL_GUIDE.md](SCHEMA_MIGRATION_VISUAL_GUIDE.md)** - Visual before/after guide
- Visual diagrams
- Code examples
- Security comparison

### For Testing
👉 **[MIGRATION_VERIFICATION_CHECKLIST.md](MIGRATION_VERIFICATION_CHECKLIST.md)** - Testing procedures
- Verification checklist
- Test scenarios
- Success criteria

## Reference Files

- **[promote_user_to_admin.sql](promote_user_to_admin.sql)** - SQL script for admin role assignment

## Quick Reference

### Development

- **Frontend**: <http://localhost:5174>
- **Supabase Studio**: <http://localhost:54323>
- **API Endpoint**: <http://localhost:54321>

### Key Commands

```bash
task setup        # Complete setup
task dev          # Start development
task test         # Run linting and typecheck
task db:reset     # Reset database
task upload-products  # Upload demo products

# Test API layer
node bin/test-api-layer.mjs
```

### Admin Setup

1. Sign up user via UI
2. Open Supabase Studio → `woolwitch.user_roles`
3. Change role from 'user' to 'admin'
4. Sign out and sign back in

## Architecture Overview

### Two-Schema Design
- **`woolwitch`** (Data Layer) - Internal tables and business logic
- **`woolwitch_api`** (API Layer) - Exposed views and functions for the UI

All application code uses the `woolwitch_api` schema for secure, controlled access. See [DATABASE_API_LAYER.md](DATABASE_API_LAYER.md) for details.

## Documentation Statistics

- **Total Guides**: 9 comprehensive documents
- **Total Lines**: 1,500+ lines of documentation
- **Coverage**: Architecture, security, migration, testing, deployment
- **Status**: ✅ Complete and current


