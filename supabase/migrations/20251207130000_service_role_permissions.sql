/*
  # Service Role Permissions for Woolwitch Schema

  ## Overview
  Grants the service_role (used by admin scripts and internal operations)
  comprehensive access to the woolwitch schema and all its objects.

  ## Permissions Granted
  - USAGE on woolwitch schema
  - ALL PRIVILEGES on all tables, sequences, and functions
  - DEFAULT PRIVILEGES for future objects
  - Postgres superuser access for migrations

  ## Security Context
  The service_role is a superuser role used for:
  - Administrative scripts (like upload-products.mjs)
  - Backend operations that bypass RLS
  - Database migrations and maintenance
  - Internal system operations

  This role is separate from user-facing authentication and should only be used
  by trusted backend services and admin tooling.
*/

-- ========================================
-- SERVICE ROLE PERMISSIONS
-- ========================================

-- Grant schema usage to service_role
GRANT USAGE ON SCHEMA woolwitch TO service_role;

-- Grant all privileges on existing objects
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA woolwitch TO service_role;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA woolwitch TO service_role;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA woolwitch TO service_role;

-- Grant privileges on future objects (when they are created)
ALTER DEFAULT PRIVILEGES IN SCHEMA woolwitch 
GRANT ALL PRIVILEGES ON TABLES TO service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA woolwitch 
GRANT ALL PRIVILEGES ON SEQUENCES TO service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA woolwitch 
GRANT ALL PRIVILEGES ON FUNCTIONS TO service_role;

-- ========================================
-- POSTGRES SUPERUSER PERMISSIONS
-- ========================================

-- Ensure postgres superuser has access for migrations and administration
GRANT ALL PRIVILEGES ON SCHEMA woolwitch TO postgres;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA woolwitch TO postgres;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA woolwitch TO postgres;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA woolwitch TO postgres;