-- AI Module Schema
-- Tables for AI/LLM integration

-- AI provider configurations per tenant
CREATE TABLE IF NOT EXISTS ai_provider_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  provider VARCHAR(50) NOT NULL CHECK (provider IN ('openai', 'anthropic', 'cohere', 'custom')),
  api_key TEXT NOT NULL,
  default_model VARCHAR(255) NOT NULL,
  base_url TEXT,
  organization_id TEXT,
  max_retries INTEGER DEFAULT 3,
  timeout_ms INTEGER DEFAULT 30000,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT fk_ai_provider_configs_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  UNIQUE(tenant_id, provider)
);

-- Indexes for provider configs
CREATE INDEX idx_ai_provider_configs_tenant_id ON ai_provider_configs(tenant_id);
CREATE INDEX idx_ai_provider_configs_provider ON ai_provider_configs(provider);
CREATE INDEX idx_ai_provider_configs_is_active ON ai_provider_configs(is_active);

-- AI conversations
CREATE TABLE IF NOT EXISTS ai_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  user_id UUID,
  title TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT fk_ai_conversations_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  CONSTRAINT fk_ai_conversations_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Indexes for conversations
CREATE INDEX idx_ai_conversations_tenant_id ON ai_conversations(tenant_id);
CREATE INDEX idx_ai_conversations_user_id ON ai_conversations(user_id);
CREATE INDEX idx_ai_conversations_created_at ON ai_conversations(created_at DESC);

-- AI conversation messages
CREATE TABLE IF NOT EXISTS ai_conversation_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL,
  role VARCHAR(20) NOT NULL CHECK (role IN ('system', 'user', 'assistant')),
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT fk_ai_conversation_messages_conversation FOREIGN KEY (conversation_id) REFERENCES ai_conversations(id) ON DELETE CASCADE
);

-- Indexes for conversation messages
CREATE INDEX idx_ai_conversation_messages_conversation_id ON ai_conversation_messages(conversation_id);
CREATE INDEX idx_ai_conversation_messages_created_at ON ai_conversation_messages(created_at);

-- AI usage tracking
CREATE TABLE IF NOT EXISTS ai_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  provider VARCHAR(50) NOT NULL,
  model VARCHAR(255) NOT NULL,
  prompt_tokens INTEGER NOT NULL,
  completion_tokens INTEGER NOT NULL,
  total_tokens INTEGER NOT NULL,
  cost DECIMAL(10, 6) NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT fk_ai_usage_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

-- Indexes for usage tracking
CREATE INDEX idx_ai_usage_tenant_id ON ai_usage(tenant_id);
CREATE INDEX idx_ai_usage_provider ON ai_usage(provider);
CREATE INDEX idx_ai_usage_model ON ai_usage(model);
CREATE INDEX idx_ai_usage_created_at ON ai_usage(created_at DESC);
CREATE INDEX idx_ai_usage_tenant_created ON ai_usage(tenant_id, created_at DESC);

-- AI prompts/templates
CREATE TABLE IF NOT EXISTS ai_prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100),
  system_prompt TEXT,
  user_prompt_template TEXT NOT NULL,
  variables JSONB DEFAULT '{}',
  is_public BOOLEAN DEFAULT FALSE,
  created_by UUID,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT fk_ai_prompts_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  CONSTRAINT fk_ai_prompts_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Indexes for prompts
CREATE INDEX idx_ai_prompts_tenant_id ON ai_prompts(tenant_id);
CREATE INDEX idx_ai_prompts_category ON ai_prompts(category);
CREATE INDEX idx_ai_prompts_is_public ON ai_prompts(is_public);

-- AI function definitions for function calling
CREATE TABLE IF NOT EXISTS ai_functions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  parameters JSONB NOT NULL,
  implementation TEXT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT fk_ai_functions_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  UNIQUE(tenant_id, name)
);

-- Indexes for functions
CREATE INDEX idx_ai_functions_tenant_id ON ai_functions(tenant_id);
CREATE INDEX idx_ai_functions_name ON ai_functions(name);
CREATE INDEX idx_ai_functions_is_active ON ai_functions(is_active);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_ai_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_ai_provider_configs_updated_at BEFORE UPDATE ON ai_provider_configs
  FOR EACH ROW EXECUTE FUNCTION update_ai_updated_at_column();

CREATE TRIGGER update_ai_conversations_updated_at BEFORE UPDATE ON ai_conversations
  FOR EACH ROW EXECUTE FUNCTION update_ai_updated_at_column();

CREATE TRIGGER update_ai_prompts_updated_at BEFORE UPDATE ON ai_prompts
  FOR EACH ROW EXECUTE FUNCTION update_ai_updated_at_column();

CREATE TRIGGER update_ai_functions_updated_at BEFORE UPDATE ON ai_functions
  FOR EACH ROW EXECUTE FUNCTION update_ai_updated_at_column();

-- Comments for documentation
COMMENT ON TABLE ai_provider_configs IS 'Stores AI provider configurations per tenant';
COMMENT ON TABLE ai_conversations IS 'Stores AI conversation history';
COMMENT ON TABLE ai_conversation_messages IS 'Stores individual messages in AI conversations';
COMMENT ON TABLE ai_usage IS 'Tracks AI usage and costs per tenant';
COMMENT ON TABLE ai_prompts IS 'Stores reusable prompt templates';
COMMENT ON TABLE ai_functions IS 'Stores function definitions for AI function calling';

COMMENT ON COLUMN ai_provider_configs.api_key IS 'Encrypted API key for the provider';
COMMENT ON COLUMN ai_usage.cost IS 'Cost in USD for the usage';
COMMENT ON COLUMN ai_prompts.user_prompt_template IS 'Template for user prompt with {{variable}} syntax';
COMMENT ON COLUMN ai_functions.parameters IS 'JSON Schema for function parameters';
COMMENT ON COLUMN ai_functions.implementation IS 'Code or reference to implementation of the function';
