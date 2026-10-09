-- ========================================
-- SPARKTREE SAAS - INSTALACIÓN COMPLETA
-- ========================================
-- Ejecutar todo en orden correcto

-- 1. Extensión necesaria
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Eliminar tablas si existen (para fresh install)
DROP TABLE IF EXISTS public.flow_executions CASCADE;
DROP TABLE IF EXISTS public.flow_assignments CASCADE;
DROP TABLE IF EXISTS public.analytics CASCADE;
DROP TABLE IF EXISTS public.messages CASCADE;
DROP TABLE IF EXISTS public.conversations CASCADE;
DROP TABLE IF EXISTS public.contacts CASCADE;
DROP TABLE IF EXISTS public.flows CASCADE;
DROP TABLE IF EXISTS public.whatsapp_connections CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;
DROP TABLE IF EXISTS public.organizations CASCADE;

-- 3. Crear tabla organizations
CREATE TABLE public.organizations (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL DEFAULT 'My Organization',
  whatsapp_phone_number_id text,
  whatsapp_access_token text,
  whatsapp_verify_token text,
  plan text DEFAULT 'free' CHECK (plan IN ('free', 'basic', 'pro', 'enterprise')),
  max_whatsapp_connections integer DEFAULT 2,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- 4. Crear tabla users
CREATE TABLE public.users (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  email text NOT NULL UNIQUE,
  name text,
  full_name text,
  role text DEFAULT 'agent' CHECK (role IN ('super_admin', 'admin', 'staff', 'empresa', 'agent')),
  avatar_url text,
  password_hash text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- 5. Crear tabla whatsapp_connections
CREATE TABLE public.whatsapp_connections (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  display_name text NOT NULL,
  phone_number text UNIQUE,
  status text DEFAULT 'disconnected' CHECK (status IN ('connected', 'disconnected', 'connecting')),
  qr_code text,
  last_connected_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT unique_org_phone UNIQUE (organization_id, phone_number)
);

-- 6. Crear tabla contacts
CREATE TABLE public.contacts (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  whatsapp_connection_id uuid REFERENCES public.whatsapp_connections(id) ON DELETE SET NULL,
  phone_number text NOT NULL,
  profile_name text,
  bot_state text DEFAULT 'main_menu',
  custom_attributes jsonb DEFAULT '{}',
  last_active_at timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now(),
  profile_picture text,
  CONSTRAINT unique_org_contact UNIQUE (organization_id, phone_number)
);

-- 7. Crear tabla conversations
CREATE TABLE public.conversations (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  whatsapp_connection_id uuid REFERENCES public.whatsapp_connections(id) ON DELETE SET NULL,
  contact_id uuid NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  status text DEFAULT 'open' CHECK (status IN ('open', 'closed', 'archived')),
  last_message_at timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- 8. Crear tabla messages
CREATE TABLE public.messages (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  contact_id uuid NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  whatsapp_connection_id uuid REFERENCES public.whatsapp_connections(id) ON DELETE SET NULL,
  direction text NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  type text NOT NULL DEFAULT 'text' CHECK (type IN ('text', 'image', 'audio', 'video', 'document', 'location', 'contact')),
  content text,
  media_url text,
  status text DEFAULT 'sent' CHECK (status IN ('pending', 'sent', 'delivered', 'read', 'failed')),
  whatsapp_message_id text,
  created_at timestamp with time zone DEFAULT now()
);

-- 9. Crear tabla flows
CREATE TABLE public.flows (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT 'New Flow',
  description text DEFAULT '',
  nodes jsonb DEFAULT '[]',
  edges jsonb DEFAULT '[]',
  triggers jsonb DEFAULT '[]',
  is_active boolean DEFAULT true,
  is_default boolean DEFAULT false,
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'inactive', 'archived')),
  version text DEFAULT '1.0.0',
  category text DEFAULT 'other' CHECK (category IN ('sales', 'support', 'marketing', 'onboarding', 'other')),
  bot_mode text DEFAULT 'general_response',
  fallback_message text DEFAULT 'Lo siento, no entiendo tu mensaje. ¿En qué puedo ayudarte?',
  metrics jsonb DEFAULT '{"satisfaction": 0, "conversations": 0, "completionRate": 0, "avgResponseTime": 0}',
  assigned_to uuid REFERENCES public.users(id),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- 10. Crear tabla flow_assignments
CREATE TABLE public.flow_assignments (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  flow_id uuid NOT NULL REFERENCES public.flows(id) ON DELETE CASCADE,
  whatsapp_connection_id uuid NOT NULL REFERENCES public.whatsapp_connections(id) ON DELETE CASCADE,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT unique_flow_connection UNIQUE (flow_id, whatsapp_connection_id)
);

-- 11. Crear tabla flow_executions
CREATE TABLE public.flow_executions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  flow_id uuid NOT NULL REFERENCES public.flows(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  contact_id uuid REFERENCES public.contacts(id) ON DELETE SET NULL,
  conversation_id uuid REFERENCES public.conversations(id) ON DELETE SET NULL,
  whatsapp_connection_id uuid REFERENCES public.whatsapp_connections(id) ON DELETE SET NULL,
  trigger_word text,
  status text DEFAULT 'started' CHECK (status IN ('started', 'completed', 'failed', 'abandoned')),
  metadata jsonb DEFAULT '{}',
  executed_at timestamp with time zone DEFAULT now(),
  completed_at timestamp with time zone
);

-- 12. Crear tabla analytics
CREATE TABLE public.analytics (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  whatsapp_connection_id uuid REFERENCES public.whatsapp_connections(id) ON DELETE SET NULL,
  date date NOT NULL DEFAULT CURRENT_DATE,
  messages_sent integer DEFAULT 0,
  messages_received integer DEFAULT 0,
  new_contacts integer DEFAULT 0,
  active_conversations integer DEFAULT 0,
  flow_executions integer DEFAULT 0,
  average_response_time integer DEFAULT 0,
  satisfaction_score decimal(3,2) DEFAULT 0.00,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT unique_org_date UNIQUE (organization_id, date)
);

-- 13. Crear índices importantes
CREATE INDEX idx_users_organization_id ON public.users(organization_id);
CREATE INDEX idx_whatsapp_connections_org_id ON public.whatsapp_connections(organization_id);
CREATE INDEX idx_contacts_org_id ON public.contacts(organization_id);
CREATE INDEX idx_conversations_org_id ON public.conversations(organization_id);
CREATE INDEX idx_messages_org_id ON public.messages(organization_id);
CREATE INDEX idx_flows_org_id ON public.flows(organization_id);
CREATE INDEX idx_analytics_org_id ON public.analytics(organization_id);

-- ========================================
-- INSERTAR DATOS DE DEMO
-- ========================================

-- Organizaciones
INSERT INTO public.organizations (id, name, plan, max_whatsapp_connections, created_at, updated_at) VALUES 
  (uuid_generate_v4(), 'Sparktree Admin', 'enterprise', 5, NOW(), NOW()),
  (uuid_generate_v4(), 'Empresa Demo S.A.', 'basic', 2, NOW(), NOW());

-- Usuarios
INSERT INTO public.users (id, organization_id, email, full_name, role, password_hash, created_at, updated_at) VALUES 
  (uuid_generate_v4(), (SELECT id FROM public.organizations WHERE name = 'Sparktree Admin'), 'admin+fabpsandoval@gmail.com', 'Super Administrador', 'super_admin', 'hashed_password_placeholder', NOW(), NOW()),
  (uuid_generate_v4(), (SELECT id FROM public.organizations WHERE name = 'Sparktree Admin'), 'staff+fabpsandoval@gmail.com', 'Administrador Staff', 'staff', 'hashed_password_placeholder', NOW(), NOW()),
  (uuid_generate_v4(), (SELECT id FROM public.organizations WHERE name = 'Empresa Demo S.A.'), 'empresa@demo.com', 'Empresa Demo S.A.', 'empresa', 'hashed_password_placeholder', NOW(), NOW());

-- Conexiones WhatsApp
INSERT INTO public.whatsapp_connections (
  id, organization_id, user_id, display_name, phone_number, status, last_connected_at, created_at, updated_at
) VALUES 
  (uuid_generate_v4(), (SELECT id FROM public.organizations WHERE name = 'Empresa Demo S.A.'), (SELECT id FROM public.users WHERE email = 'empresa@demo.com'), 'Número Principal', '+5491112345678', 'connected', '2024-03-17T08:00:00Z', NOW(), NOW()),
  (uuid_generate_v4(), (SELECT id FROM public.organizations WHERE name = 'Empresa Demo S.A.'), (SELECT id FROM public.users WHERE email = 'empresa@demo.com'), 'Número Secundario', '+5491187654321', 'disconnected', NULL, NOW(), NOW()),
  (uuid_generate_v4(), (SELECT id FROM public.organizations WHERE name = 'Sparktree Admin'), (SELECT id FROM public.users WHERE email = 'admin+fabpsandoval@gmail.com'), 'Soporte Cliente', '+5491155556666', 'connected', '2024-03-16T15:30:00Z', NOW(), NOW());

-- Flows
INSERT INTO public.flows (
  id, organization_id, name, description, status, is_active, is_default, category, created_at, updated_at
) VALUES 
  (uuid_generate_v4(), (SELECT id FROM public.organizations WHERE name = 'Empresa Demo S.A.'), 'Bienvenida Cliente', 'Flow de bienvenida para nuevos clientes', 'active', true, true, 'onboarding', NOW(), NOW()),
  (uuid_generate_v4(), (SELECT id FROM public.organizations WHERE name = 'Empresa Demo S.A.'), 'Soporte Técnico', 'Flow para gestión de tickets de soporte', 'active', true, false, 'support', NOW(), NOW()),
  (uuid_generate_v4(), (SELECT id FROM public.organizations WHERE name = 'Sparktree Admin'), 'Flow Admin', 'Flow de ejemplo para administradores', 'draft', false, false, 'other', NOW(), NOW());

-- ========================================
-- VERIFICACIÓN FINAL
-- ========================================

SELECT '✅ Instalación completada exitosamente!' as status;
SELECT 'Organizaciones:' as table_name, COUNT(*) as record_count FROM public.organizations
UNION ALL
SELECT 'Usuarios:', COUNT(*) FROM public.users
UNION ALL
SELECT 'Conexiones WhatsApp:', COUNT(*) FROM public.whatsapp_connections
UNION ALL
SELECT 'Flows:', COUNT(*) FROM public.flows
ORDER BY table_name;
