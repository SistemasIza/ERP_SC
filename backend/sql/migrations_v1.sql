-- Migration to support multiple WhatsApp connections per organization/user

-- Create whatsapp_connections table
CREATE TABLE IF NOT EXISTS public.whatsapp_connections (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  organization_id uuid NOT NULL,
  display_name text NOT NULL,
  phone_number text,
  status text DEFAULT 'disconnected'::text,
  qr_code text,
  last_connected_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT whatsapp_connections_pkey PRIMARY KEY (id),
  CONSTRAINT whatsapp_connections_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id),
  CONSTRAINT whatsapp_connections_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id)
);

-- Create flow_assignments table to link flows to specific WhatsApp connections
CREATE TABLE IF NOT EXISTS public.flow_assignments (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  flow_id uuid NOT NULL,
  whatsapp_connection_id uuid NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT flow_assignments_pkey PRIMARY KEY (id),
  CONSTRAINT flow_assignments_flow_id_fkey FOREIGN KEY (flow_id) REFERENCES public.flows(id),
  CONSTRAINT flow_assignments_whatsapp_connection_id_fkey FOREIGN KEY (whatsapp_connection_id) REFERENCES public.whatsapp_connections(id),
  CONSTRAINT flow_assignments_flow_conn_unique UNIQUE (flow_id, whatsapp_connection_id)
);

-- Add some columns to users table if they don't exist
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS whatsapp_connections_limit integer DEFAULT 3;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS active_whatsapp_connections integer DEFAULT 0;

-- Ensure contacts has organization_id and unique constraint per number per org
ALTER TABLE public.contacts ADD CONSTRAINT contacts_org_phone_unique UNIQUE (organization_id, phone_number);
