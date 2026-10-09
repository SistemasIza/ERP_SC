-- Migration for Phase 2: Staff Management and Organizations

-- Ensure organizations table has necessary columns
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS plan text DEFAULT 'free';

-- Update users table for dashboard access
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS email text UNIQUE;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS password_hash text;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS full_name text;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS role text DEFAULT 'user'; -- 'superadmin', 'admin', 'user'

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_users_organization_id ON public.users(organization_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
