CREATE TABLE public.whatsapp_sessions (
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
