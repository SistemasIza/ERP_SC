-- ========================================
-- WHATSAPP SESSION PERSISTENCE SCHEMA
-- ========================================
-- This schema enables storing WhatsApp session data in the database
-- instead of local files, enabling automatic session restoration and
-- containerized deployments without state dependencies.

-- ========================================
-- TABLE: WHATSAPP SESSIONS
-- ========================================
-- Stores authentication credentials and session data for WhatsApp connections
CREATE TABLE IF NOT EXISTS public.whatsapp_sessions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  whatsapp_connection_id uuid NOT NULL UNIQUE REFERENCES public.whatsapp_connections(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  
  -- Session credentials (encrypted or base64 encoded)
  auth_state jsonb NOT NULL DEFAULT '{}',
  
  -- Session metadata
  user_jid text, -- WhatsApp JID of the connected user
  phone_number text,
  device_id text,
  
  -- Session status
  is_active boolean DEFAULT false,
  last_restored_at timestamp with time zone,
  expires_at timestamp with time zone,
  
  -- Timestamps
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  
  -- Constraints
  CONSTRAINT unique_connection_session UNIQUE (whatsapp_connection_id)
);

-- ========================================
-- INDEXES FOR PERFORMANCE
-- ========================================
CREATE INDEX IF NOT EXISTS idx_whatsapp_sessions_connection_id ON public.whatsapp_sessions(whatsapp_connection_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_sessions_organization_id ON public.whatsapp_sessions(organization_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_sessions_is_active ON public.whatsapp_sessions(is_active);
CREATE INDEX IF NOT EXISTS idx_whatsapp_sessions_expires_at ON public.whatsapp_sessions(expires_at);

-- ========================================
-- FUNCTION: UPDATE UPDATED_AT TIMESTAMP
-- ========================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- ========================================
-- TRIGGER: AUTO-UPDATE UPDATED_AT
-- ========================================
CREATE TRIGGER update_whatsapp_sessions_updated_at
  BEFORE UPDATE ON public.whatsapp_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- COMMENTS
-- ========================================
COMMENT ON TABLE public.whatsapp_sessions IS 'Stores WhatsApp session credentials for automatic restoration';
COMMENT ON COLUMN public.whatsapp_sessions.auth_state IS 'JSON object containing Baileys auth state (creds, keys, etc.)';
COMMENT ON COLUMN public.whatsapp_sessions.user_jid IS 'WhatsApp JID of the authenticated user';
COMMENT ON COLUMN public.whatsapp_sessions.is_active IS 'Whether the session is currently active and connected';
COMMENT ON COLUMN public.whatsapp_sessions.last_restored_at IS 'Timestamp when the session was last restored from storage';
