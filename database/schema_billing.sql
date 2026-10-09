-- Billing System Schema
-- Tables for billing and subscription management

-- Plans
CREATE TABLE IF NOT EXISTS plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL CHECK (type IN ('free', 'starter', 'professional', 'enterprise')),
  price DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(3) NOT NULL DEFAULT 'USD',
  cycle VARCHAR(20) NOT NULL CHECK (cycle IN ('monthly', 'yearly')),
  features TEXT[] NOT NULL,
  limits JSONB NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for plans
CREATE INDEX idx_plans_type ON plans(type);
CREATE INDEX idx_plans_is_active ON plans(is_active);

-- Subscriptions
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  plan_id UUID NOT NULL,
  status VARCHAR(50) NOT NULL CHECK (status IN ('active', 'trialing', 'past_due', 'cancelled', 'unpaid')),
  cycle VARCHAR(20) NOT NULL CHECK (cycle IN ('monthly', 'yearly')),
  start_date TIMESTAMP NOT NULL,
  end_date TIMESTAMP NOT NULL,
  trial_ends_at TIMESTAMP,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT fk_subscriptions_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  CONSTRAINT fk_subscriptions_plan FOREIGN KEY (plan_id) REFERENCES plans(id)
);

-- Indexes for subscriptions
CREATE INDEX idx_subscriptions_tenant_id ON subscriptions(tenant_id);
CREATE INDEX idx_subscriptions_plan_id ON subscriptions(plan_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);
CREATE INDEX idx_subscriptions_end_date ON subscriptions(end_date);

-- Invoices
CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  subscription_id UUID NOT NULL,
  number VARCHAR(255) NOT NULL UNIQUE,
  status VARCHAR(50) NOT NULL CHECK (status IN ('draft', 'pending', 'paid', 'failed', 'cancelled')),
  amount DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(3) NOT NULL DEFAULT 'USD',
  due_date TIMESTAMP NOT NULL,
  paid_at TIMESTAMP,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT fk_invoices_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  CONSTRAINT fk_invoices_subscription FOREIGN KEY (subscription_id) REFERENCES subscriptions(id)
);

-- Indexes for invoices
CREATE INDEX idx_invoices_tenant_id ON invoices(tenant_id);
CREATE INDEX idx_invoices_subscription_id ON invoices(subscription_id);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_invoices_due_date ON invoices(due_date);

-- Invoice Items
CREATE TABLE IF NOT EXISTS invoice_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL,
  description TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  unit_price DECIMAL(10, 2) NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT fk_invoice_items_invoice FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE
);

-- Index for invoice items
CREATE INDEX idx_invoice_items_invoice_id ON invoice_items(invoice_id);

-- Payment Methods
CREATE TABLE IF NOT EXISTS payment_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  type VARCHAR(50) NOT NULL CHECK (type IN ('card', 'bank_account', 'paypal')),
  provider VARCHAR(50) NOT NULL,
  provider_customer_id TEXT NOT NULL,
  provider_payment_method_id TEXT NOT NULL,
  is_default BOOLEAN DEFAULT FALSE,
  last4 VARCHAR(4),
  expiry_month INTEGER,
  expiry_year INTEGER,
  brand VARCHAR(50),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT fk_payment_methods_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

-- Indexes for payment methods
CREATE INDEX idx_payment_methods_tenant_id ON payment_methods(tenant_id);
CREATE INDEX idx_payment_methods_is_default ON payment_methods(is_default);

-- Usage Tracking
CREATE TABLE IF NOT EXISTS usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  subscription_id UUID NOT NULL,
  period_start TIMESTAMP NOT NULL,
  period_end TIMESTAMP NOT NULL,
  metrics JSONB NOT NULL,
  calculated_cost DECIMAL(10, 2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT fk_usage_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  CONSTRAINT fk_usage_subscription FOREIGN KEY (subscription_id) REFERENCES subscriptions(id)
);

-- Indexes for usage
CREATE INDEX idx_usage_tenant_id ON usage(tenant_id);
CREATE INDEX idx_usage_subscription_id ON usage(subscription_id);
CREATE INDEX idx_usage_period ON usage(period_start, period_end);

-- Billing Events Log
CREATE TABLE IF NOT EXISTS billing_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  type VARCHAR(100) NOT NULL,
  data JSONB NOT NULL,
  timestamp TIMESTAMP DEFAULT NOW(),
  CONSTRAINT fk_billing_events_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

-- Indexes for billing events
CREATE INDEX idx_billing_events_tenant_id ON billing_events(tenant_id);
CREATE INDEX idx_billing_events_type ON billing_events(type);
CREATE INDEX idx_billing_events_timestamp ON billing_events(timestamp DESC);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_billing_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_plans_updated_at BEFORE UPDATE ON plans
  FOR EACH ROW EXECUTE FUNCTION update_billing_updated_at();

CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_billing_updated_at();

CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON invoices
  FOR EACH ROW EXECUTE FUNCTION update_billing_updated_at();

CREATE TRIGGER update_payment_methods_updated_at BEFORE UPDATE ON payment_methods
  FOR EACH ROW EXECUTE FUNCTION update_billing_updated_at();

-- Comments for documentation
COMMENT ON TABLE plans IS 'Stores subscription plans';
COMMENT ON TABLE subscriptions IS 'Stores tenant subscriptions';
COMMENT ON TABLE invoices IS 'Stores billing invoices';
COMMENT ON TABLE invoice_items IS 'Stores individual invoice line items';
COMMENT ON TABLE payment_methods IS 'Stores payment methods for tenants';
COMMENT ON TABLE usage IS 'Tracks resource usage per billing period';
COMMENT ON TABLE billing_events IS 'Logs billing-related events';

COMMENT ON COLUMN plans.limits IS 'JSON object with resource limits (users, conversations, workflows, aiTokens, apiCalls, storage)';
COMMENT ON COLUMN subscriptions.cancel_at_period_end IS 'If true, subscription will be cancelled at period end';
COMMENT ON COLUMN payment_methods.provider_customer_id IS 'Customer ID from payment provider (e.g., Stripe)';
COMMENT ON COLUMN usage.metrics IS 'JSON object with usage metrics for the period';
