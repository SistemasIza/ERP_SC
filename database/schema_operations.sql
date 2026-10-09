-- Operations Module Schema
-- Tables for Calendar, Business Hours, Promotions, Quotes and Orders
-- All tables follow the multi-tenant pattern: organization_id + ON DELETE CASCADE

-- ============ Calendar Events ============
CREATE TABLE IF NOT EXISTS public.calendar_events (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  title text NOT NULL,
  event_date date NOT NULL,
  time text,
  duration text,
  description text,
  attendees text,
  type text NOT NULL DEFAULT 'meeting' CHECK (type IN ('meeting', 'demo', 'webinar', 'review', 'call', 'other')),
  color text NOT NULL DEFAULT 'blue',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_calendar_events_org_id ON public.calendar_events(organization_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_org_date ON public.calendar_events(organization_id, event_date);

-- ============ Business Hours ============
CREATE TABLE IF NOT EXISTS public.business_hours (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  day text NOT NULL CHECK (day IN ('Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo')),
  open_time text NOT NULL,
  close_time text NOT NULL,
  auto_response text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT unique_org_day UNIQUE (organization_id, day)
);

CREATE INDEX IF NOT EXISTS idx_business_hours_org_id ON public.business_hours(organization_id);

-- ============ Promotions ============
CREATE TABLE IF NOT EXISTS public.promotions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  code text NOT NULL,
  discount numeric NOT NULL DEFAULT 0,
  type text NOT NULL DEFAULT 'percentage' CHECK (type IN ('percentage', 'fixed')),
  min_purchase numeric NOT NULL DEFAULT 0,
  usage_limit integer NOT NULL DEFAULT 0,
  used integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  expires_at date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_promotions_org_id ON public.promotions(organization_id);
CREATE INDEX IF NOT EXISTS idx_promotions_org_status ON public.promotions(organization_id, status);

-- ============ Quotes ============
CREATE TABLE IF NOT EXISTS public.quotes (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  number text NOT NULL,
  client_name text NOT NULL,
  client_email text,
  client_phone text,
  quote_date date NOT NULL DEFAULT CURRENT_DATE,
  expiry_date date NOT NULL,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'accepted', 'rejected', 'expired')),
  tax_rate numeric NOT NULL DEFAULT 0,
  discount numeric NOT NULL DEFAULT 0,
  notes text,
  created_by text,
  history jsonb NOT NULL DEFAULT '[]',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_quotes_org_id ON public.quotes(organization_id);
CREATE INDEX IF NOT EXISTS idx_quotes_org_status ON public.quotes(organization_id, status);

-- ============ Quote Items ============
CREATE TABLE IF NOT EXISTS public.quote_items (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  quote_id uuid NOT NULL REFERENCES public.quotes(id) ON DELETE CASCADE,
  description text NOT NULL,
  quantity numeric NOT NULL DEFAULT 1,
  unit_price numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_quote_items_quote_id ON public.quote_items(quote_id);

-- ============ Orders ============
CREATE TABLE IF NOT EXISTS public.orders (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  customer text NOT NULL,
  items integer NOT NULL DEFAULT 0,
  total numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'sent', 'delivered', 'cancelled')),
  order_date date NOT NULL DEFAULT CURRENT_DATE,
  channel text NOT NULL DEFAULT 'WhatsApp',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_orders_org_id ON public.orders(organization_id);
CREATE INDEX IF NOT EXISTS idx_orders_org_status ON public.orders(organization_id, status);
