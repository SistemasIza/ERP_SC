-- Public API Schema
-- Tables for public API management (n8n integration)

-- API Keys
CREATE TABLE IF NOT EXISTS api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  name VARCHAR(255) NOT NULL,
  key TEXT NOT NULL UNIQUE,
  scopes TEXT[] NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  expires_at TIMESTAMP,
  last_used_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT fk_api_keys_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

-- Indexes for API keys
CREATE INDEX idx_api_keys_tenant_id ON api_keys(tenant_id);
CREATE INDEX idx_api_keys_key ON api_keys(key);
CREATE INDEX idx_api_keys_is_active ON api_keys(is_active);
CREATE INDEX idx_api_keys_expires_at ON api_keys(expires_at) WHERE expires_at IS NOT NULL;

-- Public Webhooks
CREATE TABLE IF NOT EXISTS public_webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  name VARCHAR(255) NOT NULL,
  path TEXT NOT NULL UNIQUE,
  method VARCHAR(10) NOT NULL CHECK (method IN ('GET', 'POST', 'PUT', 'PATCH', 'DELETE')),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT fk_public_webhooks_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

-- Indexes for public webhooks
CREATE INDEX idx_public_webhooks_tenant_id ON public_webhooks(tenant_id);
CREATE INDEX idx_public_webhooks_path ON public_webhooks(path);
CREATE INDEX idx_public_webhooks_is_active ON public_webhooks(is_active);

-- API Request Log
CREATE TABLE IF NOT EXISTS api_request_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  api_key_id UUID,
  endpoint TEXT NOT NULL,
  method VARCHAR(10) NOT NULL,
  headers JSONB DEFAULT '{}',
  body JSONB,
  status_code INTEGER,
  response_time_ms INTEGER,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT fk_api_request_log_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  CONSTRAINT fk_api_request_log_api_key FOREIGN KEY (api_key_id) REFERENCES api_keys(id) ON DELETE SET NULL
);

-- Indexes for API request log
CREATE INDEX idx_api_request_log_tenant_id ON api_request_log(tenant_id);
CREATE INDEX idx_api_request_log_api_key_id ON api_request_log(api_key_id);
CREATE INDEX idx_api_request_log_created_at ON api_request_log(created_at DESC);
CREATE INDEX idx_api_request_log_endpoint ON api_request_log(endpoint);

-- API Rate Limit Tracking
CREATE TABLE IF NOT EXISTS api_rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL UNIQUE,
  requests_per_minute INTEGER DEFAULT 60,
  requests_per_hour INTEGER DEFAULT 1000,
  current_minute INTEGER DEFAULT 0,
  current_hour INTEGER DEFAULT 0,
  reset_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT fk_api_rate_limits_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

-- Index for rate limits
CREATE INDEX idx_api_rate_limits_tenant_id ON api_rate_limits(tenant_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_api_rate_limits_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updated_at
CREATE TRIGGER update_api_rate_limits_updated_at BEFORE UPDATE ON api_rate_limits
  FOR EACH ROW EXECUTE FUNCTION update_api_rate_limits_updated_at();

-- Comments for documentation
COMMENT ON TABLE api_keys IS 'Stores API keys for public API access';
COMMENT ON TABLE public_webhooks IS 'Stores public webhook endpoints for external integrations';
COMMENT ON TABLE api_request_log IS 'Logs all API requests for monitoring and analytics';
COMMENT ON TABLE api_rate_limits IS 'Tracks rate limit usage per tenant';

COMMENT ON COLUMN api_keys.key IS 'Encrypted API key';
COMMENT ON COLUMN api_keys.scopes IS 'Array of scopes/permissions for this key';
COMMENT ON COLUMN api_request_log.response_time_ms IS 'Response time in milliseconds';
COMMENT ON COLUMN api_rate_limits.reset_at IS 'Timestamp when the rate limit counter resets';
