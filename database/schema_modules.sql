-- ============================================================
-- SPARKTREE SAAS - ESQUEMA DE MÓDULOS (Knowledge / Billing / AI)
-- Aplica en Supabase SQL Editor (o con psql en la base de datos)
-- Contenido:
--   1. Tabla knowledge_bases            (Knowledge - bases de conocimiento)
--   2. Tabla knowledge_documents        (Knowledge - documentos)
--   3. Tablas de billing (plans, subscriptions, invoices,
--      invoice_items, payment_methods, usage)
--   4. Tabla ai_provider_configs        (AI - config de proveedores)
-- Adaptado al modelo real: usa organizations (no tenants)
-- ============================================================

-- 1. Bases de conocimiento (usada por /api/knowledge/bases)
CREATE TABLE IF NOT EXISTS public.knowledge_bases (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  chunk_size integer DEFAULT 500,
  chunk_overlap integer DEFAULT 50,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_knowledge_bases_organization_id
  ON public.knowledge_bases(organization_id);

-- 2. Documentos de conocimiento (usada por /api/knowledge/bases/:id/documents)
CREATE TABLE IF NOT EXISTS public.knowledge_documents (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  knowledge_base_id uuid NOT NULL REFERENCES public.knowledge_bases(id) ON DELETE CASCADE,
  title text NOT NULL,
  type text DEFAULT 'text' CHECK (type IN ('text', 'url', 'file')),
  content text,
  url text,
  status text DEFAULT 'processing' CHECK (status IN ('processing', 'ready', 'error')),
  chunk_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_knowledge_documents_base_id
  ON public.knowledge_documents(knowledge_base_id);

-- 3. Billing - Planes (usada por /api/billing/plans)
CREATE TABLE IF NOT EXISTS public.plans (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name varchar(255) NOT NULL,
  type varchar(50) NOT NULL CHECK (type IN ('free', 'starter', 'professional', 'enterprise')),
  price numeric(10, 2) NOT NULL DEFAULT 0,
  currency varchar(3) NOT NULL DEFAULT 'USD',
  cycle varchar(20) NOT NULL DEFAULT 'monthly' CHECK (cycle IN ('monthly', 'yearly')),
  features text[] NOT NULL DEFAULT '{}',
  limits jsonb NOT NULL DEFAULT '{}',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_plans_type ON public.plans(type);
CREATE INDEX IF NOT EXISTS idx_plans_is_active ON public.plans(is_active);

-- 3.1 Billing - Suscripciones (usada por /api/billing/subscriptions)
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  plan_id uuid NOT NULL REFERENCES public.plans(id),
  status varchar(50) NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'trialing', 'past_due', 'cancelled', 'unpaid')),
  cycle varchar(20) NOT NULL DEFAULT 'monthly' CHECK (cycle IN ('monthly', 'yearly')),
  start_date timestamptz NOT NULL DEFAULT now(),
  end_date timestamptz NOT NULL,
  trial_ends_at timestamptz,
  cancel_at_period_end boolean DEFAULT false,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_org_id ON public.subscriptions(organization_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_plan_id ON public.subscriptions(plan_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON public.subscriptions(status);

-- 3.2 Billing - Facturas (usada por /api/billing/invoices)
CREATE TABLE IF NOT EXISTS public.invoices (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  subscription_id uuid NOT NULL REFERENCES public.subscriptions(id),
  number varchar(255) NOT NULL UNIQUE,
  status varchar(50) NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'pending', 'paid', 'failed', 'cancelled')),
  amount numeric(10, 2) NOT NULL DEFAULT 0,
  currency varchar(3) NOT NULL DEFAULT 'USD',
  due_date timestamptz NOT NULL DEFAULT now(),
  paid_at timestamptz,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_invoices_org_id ON public.invoices(organization_id);
CREATE INDEX IF NOT EXISTS idx_invoices_subscription_id ON public.invoices(subscription_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON public.invoices(status);

-- 3.3 Billing - Items de factura
CREATE TABLE IF NOT EXISTS public.invoice_items (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_id uuid NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  description text NOT NULL,
  quantity integer NOT NULL DEFAULT 1,
  unit_price numeric(10, 2) NOT NULL DEFAULT 0,
  amount numeric(10, 2) NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice_id ON public.invoice_items(invoice_id);

-- 3.4 Billing - Métodos de pago (usada por /api/billing/payment-methods)
CREATE TABLE IF NOT EXISTS public.payment_methods (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  type varchar(50) NOT NULL DEFAULT 'card' CHECK (type IN ('card', 'bank_account', 'paypal')),
  provider varchar(50) NOT NULL DEFAULT 'manual',
  provider_customer_id text,
  provider_payment_method_id text,
  is_default boolean DEFAULT false,
  last4 varchar(4),
  expiry_month integer,
  expiry_year integer,
  brand varchar(50),
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payment_methods_org_id ON public.payment_methods(organization_id);

-- 3.5 Billing - Uso (usada por /api/billing/usage)
CREATE TABLE IF NOT EXISTS public.usage (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  subscription_id uuid NOT NULL REFERENCES public.subscriptions(id),
  period_start timestamptz NOT NULL DEFAULT now(),
  period_end timestamptz NOT NULL DEFAULT now(),
  metrics jsonb NOT NULL DEFAULT '{}',
  calculated_cost numeric(10, 2) DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_usage_org_id ON public.usage(organization_id);
CREATE INDEX IF NOT EXISTS idx_usage_subscription_id ON public.usage(subscription_id);

-- 4. AI - Config de proveedores (usada por /api/ai/providers)
CREATE TABLE IF NOT EXISTS public.ai_provider_configs (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  provider varchar(50) NOT NULL CHECK (provider IN ('openai', 'anthropic', 'llama')),
  api_key text NOT NULL,
  default_model varchar(255) NOT NULL,
  base_url text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (organization_id, provider)
);

CREATE INDEX IF NOT EXISTS idx_ai_provider_configs_org_id ON public.ai_provider_configs(organization_id);

-- 5. Seed inicial de planes (si la tabla estaba vacía)
INSERT INTO public.plans (name, type, price, currency, cycle, features, limits)
SELECT * FROM (VALUES
  ('Gratis', 'free', 0, 'USD', 'monthly', ARRAY['1 agente', '100 conversaciones/mes', '1 WhatsApp conectado'], '{"users": 1, "conversations": 100, "whatsappConnections": 1}'::jsonb),
  ('Starter', 'starter', 29.00, 'USD', 'monthly', ARRAY['3 agentes', '1,000 conversaciones/mes', '3 WhatsApp conectados', 'Soporte por email'], '{"users": 3, "conversations": 1000, "whatsappConnections": 3}'::jsonb),
  ('Professional', 'professional', 99.00, 'USD', 'monthly', ARRAY['10 agentes', '10,000 conversaciones/mes', '10 WhatsApp conectados', 'Base de conocimiento', 'Soporte prioritario'], '{"users": 10, "conversations": 10000, "whatsappConnections": 10}'::jsonb),
  ('Enterprise', 'enterprise', 299.00, 'USD', 'monthly', ARRAY['Ilimitados agentes', 'Conversaciones ilimitadas', 'Multiplataforma', 'Soporte dedicado', 'SLA 99.9%'], '{"users": -1, "conversations": -1, "whatsappConnections": 25}'::jsonb)
) AS v(name, type, price, currency, cycle, features, limits)
WHERE NOT EXISTS (SELECT 1 FROM public.plans);

-- ============================================================
-- FIN DE MIGRACIÓN
-- ============================================================
