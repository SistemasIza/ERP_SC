-- ========================================
-- SPARKTREE SAAS DATABASE SCHEMA
-- ========================================
-- Sistema multitenant para gestión de chatbots WhatsApp

-- Extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ========================================
-- TABLA PRINCIPAL: ORGANIZACIONES
-- ========================================
CREATE TABLE IF NOT EXISTS public.organizations (
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

-- ========================================
-- TABLA DE USUARIOS
-- ========================================
CREATE TABLE IF NOT EXISTS public.users (
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

-- ========================================
-- TABLA DE CONEXIONES WHATSAPP
-- ========================================
CREATE TABLE IF NOT EXISTS public.whatsapp_connections (
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
  
  -- Constraint para limitar conexiones por organización
  CONSTRAINT unique_org_phone UNIQUE (organization_id, phone_number)
);

-- ========================================
-- TABLA DE CONTACTOS
-- ========================================
CREATE TABLE IF NOT EXISTS public.contacts (
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
  
  -- Unique por organización y número de teléfono
  CONSTRAINT unique_org_contact UNIQUE (organization_id, phone_number)
);

-- ========================================
-- TABLA DE CONVERSACIONES
-- ========================================
CREATE TABLE IF NOT EXISTS public.conversations (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  whatsapp_connection_id uuid REFERENCES public.whatsapp_connections(id) ON DELETE SET NULL,
  contact_id uuid NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  status text DEFAULT 'open' CHECK (status IN ('open', 'closed', 'archived')),
  last_message_at timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- ========================================
-- TABLA DE MENSAJES
-- ========================================
CREATE TABLE IF NOT EXISTS public.messages (
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

-- ========================================
-- TABLA DE FLOWS (CHATBOTS)
-- ========================================
CREATE TABLE IF NOT EXISTS public.flows (
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

-- ========================================
-- TABLA DE ASIGNACIONES DE FLOWS
-- ========================================
CREATE TABLE IF NOT EXISTS public.flow_assignments (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  flow_id uuid NOT NULL REFERENCES public.flows(id) ON DELETE CASCADE,
  whatsapp_connection_id uuid NOT NULL REFERENCES public.whatsapp_connections(id) ON DELETE CASCADE,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  
  -- Constraint para evitar asignaciones duplicadas
  CONSTRAINT unique_flow_connection UNIQUE (flow_id, whatsapp_connection_id)
);

-- ========================================
-- TABLA DE EJECUCIONES DE FLOWS
-- ========================================
CREATE TABLE IF NOT EXISTS public.flow_executions (
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

-- ========================================
-- TABLA DE ANALÍTICAS
-- ========================================
CREATE TABLE IF NOT EXISTS public.analytics (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  whatsapp_connection_id uuid REFERENCES public.whatsapp_connections(id) ON DELETE SET NULL,
  date date NOT NULL DEFAULT CURRENT_DATE,
  messages_sent integer DEFAULT 0,
  messages_received integer DEFAULT 0,
  new_contacts integer DEFAULT 0,
  active_conversations integer DEFAULT 0,
  flow_executions integer DEFAULT 0,
  average_response_time integer DEFAULT 0, -- en segundos
  satisfaction_score decimal(3,2) DEFAULT 0.00, -- 0.00 a 5.00
  created_at timestamp with time zone DEFAULT now(),
  
  -- Constraint para evitar duplicados por organización y fecha
  CONSTRAINT unique_org_date UNIQUE (organization_id, date)
);

-- ========================================
-- ÍNDICES PARA MEJORAR RENDIMIENTO
-- ========================================

-- Índices para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_users_organization_id ON public.users(organization_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);

CREATE INDEX IF NOT EXISTS idx_whatsapp_connections_org_id ON public.whatsapp_connections(organization_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_connections_status ON public.whatsapp_connections(status);
CREATE INDEX IF NOT EXISTS idx_whatsapp_connections_phone ON public.whatsapp_connections(phone_number);

CREATE INDEX IF NOT EXISTS idx_contacts_org_id ON public.contacts(organization_id);
CREATE INDEX IF NOT EXISTS idx_contacts_phone ON public.contacts(phone_number);
CREATE INDEX IF NOT EXISTS idx_contacts_last_active ON public.contacts(last_active_at);

CREATE INDEX IF NOT EXISTS idx_conversations_org_id ON public.conversations(organization_id);
CREATE INDEX IF NOT EXISTS idx_conversations_contact_id ON public.conversations(contact_id);
CREATE INDEX IF NOT EXISTS idx_conversations_status ON public.conversations(status);
CREATE INDEX IF NOT EXISTS idx_conversations_last_message ON public.conversations(last_message_at);

CREATE INDEX IF NOT EXISTS idx_messages_org_id ON public.messages(organization_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON public.messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_contact_id ON public.messages(contact_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages(created_at);
CREATE INDEX IF NOT EXISTS idx_messages_direction ON public.messages(direction);

CREATE INDEX IF NOT EXISTS idx_flows_org_id ON public.flows(organization_id);
CREATE INDEX IF NOT EXISTS idx_flows_status ON public.flows(status);
CREATE INDEX IF NOT EXISTS idx_flows_is_active ON public.flows(is_active);

CREATE INDEX IF NOT EXISTS idx_flow_executions_org_id ON public.flow_executions(organization_id);
CREATE INDEX IF NOT EXISTS idx_flow_executions_flow_id ON public.flow_executions(flow_id);
CREATE INDEX IF NOT EXISTS idx_flow_executions_contact_id ON public.flow_executions(contact_id);
CREATE INDEX IF NOT EXISTS idx_flow_executions_executed_at ON public.flow_executions(executed_at);

CREATE INDEX IF NOT EXISTS idx_analytics_org_id ON public.analytics(organization_id);
CREATE INDEX IF NOT EXISTS idx_analytics_date ON public.analytics(date);
CREATE INDEX IF NOT EXISTS idx_analytics_org_date ON public.analytics(organization_id, date);

-- Índices compuestos para las consultas calientes (filtro por org + rango/orden)
CREATE INDEX IF NOT EXISTS idx_messages_org_created ON public.messages(organization_id, created_at);
CREATE INDEX IF NOT EXISTS idx_messages_org_contact ON public.messages(organization_id, contact_id);
CREATE INDEX IF NOT EXISTS idx_conversations_org_last ON public.conversations(organization_id, last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_contacts_org_created ON public.contacts(organization_id, created_at);
CREATE INDEX IF NOT EXISTS idx_contacts_org_last_active ON public.contacts(organization_id, last_active_at DESC);
CREATE INDEX IF NOT EXISTS idx_flow_exec_org_executed ON public.flow_executions(organization_id, executed_at);

-- Índice compuesto para CRM (tabla puede crearse en schema_crm.sql / dashboard)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'crm_clients') THEN
    CREATE INDEX IF NOT EXISTS idx_crm_clients_org_created ON public.crm_clients(organization_id, created_at DESC);
  END IF;
END $$;

-- ========================================
-- DATOS INICIALES (DEMO)
-- ========================================

-- Insertar organizaciones de demo
INSERT INTO public.organizations (id, name, plan, max_whatsapp_connections) VALUES 
  ('1', 'Sparktree Admin', 'enterprise', 5),
  ('2', 'Empresa Demo S.A.', 'basic', 2)
ON CONFLICT (id) DO NOTHING;

-- Insertar usuarios de demo
INSERT INTO public.users (id, organization_id, email, full_name, role, password_hash) VALUES 
  ('1', '1', 'admin+fabpsandoval@gmail.com', 'Super Administrador', 'super_admin', 'hashed_password_placeholder'),
  ('2', '1', 'staff+fabpsandoval@gmail.com', 'Administrador Staff', 'staff', 'hashed_password_placeholder'),
  ('3', '2', 'empresa@demo.com', 'Empresa Demo S.A.', 'empresa', 'hashed_password_placeholder')
ON CONFLICT (id) DO NOTHING;

-- Insertar conexiones WhatsApp de demo
INSERT INTO public.whatsapp_connections (id, organization_id, user_id, display_name, phone_number, status, last_connected_at) VALUES 
  ('1', '2', '3', 'Número Principal', '+5491112345678', 'connected', '2024-03-17T08:00:00Z'),
  ('2', '2', '3', 'Número Secundario', '+5491187654321', 'disconnected', NULL),
  ('3', '1', '1', 'Soporte Cliente', '+5491155556666', 'connected', '2024-03-16T15:30:00Z')
ON CONFLICT (id) DO NOTHING;

-- ========================================
-- COMENTARIOS FINALES
-- ========================================

-- Este esquema soporta:
-- 1. Multitenant (múltiples organizaciones)
-- 2. Múltiples conexiones WhatsApp por organización (configurable)
-- 3. Chatbots con flows personalizables
-- 4. Analíticas y métricas
-- 5. Gestión completa de conversaciones
-- 6. Seguridad y restricciones de integridad

-- Para ejecutar este script:
-- psql -U your_user -d your_database -f schema.sql
