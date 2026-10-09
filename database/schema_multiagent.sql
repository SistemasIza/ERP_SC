-- ========================================
-- MULTI-AGENT AND ASSIGNMENT FEATURES
-- ========================================
-- Adds support for chat assignment, transfer, and internal notes

-- ========================================
-- UPDATE CONVERSATIONS TABLE FOR ASSIGNMENT
-- ========================================
ALTER TABLE public.conversations
ADD COLUMN IF NOT EXISTS assigned_to uuid REFERENCES public.users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS assigned_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS assignment_type text CHECK (assignment_type IN ('manual', 'round_robin', 'load_balance', 'auto')),
ADD COLUMN IF NOT EXISTS department text,
ADD COLUMN IF NOT EXISTS priority text DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
ADD COLUMN IF NOT EXISTS is_transferred boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS transferred_from uuid REFERENCES public.users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS transferred_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS transfer_reason text;

-- ========================================
-- INTERNAL NOTES TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS public.internal_notes (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  note text NOT NULL,
  is_visible_to_all boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- ========================================
-- AGENT WORKLOAD TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS public.agent_workload (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  active_conversations integer DEFAULT 0,
  total_conversations_today integer DEFAULT 0,
  avg_response_time_seconds integer DEFAULT 0,
  last_assigned_at timestamp with time zone,
  is_online boolean DEFAULT true,
  is_available boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  
  CONSTRAINT unique_org_user UNIQUE (organization_id, user_id)
);

-- ========================================
-- DEPARTMENTS TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS public.departments (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  color text DEFAULT '#3B82F6',
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- ========================================
-- DEPARTMENT MEMBERS TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS public.department_members (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  department_id uuid NOT NULL REFERENCES public.departments(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  is_manager boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  
  CONSTRAINT unique_dept_member UNIQUE (department_id, user_id)
);

-- ========================================
-- ASSIGNMENT RULES TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS public.assignment_rules (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  rule_type text NOT NULL CHECK (rule_type IN ('round_robin', 'load_balance', 'manual', 'priority', 'skill_based')),
  priority integer DEFAULT 0,
  conditions jsonb DEFAULT '{}',
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- ========================================
-- CONVERSATION TRANSFERS LOG
-- ========================================
CREATE TABLE IF NOT EXISTS public.conversation_transfers (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  from_user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  to_user_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  to_department_id uuid REFERENCES public.departments(id) ON DELETE SET NULL,
  reason text,
  transferred_at timestamp with time zone DEFAULT now()
);

-- ========================================
-- ADD FACEBOOK MESSENGER TO PLATFORM TYPE
-- ========================================
ALTER TABLE public.platform_connections
DROP CONSTRAINT IF EXISTS platform_connections_platform_type_check;

ALTER TABLE public.platform_connections
ADD CONSTRAINT platform_connections_platform_type_check 
CHECK (platform_type IN ('whatsapp', 'telegram', 'instagram', 'facebook_messenger', 'tiktok', 'mercadolibre'));

ALTER TABLE public.contacts
DROP CONSTRAINT IF EXISTS contacts_platform_type_check;

ALTER TABLE public.contacts
ADD CONSTRAINT contacts_platform_type_check 
CHECK (platform_type IN ('whatsapp', 'telegram', 'instagram', 'facebook_messenger', 'tiktok', 'mercadolibre'));

ALTER TABLE public.conversations
DROP CONSTRAINT IF EXISTS conversations_platform_type_check;

ALTER TABLE public.conversations
ADD CONSTRAINT conversations_platform_type_check 
CHECK (platform_type IN ('whatsapp', 'whatsapp_cloud', 'telegram', 'instagram', 'facebook_messenger', 'tiktok', 'mercadolibre'));

ALTER TABLE public.messages
DROP CONSTRAINT IF EXISTS messages_platform_type_check;

ALTER TABLE public.messages
ADD CONSTRAINT messages_platform_type_check 
CHECK (platform_type IN ('whatsapp', 'whatsapp_cloud', 'telegram', 'instagram', 'facebook_messenger', 'tiktok', 'mercadolibre'));

ALTER TABLE public.flow_executions
DROP CONSTRAINT IF EXISTS flow_executions_platform_type_check;

ALTER TABLE public.flow_executions
ADD CONSTRAINT flow_executions_platform_type_check 
CHECK (platform_type IN ('whatsapp', 'telegram', 'instagram', 'facebook_messenger', 'tiktok', 'mercadolibre'));

ALTER TABLE public.analytics
DROP CONSTRAINT IF EXISTS analytics_platform_type_check;

ALTER TABLE public.analytics
ADD CONSTRAINT analytics_platform_type_check 
CHECK (platform_type IN ('whatsapp', 'telegram', 'instagram', 'facebook_messenger', 'tiktok', 'mercadolibre'));

-- ========================================
-- FACEBOOK MESSENGER CONFIG TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS public.facebook_messenger_configs (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  platform_connection_id uuid NOT NULL REFERENCES public.platform_connections(id) ON DELETE CASCADE,
  page_id text NOT NULL,
  page_access_token text NOT NULL,
  app_id text NOT NULL,
  app_secret text NOT NULL,
  webhook_verify_token text,
  webhook_url text,
  subscribed_fields jsonb DEFAULT '["messages", "messaging_postbacks"]',
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- ========================================
-- MERCADO LIBRE CONFIG TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS public.mercadolibre_configs (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  platform_connection_id uuid NOT NULL REFERENCES public.platform_connections(id) ON DELETE CASCADE,
  seller_id text NOT NULL,
  access_token text NOT NULL,
  refresh_token text,
  app_id text NOT NULL,
  app_secret text NOT NULL,
  webhook_url text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- ========================================
-- INDEXES FOR NEW TABLES
-- ========================================
CREATE INDEX IF NOT EXISTS idx_conversations_assigned_to ON public.conversations(assigned_to);
CREATE INDEX IF NOT EXISTS idx_conversations_assignment_type ON public.conversations(assignment_type);
CREATE INDEX IF NOT EXISTS idx_conversations_department ON public.conversations(department);
CREATE INDEX IF NOT EXISTS idx_conversations_priority ON public.conversations(priority);
CREATE INDEX IF NOT EXISTS idx_conversations_is_transferred ON public.conversations(is_transferred);

CREATE INDEX IF NOT EXISTS idx_internal_notes_org_id ON public.internal_notes(organization_id);
CREATE INDEX IF NOT EXISTS idx_internal_notes_conversation_id ON public.internal_notes(conversation_id);
CREATE INDEX IF NOT EXISTS idx_internal_notes_user_id ON public.internal_notes(user_id);

CREATE INDEX IF NOT EXISTS idx_agent_workload_org_id ON public.agent_workload(organization_id);
CREATE INDEX IF NOT EXISTS idx_agent_workload_user_id ON public.agent_workload(user_id);
CREATE INDEX IF NOT EXISTS idx_agent_workload_is_online ON public.agent_workload(is_online);
CREATE INDEX IF NOT EXISTS idx_agent_workload_is_available ON public.agent_workload(is_available);

CREATE INDEX IF NOT EXISTS idx_departments_org_id ON public.departments(organization_id);
CREATE INDEX IF NOT EXISTS idx_departments_is_active ON public.departments(is_active);

CREATE INDEX IF NOT EXISTS idx_department_members_dept_id ON public.department_members(department_id);
CREATE INDEX IF NOT EXISTS idx_department_members_user_id ON public.department_members(user_id);

CREATE INDEX IF NOT EXISTS idx_assignment_rules_org_id ON public.assignment_rules(organization_id);
CREATE INDEX IF NOT EXISTS idx_assignment_rules_rule_type ON public.assignment_rules(rule_type);
CREATE INDEX IF NOT EXISTS idx_assignment_rules_is_active ON public.assignment_rules(is_active);

CREATE INDEX IF NOT EXISTS idx_conversation_transfers_org_id ON public.conversation_transfers(organization_id);
CREATE INDEX IF NOT EXISTS idx_conversation_transfers_conversation_id ON public.conversation_transfers(conversation_id);
CREATE INDEX IF NOT EXISTS idx_conversation_transfers_from_user_id ON public.conversation_transfers(from_user_id);
CREATE INDEX IF NOT EXISTS idx_conversation_transfers_to_user_id ON public.conversation_transfers(to_user_id);

CREATE INDEX IF NOT EXISTS idx_facebook_messenger_configs_platform_connection_id ON public.facebook_messenger_configs(platform_connection_id);

CREATE INDEX IF NOT EXISTS idx_mercadolibre_configs_platform_connection_id ON public.mercadolibre_configs(platform_connection_id);

-- ========================================
-- COMMENTS
-- ========================================
-- This migration adds multi-agent features:
-- - Chat assignment (manual, round robin, load balance)
-- - Conversation transfers
-- - Internal notes
-- - Departments
-- - Agent workload tracking
-- - Assignment rules
-- - Facebook Messenger support
-- - Mercado Libre support
