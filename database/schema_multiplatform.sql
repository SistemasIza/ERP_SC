-- ========================================
-- MULTI-PLATFORM DATABASE SCHEMA MIGRATION
-- ========================================
-- Adds support for Telegram, Instagram, and TikTok

-- ========================================
-- GENERIC PLATFORM CONNECTIONS TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS public.platform_connections (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  platform_type text NOT NULL CHECK (platform_type IN ('whatsapp', 'whatsapp_cloud', 'telegram', 'instagram', 'tiktok')),
  display_name text NOT NULL,
  platform_account_id text, -- e.g., phone number, bot username, instagram business id
  status text DEFAULT 'disconnected' CHECK (status IN ('connected', 'disconnected', 'connecting', 'error')),
  config jsonb DEFAULT '{}', -- Platform-specific config (tokens, webhooks, etc.)
  last_connected_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  
  -- Constraint para limitar conexiones por organización y plataforma
  CONSTRAINT unique_org_platform_account UNIQUE (organization_id, platform_type, platform_account_id)
);

-- ========================================
-- UPDATE CONTACTS TABLE FOR MULTI-PLATFORM
-- ========================================
-- Add platform-specific identifier to contacts
ALTER TABLE public.contacts 
ADD COLUMN IF NOT EXISTS platform_type text DEFAULT 'whatsapp' CHECK (platform_type IN ('whatsapp', 'whatsapp_cloud', 'telegram', 'instagram', 'tiktok')),
ADD COLUMN IF NOT EXISTS platform_user_id text, -- e.g., telegram user_id, instagram igid
ADD COLUMN IF NOT EXISTS platform_connection_id uuid REFERENCES public.platform_connections(id) ON DELETE SET NULL;

-- ========================================
-- UPDATE CONVERSATIONS TABLE FOR MULTI-PLATFORM
-- ========================================
ALTER TABLE public.conversations
ADD COLUMN IF NOT EXISTS platform_type text DEFAULT 'whatsapp' CHECK (platform_type IN ('whatsapp', 'whatsapp_cloud', 'telegram', 'instagram', 'tiktok')),
ADD COLUMN IF NOT EXISTS platform_connection_id uuid REFERENCES public.platform_connections(id) ON DELETE SET NULL;

-- ========================================
-- UPDATE MESSAGES TABLE FOR MULTI-PLATFORM
-- ========================================
ALTER TABLE public.messages
ADD COLUMN IF NOT EXISTS platform_type text DEFAULT 'whatsapp' CHECK (platform_type IN ('whatsapp', 'whatsapp_cloud', 'telegram', 'instagram', 'tiktok')),
ADD COLUMN IF NOT EXISTS platform_connection_id uuid REFERENCES public.platform_connections(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS platform_message_id text; -- Platform-specific message ID

-- ========================================
-- UPDATE FLOW ASSIGNMENTS FOR MULTI-PLATFORM
-- ========================================
ALTER TABLE public.flow_assignments
ADD COLUMN IF NOT EXISTS platform_connection_id uuid REFERENCES public.platform_connections(id) ON DELETE CASCADE;

-- Drop old constraint and add new one for platform connections
ALTER TABLE public.flow_assignments
DROP CONSTRAINT IF EXISTS unique_flow_connection;

ALTER TABLE public.flow_assignments
ADD CONSTRAINT unique_flow_connection UNIQUE (flow_id, whatsapp_connection_id, platform_connection_id);

-- ========================================
-- UPDATE FLOW EXECUTIONS FOR MULTI-PLATFORM
-- ========================================
ALTER TABLE public.flow_executions
ADD COLUMN IF NOT EXISTS platform_type text DEFAULT 'whatsapp' CHECK (platform_type IN ('whatsapp', 'whatsapp_cloud', 'telegram', 'instagram', 'tiktok')),
ADD COLUMN IF NOT EXISTS platform_connection_id uuid REFERENCES public.platform_connections(id) ON DELETE SET NULL;

-- ========================================
-- UPDATE ANALYTICS FOR MULTI-PLATFORM
-- ========================================
ALTER TABLE public.analytics
ADD COLUMN IF NOT EXISTS platform_type text DEFAULT 'whatsapp' CHECK (platform_type IN ('whatsapp', 'whatsapp_cloud', 'telegram', 'instagram', 'tiktok')),
ADD COLUMN IF NOT EXISTS platform_connection_id uuid REFERENCES public.platform_connections(id) ON DELETE SET NULL;

-- ========================================
-- MIGRATE EXISTING WHATSAPP CONNECTIONS
-- ========================================
-- Migrate existing whatsapp_connections to platform_connections
INSERT INTO public.platform_connections (id, organization_id, user_id, platform_type, display_name, platform_account_id, status, last_connected_at, created_at, updated_at)
SELECT 
  id,
  organization_id,
  user_id,
  'whatsapp' as platform_type,
  display_name,
  phone_number as platform_account_id,
  status,
  last_connected_at,
  created_at,
  updated_at
FROM public.whatsapp_connections
ON CONFLICT (id) DO NOTHING;

-- Update contacts to reference platform connections
UPDATE public.contacts
SET platform_connection_id = whatsapp_connection_id,
    platform_type = 'whatsapp'
WHERE whatsapp_connection_id IS NOT NULL;

-- Update conversations to reference platform connections
UPDATE public.conversations
SET platform_connection_id = whatsapp_connection_id,
    platform_type = 'whatsapp'
WHERE whatsapp_connection_id IS NOT NULL;

-- Update messages to reference platform connections
UPDATE public.messages
SET platform_connection_id = whatsapp_connection_id,
    platform_type = 'whatsapp',
    platform_message_id = whatsapp_message_id
WHERE whatsapp_connection_id IS NOT NULL;

-- Update flow executions to reference platform connections
UPDATE public.flow_executions
SET platform_connection_id = whatsapp_connection_id,
    platform_type = 'whatsapp'
WHERE whatsapp_connection_id IS NOT NULL;

-- Update analytics to reference platform connections
UPDATE public.analytics
SET platform_connection_id = whatsapp_connection_id,
    platform_type = 'whatsapp'
WHERE whatsapp_connection_id IS NOT NULL;

-- ========================================
-- INDEXES FOR MULTI-PLATFORM
-- ========================================
CREATE INDEX IF NOT EXISTS idx_platform_connections_org_id ON public.platform_connections(organization_id);
CREATE INDEX IF NOT EXISTS idx_platform_connections_platform_type ON public.platform_connections(platform_type);
CREATE INDEX IF NOT EXISTS idx_platform_connections_status ON public.platform_connections(status);
CREATE INDEX IF NOT EXISTS idx_platform_connections_user_id ON public.platform_connections(user_id);

CREATE INDEX IF NOT EXISTS idx_contacts_platform_type ON public.contacts(platform_type);
CREATE INDEX IF NOT EXISTS idx_contacts_platform_user_id ON public.contacts(platform_user_id);
CREATE INDEX IF NOT EXISTS idx_contacts_platform_connection_id ON public.contacts(platform_connection_id);

CREATE INDEX IF NOT EXISTS idx_conversations_platform_type ON public.conversations(platform_type);
CREATE INDEX IF NOT EXISTS idx_conversations_platform_connection_id ON public.conversations(platform_connection_id);

CREATE INDEX IF NOT EXISTS idx_messages_platform_type ON public.messages(platform_type);
CREATE INDEX IF NOT EXISTS idx_messages_platform_connection_id ON public.messages(platform_connection_id);
CREATE INDEX IF NOT EXISTS idx_messages_platform_message_id ON public.messages(platform_message_id);

CREATE INDEX IF NOT EXISTS idx_flow_assignments_platform_connection_id ON public.flow_assignments(platform_connection_id);

CREATE INDEX IF NOT EXISTS idx_flow_executions_platform_type ON public.flow_executions(platform_type);
CREATE INDEX IF NOT EXISTS idx_flow_executions_platform_connection_id ON public.flow_executions(platform_connection_id);

CREATE INDEX IF NOT EXISTS idx_analytics_platform_type ON public.analytics(platform_type);
CREATE INDEX IF NOT EXISTS idx_analytics_platform_connection_id ON public.analytics(platform_connection_id);

-- ========================================
-- TELEGRAM-SPECIFIC TABLES
-- ========================================
CREATE TABLE IF NOT EXISTS public.telegram_bot_configs (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  platform_connection_id uuid NOT NULL REFERENCES public.platform_connections(id) ON DELETE CASCADE,
  bot_token text NOT NULL,
  bot_username text NOT NULL,
  webhook_url text,
  allowed_updates jsonb DEFAULT '["message", "callback_query"]',
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- ========================================
-- INSTAGRAM-SPECIFIC TABLES
-- ========================================
CREATE TABLE IF NOT EXISTS public.instagram_configs (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  platform_connection_id uuid NOT NULL REFERENCES public.platform_connections(id) ON DELETE CASCADE,
  instagram_business_account_id text NOT NULL,
  facebook_page_id text NOT NULL,
  access_token text NOT NULL,
  webhook_verify_token text,
  webhook_url text,
  subscribed_fields jsonb DEFAULT '["messages", "messaging_postbacks"]',
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- ========================================
-- TIKTOK-SPECIFIC TABLES
-- ========================================
CREATE TABLE IF NOT EXISTS public.tiktok_configs (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  platform_connection_id uuid NOT NULL REFERENCES public.platform_connections(id) ON DELETE CASCADE,
  advertiser_id text,
  access_token text NOT NULL,
  refresh_token text,
  webhook_url text,
  webhook_secret text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- ========================================
-- INDEXES FOR PLATFORM-SPECIFIC TABLES
-- ========================================
CREATE INDEX IF NOT EXISTS idx_telegram_bot_configs_platform_connection_id ON public.telegram_bot_configs(platform_connection_id);
CREATE INDEX IF NOT EXISTS idx_instagram_configs_platform_connection_id ON public.instagram_configs(platform_connection_id);
CREATE INDEX IF NOT EXISTS idx_tiktok_configs_platform_connection_id ON public.tiktok_configs(platform_connection_id);

-- ========================================
-- COMMENTS
-- ========================================
-- This migration enables multi-platform support while maintaining backward compatibility
-- with existing WhatsApp connections. The system can now handle:
-- - WhatsApp (existing)
-- - Telegram Bot API
-- - Instagram Graph API (Messaging)
-- - TikTok API (limited messaging support)
