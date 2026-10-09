-- ============================================================
-- SPARKTREE SAAS - CORRECCIONES DE ESQUEMA
-- Aplica en Supabase SQL Editor (o con psql en la base de datos)
-- Contenido:
--   1. Tabla whatsapp_sessions            (sesiones de WhatsApp)
--   2. Tabla crm_clients                  (CRM - clientes)
--   3. Tabla crm_deals                    (CRM - negocios)
--   4. Columnas faltantes en organizations (notificaciones / pagos)
-- ============================================================

-- 1. Sesiones de WhatsApp (usada por sessionPersistenceService y /api/qr/logout)
CREATE TABLE IF NOT EXISTS public.whatsapp_sessions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  whatsapp_connection_id uuid NOT NULL,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  auth_state jsonb NOT NULL,
  user_jid text,
  phone_number text,
  device_id text,
  is_active boolean DEFAULT true,
  last_restored_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_sessions_connection_id
  ON public.whatsapp_sessions(whatsapp_connection_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_sessions_organization_id
  ON public.whatsapp_sessions(organization_id);

-- 2. Clientes CRM (usada por /api/crm/clients)
CREATE TABLE IF NOT EXISTS public.crm_clients (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  email text,
  phone text,
  company text,
  status text DEFAULT 'lead' CHECK (status IN ('lead', 'prospect', 'customer', 'churned')),
  source text DEFAULT 'manual',
  notes text,
  assigned_to uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_crm_clients_organization_id ON public.crm_clients(organization_id);
CREATE INDEX IF NOT EXISTS idx_crm_clients_status ON public.crm_clients(status);

-- 3. Negocios CRM (usada por /api/crm/deals, /api/crm/pipeline, /api/crm/dashboard)
CREATE TABLE IF NOT EXISTS public.crm_deals (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  client_id uuid REFERENCES public.crm_clients(id) ON DELETE CASCADE,
  name text NOT NULL,
  value numeric(15, 2) DEFAULT 0,
  stage text DEFAULT 'prospecting'
    CHECK (stage IN ('prospecting', 'qualification', 'proposal', 'negotiation', 'closed_won', 'closed_lost')),
  probability integer DEFAULT 10 CHECK (probability >= 0 AND probability <= 100),
  expected_close_date date,
  assigned_to uuid REFERENCES public.users(id) ON DELETE SET NULL,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_crm_deals_organization_id ON public.crm_deals(organization_id);
CREATE INDEX IF NOT EXISTS idx_crm_deals_client_id ON public.crm_deals(client_id);
CREATE INDEX IF NOT EXISTS idx_crm_deals_stage ON public.crm_deals(stage);

-- 4. Columnas faltantes en organizations
--    (usadas por /api/admin/organizations/notifications, updateOrganizationPayment,
--     updateOrganizationNotification y el módulo superadmin)
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS payment_status text DEFAULT 'paid';
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS admin_notification text;
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS show_overdue_popup boolean DEFAULT false;

-- ============================================================
-- FIN DE MIGRACIÓN
-- ============================================================
