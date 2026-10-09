-- ============================================================
-- SPARKTREE SAAS - BASE DE DATOS COMPLETA (CLEAN INSTALL)
-- ============================================================
-- Ejecutar completo en Supabase SQL Editor
-- Versión: 2.0 - Sin errores

-- 1. Extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Drop en orden correcto (por dependencias)
DROP TABLE IF EXISTS public.webhook_deliveries CASCADE;
DROP TABLE IF EXISTS public.webhook_events CASCADE;
DROP TABLE IF EXISTS public.webhooks CASCADE;
DROP TABLE IF EXISTS public.push_configs CASCADE;
DROP TABLE IF EXISTS public.sms_configs CASCADE;
DROP TABLE IF EXISTS public.email_configs CASCADE;
DROP TABLE IF EXISTS public.notification_preferences CASCADE;
DROP TABLE IF EXISTS public.notification_templates CASCADE;
DROP TABLE IF EXISTS public.notifications CASCADE;
DROP TABLE IF EXISTS public.api_rate_limits CASCADE;
DROP TABLE IF EXISTS public.api_request_log CASCADE;
DROP TABLE IF EXISTS public.api_keys CASCADE;
DROP TABLE IF EXISTS public.public_webhooks CASCADE;
DROP TABLE IF EXISTS public.mercadolibre_configs CASCADE;
DROP TABLE IF EXISTS public.facebook_messenger_configs CASCADE;
DROP TABLE IF EXISTS public.tiktok_configs CASCADE;
DROP TABLE IF EXISTS public.instagram_configs CASCADE;
DROP TABLE IF EXISTS public.telegram_bot_configs CASCADE;
DROP TABLE IF EXISTS public.conversation_transfers CASCADE;
DROP TABLE IF EXISTS public.assignment_rules CASCADE;
DROP TABLE IF EXISTS public.department_members CASCADE;
DROP TABLE IF EXISTS public.departments CASCADE;
DROP TABLE IF EXISTS public.agent_workload CASCADE;
DROP TABLE IF EXISTS public.internal_notes CASCADE;
DROP TABLE IF EXISTS public.flow_executions CASCADE;
DROP TABLE IF EXISTS public.flow_assignments CASCADE;
DROP TABLE IF EXISTS public.analytics CASCADE;
DROP TABLE IF EXISTS public.messages CASCADE;
DROP TABLE IF EXISTS public.conversations CASCADE;
DROP TABLE IF EXISTS public.contacts CASCADE;
DROP TABLE IF EXISTS public.flows CASCADE;
DROP TABLE IF EXISTS public.platform_connections CASCADE;
DROP TABLE IF EXISTS public.whatsapp_connections CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;
DROP TABLE IF EXISTS public.organizations CASCADE;

-- ============================================================
-- TABLAS PRINCIPALES
-- ============================================================

-- organizations
CREATE TABLE public.organizations (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL DEFAULT 'My Organization',
  plan text DEFAULT 'free' CHECK (plan IN ('free', 'basic', 'pro', 'enterprise')),
  max_whatsapp_connections integer DEFAULT 2,
  whatsapp_phone_number_id text,
  whatsapp_access_token text,
  whatsapp_verify_token text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- users
CREATE TABLE public.users (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  email text NOT NULL UNIQUE,
  name text,
  full_name text,
  role text DEFAULT 'agent' CHECK (role IN ('super_admin', 'admin', 'staff', 'empresa', 'agent')),
  avatar_url text,
  password_hash text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- whatsapp_connections (legacy, mantenida para compatibilidad)
CREATE TABLE public.whatsapp_connections (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  display_name text NOT NULL,
  phone_number text,
  status text DEFAULT 'disconnected' CHECK (status IN ('connected', 'disconnected', 'connecting')),
  qr_code text,
  last_connected_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT unique_org_phone UNIQUE (organization_id, phone_number)
);

-- platform_connections (multi-plataforma)
CREATE TABLE public.platform_connections (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  platform_type text NOT NULL CHECK (platform_type IN ('whatsapp', 'whatsapp_cloud', 'telegram', 'instagram', 'facebook_messenger', 'tiktok', 'mercadolibre')),
  display_name text NOT NULL,
  platform_account_id text,
  status text DEFAULT 'disconnected' CHECK (status IN ('connected', 'disconnected', 'connecting', 'error')),
  config jsonb DEFAULT '{}',
  last_connected_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT unique_org_platform_account UNIQUE (organization_id, platform_type, platform_account_id)
);

-- contacts
CREATE TABLE public.contacts (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  whatsapp_connection_id uuid REFERENCES public.whatsapp_connections(id) ON DELETE SET NULL,
  platform_connection_id uuid REFERENCES public.platform_connections(id) ON DELETE SET NULL,
  phone_number text NOT NULL,
  profile_name text,
  platform_type text DEFAULT 'whatsapp' CHECK (platform_type IN ('whatsapp', 'whatsapp_cloud', 'telegram', 'instagram', 'facebook_messenger', 'tiktok', 'mercadolibre')),
  platform_user_id text,
  bot_state text DEFAULT 'main_menu',
  custom_attributes jsonb DEFAULT '{}',
  last_active_at timestamptz DEFAULT now(),
  profile_picture text,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT unique_org_contact UNIQUE (organization_id, phone_number)
);

-- conversations
CREATE TABLE public.conversations (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  whatsapp_connection_id uuid REFERENCES public.whatsapp_connections(id) ON DELETE SET NULL,
  platform_connection_id uuid REFERENCES public.platform_connections(id) ON DELETE SET NULL,
  contact_id uuid NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  status text DEFAULT 'open' CHECK (status IN ('open', 'closed', 'archived')),
  platform_type text DEFAULT 'whatsapp' CHECK (platform_type IN ('whatsapp', 'whatsapp_cloud', 'telegram', 'instagram', 'facebook_messenger', 'tiktok', 'mercadolibre')),
  assigned_to uuid REFERENCES public.users(id) ON DELETE SET NULL,
  assigned_at timestamptz,
  assignment_type text CHECK (assignment_type IN ('manual', 'round_robin', 'load_balance', 'auto')),
  department text,
  priority text DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  is_transferred boolean DEFAULT false,
  transferred_from uuid REFERENCES public.users(id) ON DELETE SET NULL,
  transferred_at timestamptz,
  transfer_reason text,
  last_message_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- messages
CREATE TABLE public.messages (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  contact_id uuid NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  whatsapp_connection_id uuid REFERENCES public.whatsapp_connections(id) ON DELETE SET NULL,
  platform_connection_id uuid REFERENCES public.platform_connections(id) ON DELETE SET NULL,
  platform_type text DEFAULT 'whatsapp' CHECK (platform_type IN ('whatsapp', 'whatsapp_cloud', 'telegram', 'instagram', 'facebook_messenger', 'tiktok', 'mercadolibre')),
  direction text NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  type text NOT NULL DEFAULT 'text' CHECK (type IN ('text', 'image', 'audio', 'video', 'document', 'location', 'contact')),
  content text,
  media_url text,
  status text DEFAULT 'sent' CHECK (status IN ('pending', 'sent', 'delivered', 'read', 'failed')),
  whatsapp_message_id text,
  platform_message_id text,
  created_at timestamptz DEFAULT now()
);

-- flows
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
  fallback_message text DEFAULT 'Lo siento, no entiendo tu mensaje.',
  metrics jsonb DEFAULT '{"satisfaction": 0, "conversations": 0, "completionRate": 0, "avgResponseTime": 0}',
  assigned_to uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- flow_assignments
CREATE TABLE public.flow_assignments (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  flow_id uuid NOT NULL REFERENCES public.flows(id) ON DELETE CASCADE,
  whatsapp_connection_id uuid REFERENCES public.whatsapp_connections(id) ON DELETE CASCADE,
  platform_connection_id uuid REFERENCES public.platform_connections(id) ON DELETE CASCADE,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT unique_flow_connection UNIQUE (flow_id, whatsapp_connection_id, platform_connection_id)
);

-- flow_executions
CREATE TABLE public.flow_executions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  flow_id uuid NOT NULL REFERENCES public.flows(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  contact_id uuid REFERENCES public.contacts(id) ON DELETE SET NULL,
  conversation_id uuid REFERENCES public.conversations(id) ON DELETE SET NULL,
  whatsapp_connection_id uuid REFERENCES public.whatsapp_connections(id) ON DELETE SET NULL,
  platform_connection_id uuid REFERENCES public.platform_connections(id) ON DELETE SET NULL,
  platform_type text DEFAULT 'whatsapp' CHECK (platform_type IN ('whatsapp', 'whatsapp_cloud', 'telegram', 'instagram', 'facebook_messenger', 'tiktok', 'mercadolibre')),
  trigger_word text,
  status text DEFAULT 'started' CHECK (status IN ('started', 'completed', 'failed', 'abandoned')),
  metadata jsonb DEFAULT '{}',
  executed_at timestamptz DEFAULT now(),
  completed_at timestamptz
);

-- analytics
CREATE TABLE public.analytics (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  whatsapp_connection_id uuid REFERENCES public.whatsapp_connections(id) ON DELETE SET NULL,
  platform_connection_id uuid REFERENCES public.platform_connections(id) ON DELETE SET NULL,
  platform_type text DEFAULT 'whatsapp' CHECK (platform_type IN ('whatsapp', 'whatsapp_cloud', 'telegram', 'instagram', 'facebook_messenger', 'tiktok', 'mercadolibre')),
  date date NOT NULL DEFAULT CURRENT_DATE,
  messages_sent integer DEFAULT 0,
  messages_received integer DEFAULT 0,
  new_contacts integer DEFAULT 0,
  active_conversations integer DEFAULT 0,
  flow_executions integer DEFAULT 0,
  average_response_time integer DEFAULT 0,
  satisfaction_score decimal(3,2) DEFAULT 0.00,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT unique_org_date UNIQUE (organization_id, date)
);

-- ============================================================
-- MULTI-AGENTE
-- ============================================================

-- internal_notes
CREATE TABLE public.internal_notes (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  note text NOT NULL,
  is_visible_to_all boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- agent_workload
CREATE TABLE public.agent_workload (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  active_conversations integer DEFAULT 0,
  total_conversations_today integer DEFAULT 0,
  avg_response_time_seconds integer DEFAULT 0,
  last_assigned_at timestamptz,
  is_online boolean DEFAULT true,
  is_available boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT unique_org_user UNIQUE (organization_id, user_id)
);

-- departments
CREATE TABLE public.departments (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  color text DEFAULT '#3B82F6',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- department_members
CREATE TABLE public.department_members (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  department_id uuid NOT NULL REFERENCES public.departments(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  is_manager boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT unique_dept_member UNIQUE (department_id, user_id)
);

-- assignment_rules
CREATE TABLE public.assignment_rules (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  rule_type text NOT NULL CHECK (rule_type IN ('round_robin', 'load_balance', 'manual', 'priority', 'skill_based')),
  priority integer DEFAULT 0,
  conditions jsonb DEFAULT '{}',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- conversation_transfers
CREATE TABLE public.conversation_transfers (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  from_user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  to_user_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  to_department_id uuid REFERENCES public.departments(id) ON DELETE SET NULL,
  reason text,
  transferred_at timestamptz DEFAULT now()
);

-- ============================================================
-- CONFIGS ESPECÍFICAS POR PLATAFORMA
-- ============================================================

CREATE TABLE public.telegram_bot_configs (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  platform_connection_id uuid NOT NULL REFERENCES public.platform_connections(id) ON DELETE CASCADE,
  bot_token text NOT NULL,
  bot_username text NOT NULL,
  webhook_url text,
  allowed_updates jsonb DEFAULT '["message", "callback_query"]',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE public.instagram_configs (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  platform_connection_id uuid NOT NULL REFERENCES public.platform_connections(id) ON DELETE CASCADE,
  instagram_business_account_id text NOT NULL,
  facebook_page_id text NOT NULL,
  access_token text NOT NULL,
  webhook_verify_token text,
  webhook_url text,
  subscribed_fields jsonb DEFAULT '["messages", "messaging_postbacks"]',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE public.tiktok_configs (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  platform_connection_id uuid NOT NULL REFERENCES public.platform_connections(id) ON DELETE CASCADE,
  advertiser_id text,
  access_token text NOT NULL,
  refresh_token text,
  webhook_url text,
  webhook_secret text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE public.facebook_messenger_configs (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  platform_connection_id uuid NOT NULL REFERENCES public.platform_connections(id) ON DELETE CASCADE,
  page_id text NOT NULL,
  page_access_token text NOT NULL,
  app_id text NOT NULL,
  app_secret text NOT NULL,
  webhook_verify_token text,
  webhook_url text,
  subscribed_fields jsonb DEFAULT '["messages", "messaging_postbacks"]',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE public.mercadolibre_configs (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  platform_connection_id uuid NOT NULL REFERENCES public.platform_connections(id) ON DELETE CASCADE,
  seller_id text NOT NULL,
  access_token text NOT NULL,
  refresh_token text,
  app_id text NOT NULL,
  app_secret text NOT NULL,
  webhook_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============================================================
-- NOTIFICACIONES
-- ============================================================

CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
  channel varchar(50) NOT NULL CHECK (channel IN ('email', 'sms', 'push', 'in_app', 'webhook')),
  type varchar(100) NOT NULL,
  subject text,
  content text NOT NULL,
  html_content text,
  recipient text NOT NULL,
  metadata jsonb DEFAULT '{}',
  status varchar(50) NOT NULL CHECK (status IN ('pending', 'sent', 'delivered', 'failed', 'bounced')),
  priority varchar(20) NOT NULL CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  scheduled_for timestamp,
  sent_at timestamp,
  delivered_at timestamp,
  error text,
  retry_count integer DEFAULT 0,
  max_retries integer DEFAULT 3,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);

CREATE TABLE public.notification_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name varchar(255) NOT NULL,
  description text,
  channel varchar(50) NOT NULL CHECK (channel IN ('email', 'sms', 'push', 'in_app', 'webhook')),
  type varchar(100) NOT NULL,
  subject_template text,
  content_template text NOT NULL,
  html_template text,
  variables text[] NOT NULL DEFAULT '{}',
  is_active boolean DEFAULT true,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);

CREATE TABLE public.notification_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  channel varchar(50) NOT NULL CHECK (channel IN ('email', 'sms', 'push', 'in_app', 'webhook')),
  enabled boolean DEFAULT true,
  categories text[] DEFAULT '{}',
  quiet_hours jsonb,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now(),
  UNIQUE(user_id, organization_id, channel)
);

CREATE TABLE public.email_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  provider varchar(50) NOT NULL CHECK (provider IN ('smtp', 'sendgrid', 'ses', 'mailgun')),
  host text,
  port integer,
  username text,
  password text,
  api_key text,
  from_email text NOT NULL,
  from_name text,
  is_default boolean DEFAULT false,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);

CREATE TABLE public.sms_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  provider varchar(50) NOT NULL CHECK (provider IN ('twilio', 'nexmo', 'aws_sns')),
  account_sid text,
  auth_token text,
  api_key text,
  api_secret text,
  from_number text,
  is_default boolean DEFAULT false,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);

CREATE TABLE public.push_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  provider varchar(50) NOT NULL CHECK (provider IN ('fcm', 'apns', 'one_signal')),
  api_key text,
  auth_key text,
  project_id text,
  app_id text,
  is_default boolean DEFAULT false,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);

-- ============================================================
-- API KEYS Y WEBHOOKS
-- ============================================================

CREATE TABLE public.api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name varchar(255) NOT NULL,
  key text NOT NULL UNIQUE,
  scopes text[] NOT NULL DEFAULT '{}',
  is_active boolean DEFAULT true,
  expires_at timestamp,
  last_used_at timestamp,
  created_at timestamp DEFAULT now()
);

CREATE TABLE public.public_webhooks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name varchar(255) NOT NULL,
  path text NOT NULL UNIQUE,
  method varchar(10) NOT NULL CHECK (method IN ('GET', 'POST', 'PUT', 'PATCH', 'DELETE')),
  is_active boolean DEFAULT true,
  created_at timestamp DEFAULT now()
);

CREATE TABLE public.api_request_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  api_key_id uuid REFERENCES public.api_keys(id) ON DELETE SET NULL,
  endpoint text NOT NULL,
  method varchar(10) NOT NULL,
  headers jsonb DEFAULT '{}',
  body jsonb,
  status_code integer,
  response_time_ms integer,
  ip_address inet,
  user_agent text,
  created_at timestamp DEFAULT now()
);

CREATE TABLE public.api_rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL UNIQUE REFERENCES public.organizations(id) ON DELETE CASCADE,
  requests_per_minute integer DEFAULT 60,
  requests_per_hour integer DEFAULT 1000,
  current_minute integer DEFAULT 0,
  current_hour integer DEFAULT 0,
  reset_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);

-- WEBHOOKS
CREATE TABLE public.webhooks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name varchar(255) NOT NULL,
  description text,
  url text NOT NULL,
  method varchar(10) NOT NULL CHECK (method IN ('POST', 'PUT', 'PATCH')),
  headers jsonb DEFAULT '{}',
  events text[] NOT NULL DEFAULT '{}',
  secret text,
  is_active boolean DEFAULT true,
  retry_policy jsonb DEFAULT '{"maxRetries": 3, "backoffMs": 1000}',
  timeout_ms integer DEFAULT 30000,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);

CREATE TABLE public.webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  event_type varchar(255) NOT NULL,
  payload jsonb NOT NULL,
  metadata jsonb DEFAULT '{}',
  created_at timestamp DEFAULT now()
);

CREATE TABLE public.webhook_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_id uuid NOT NULL REFERENCES public.webhooks(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  event_id uuid NOT NULL,
  event_type varchar(255) NOT NULL,
  url text NOT NULL,
  method varchar(10) NOT NULL,
  headers jsonb DEFAULT '{}',
  payload jsonb NOT NULL,
  response_status integer,
  response_body text,
  error text,
  attempt_number integer NOT NULL DEFAULT 1,
  delivery_status varchar(20) NOT NULL DEFAULT 'pending' CHECK (delivery_status IN ('pending', 'success', 'failed', 'retrying')),
  delivered_at timestamp,
  next_retry_at timestamp,
  created_at timestamp DEFAULT now()
);

-- ============================================================
-- ÍNDICES
-- ============================================================

CREATE INDEX idx_users_organization_id ON public.users(organization_id);
CREATE INDEX idx_whatsapp_connections_org_id ON public.whatsapp_connections(organization_id);
CREATE INDEX idx_platform_connections_org_id ON public.platform_connections(organization_id);
CREATE INDEX idx_platform_connections_platform_type ON public.platform_connections(platform_type);
CREATE INDEX idx_platform_connections_status ON public.platform_connections(status);
CREATE INDEX idx_contacts_org_id ON public.contacts(organization_id);
CREATE INDEX idx_contacts_platform_type ON public.contacts(platform_type);
CREATE INDEX idx_conversations_org_id ON public.conversations(organization_id);
CREATE INDEX idx_conversations_assigned_to ON public.conversations(assigned_to);
CREATE INDEX idx_conversations_priority ON public.conversations(priority);
CREATE INDEX idx_messages_org_id ON public.messages(organization_id);
CREATE INDEX idx_messages_conversation_id ON public.messages(conversation_id);
CREATE INDEX idx_flows_org_id ON public.flows(organization_id);
CREATE INDEX idx_analytics_org_id ON public.analytics(organization_id);
CREATE INDEX idx_internal_notes_conversation_id ON public.internal_notes(conversation_id);
CREATE INDEX idx_agent_workload_org_id ON public.agent_workload(organization_id);
CREATE INDEX idx_departments_org_id ON public.departments(organization_id);
CREATE INDEX idx_notifications_org_id ON public.notifications(organization_id);
CREATE INDEX idx_notifications_status ON public.notifications(status);
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_api_keys_org_id ON public.api_keys(organization_id);
CREATE INDEX idx_api_request_log_org_id ON public.api_request_log(organization_id);
CREATE INDEX idx_webhooks_org_id ON public.webhooks(organization_id);
CREATE INDEX idx_webhook_deliveries_webhook_id ON public.webhook_deliveries(webhook_id);
CREATE INDEX idx_webhook_deliveries_status ON public.webhook_deliveries(delivery_status);

-- Índice parcial correcto (usando nombre de columna calificado)
CREATE INDEX idx_notifications_scheduled_for ON public.notifications(scheduled_for)
  WHERE notifications.status = 'pending';

CREATE INDEX idx_webhook_deliveries_retry ON public.webhook_deliveries(next_retry_at)
  WHERE webhook_deliveries.delivery_status = 'retrying';

-- ============================================================
-- DATOS DE DEMO
-- ============================================================

INSERT INTO public.organizations (id, name, plan, max_whatsapp_connections) VALUES
  (uuid_generate_v4(), 'Sparktree Admin', 'enterprise', 5),
  (uuid_generate_v4(), 'Empresa Demo S.A.', 'basic', 2);

INSERT INTO public.users (organization_id, email, full_name, role) VALUES
  ((SELECT id FROM public.organizations WHERE name = 'Sparktree Admin'), 'admin+fabpsandoval@gmail.com', 'Super Administrador', 'super_admin'),
  ((SELECT id FROM public.organizations WHERE name = 'Sparktree Admin'), 'staff+fabpsandoval@gmail.com', 'Administrador Staff', 'staff'),
  ((SELECT id FROM public.organizations WHERE name = 'Empresa Demo S.A.'), 'empresa@demo.com', 'Empresa Demo S.A.', 'empresa');

-- ============================================================
-- VERIFICACIÓN FINAL
-- ============================================================
SELECT '✅ Base de datos instalada correctamente' AS resultado;
SELECT table_name, 'OK' AS estado
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('organizations','users','whatsapp_connections','platform_connections','contacts','conversations','messages','flows','analytics','notifications')
ORDER BY table_name;
