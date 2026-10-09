-- Notification System Schema
-- Tables for notification management

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  user_id UUID,
  channel VARCHAR(50) NOT NULL CHECK (channel IN ('email', 'sms', 'push', 'in_app', 'webhook')),
  type VARCHAR(100) NOT NULL,
  subject TEXT,
  content TEXT NOT NULL,
  html_content TEXT,
  recipient TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  status VARCHAR(50) NOT NULL CHECK (status IN ('pending', 'sent', 'delivered', 'failed', 'bounced')),
  priority VARCHAR(20) NOT NULL CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  scheduled_for TIMESTAMP,
  sent_at TIMESTAMP,
  delivered_at TIMESTAMP,
  error TEXT,
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT fk_notifications_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  CONSTRAINT fk_notifications_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Indexes for notifications
CREATE INDEX idx_notifications_tenant_id ON notifications(tenant_id);
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_channel ON notifications(channel);
CREATE INDEX idx_notifications_status ON notifications(status);
CREATE INDEX idx_notifications_scheduled_for ON notifications(scheduled_for) WHERE status = 'pending';
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);

-- Notification Templates
CREATE TABLE IF NOT EXISTS notification_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  channel VARCHAR(50) NOT NULL CHECK (channel IN ('email', 'sms', 'push', 'in_app', 'webhook')),
  type VARCHAR(100) NOT NULL,
  subject_template TEXT,
  content_template TEXT NOT NULL,
  html_template TEXT,
  variables TEXT[] NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT fk_notification_templates_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

-- Indexes for notification templates
CREATE INDEX idx_notification_templates_tenant_id ON notification_templates(tenant_id);
CREATE INDEX idx_notification_templates_channel ON notification_templates(channel);
CREATE INDEX idx_notification_templates_type ON notification_templates(type);
CREATE INDEX idx_notification_templates_is_active ON notification_templates(is_active);

-- Notification Preferences
CREATE TABLE IF NOT EXISTS notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  tenant_id UUID NOT NULL,
  channel VARCHAR(50) NOT NULL CHECK (channel IN ('email', 'sms', 'push', 'in_app', 'webhook')),
  enabled BOOLEAN DEFAULT TRUE,
  categories TEXT[] DEFAULT '{}',
  quiet_hours JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT fk_notification_preferences_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_notification_preferences_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  UNIQUE(user_id, tenant_id, channel)
);

-- Indexes for notification preferences
CREATE INDEX idx_notification_preferences_user_id ON notification_preferences(user_id);
CREATE INDEX idx_notification_preferences_tenant_id ON notification_preferences(tenant_id);
CREATE INDEX idx_notification_preferences_channel ON notification_preferences(channel);

-- Email Configurations
CREATE TABLE IF NOT EXISTS email_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  provider VARCHAR(50) NOT NULL CHECK (provider IN ('smtp', 'sendgrid', 'ses', 'mailgun')),
  host TEXT,
  port INTEGER,
  username TEXT,
  password TEXT,
  api_key TEXT,
  from_email TEXT NOT NULL,
  from_name TEXT,
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT fk_email_configs_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

-- Indexes for email configs
CREATE INDEX idx_email_configs_tenant_id ON email_configs(tenant_id);
CREATE INDEX idx_email_configs_is_default ON email_configs(is_default);

-- SMS Configurations
CREATE TABLE IF NOT EXISTS sms_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  provider VARCHAR(50) NOT NULL CHECK (provider IN ('twilio', 'nexmo', 'aws_sns')),
  account_sid TEXT,
  auth_token TEXT,
  api_key TEXT,
  api_secret TEXT,
  from_number TEXT,
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT fk_sms_configs_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

-- Indexes for SMS configs
CREATE INDEX idx_sms_configs_tenant_id ON sms_configs(tenant_id);
CREATE INDEX idx_sms_configs_is_default ON sms_configs(is_default);

-- Push Configurations
CREATE TABLE IF NOT EXISTS push_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  provider VARCHAR(50) NOT NULL CHECK (provider IN ('fcm', 'apns', 'one_signal')),
  api_key TEXT,
  auth_key TEXT,
  project_id TEXT,
  app_id TEXT,
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT fk_push_configs_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

-- Indexes for push configs
CREATE INDEX idx_push_configs_tenant_id ON push_configs(tenant_id);
CREATE INDEX idx_push_configs_is_default ON push_configs(is_default);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_notifications_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_notifications_updated_at BEFORE UPDATE ON notifications
  FOR EACH ROW EXECUTE FUNCTION update_notifications_updated_at();

CREATE TRIGGER update_notification_templates_updated_at BEFORE UPDATE ON notification_templates
  FOR EACH ROW EXECUTE FUNCTION update_notifications_updated_at();

CREATE TRIGGER update_notification_preferences_updated_at BEFORE UPDATE ON notification_preferences
  FOR EACH ROW EXECUTE FUNCTION update_notifications_updated_at();

CREATE TRIGGER update_email_configs_updated_at BEFORE UPDATE ON email_configs
  FOR EACH ROW EXECUTE FUNCTION update_notifications_updated_at();

CREATE TRIGGER update_sms_configs_updated_at BEFORE UPDATE ON sms_configs
  FOR EACH ROW EXECUTE FUNCTION update_notifications_updated_at();

CREATE TRIGGER update_push_configs_updated_at BEFORE UPDATE ON push_configs
  FOR EACH ROW EXECUTE FUNCTION update_notifications_updated_at();

-- Comments for documentation
COMMENT ON TABLE notifications IS 'Stores notification records';
COMMENT ON TABLE notification_templates IS 'Stores reusable notification templates';
COMMENT ON TABLE notification_preferences IS 'Stores user notification preferences';
COMMENT ON TABLE email_configs IS 'Stores email provider configurations';
COMMENT ON TABLE sms_configs IS 'Stores SMS provider configurations';
COMMENT ON TABLE push_configs IS 'Stores push notification provider configurations';

COMMENT ON COLUMN notifications.quiet_hours IS 'JSON object with start and end time for quiet hours';
COMMENT ON COLUMN notification_templates.variables IS 'Array of variable names that can be used in templates';
COMMENT ON COLUMN email_configs.password IS 'Encrypted password for SMTP';
COMMENT ON COLUMN sms_configs.auth_token IS 'Encrypted auth token for SMS provider';
COMMENT ON COLUMN push_configs.api_key IS 'Encrypted API key for push provider';
