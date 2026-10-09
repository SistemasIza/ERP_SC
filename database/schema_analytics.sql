-- Analytics Module Schema
-- Tables for analytics and reporting

-- Metrics
CREATE TABLE IF NOT EXISTS metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  name VARCHAR(255) NOT NULL,
  value DECIMAL(20, 6) NOT NULL,
  unit VARCHAR(50),
  metadata JSONB DEFAULT '{}',
  timestamp TIMESTAMP DEFAULT NOW(),
  CONSTRAINT fk_metrics_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

-- Indexes for metrics
CREATE INDEX idx_metrics_tenant_id ON metrics(tenant_id);
CREATE INDEX idx_metrics_name ON metrics(name);
CREATE INDEX idx_metrics_timestamp ON metrics(timestamp DESC);
CREATE INDEX idx_metrics_tenant_name_time ON metrics(tenant_id, name, timestamp DESC);

-- Metric Definitions
CREATE TABLE IF NOT EXISTS metric_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL UNIQUE,
  description TEXT,
  category VARCHAR(50) NOT NULL CHECK (category IN ('conversations', 'users', 'performance', 'revenue', 'engagement')),
  aggregation VARCHAR(20) NOT NULL CHECK (aggregation IN ('sum', 'avg', 'count', 'min', 'max')),
  unit VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Index for metric definitions
CREATE INDEX idx_metric_definitions_category ON metric_definitions(category);

-- Dashboards
CREATE TABLE IF NOT EXISTS dashboards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  widgets JSONB NOT NULL,
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT fk_dashboards_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

-- Indexes for dashboards
CREATE INDEX idx_dashboards_tenant_id ON dashboards(tenant_id);
CREATE INDEX idx_dashboards_is_default ON dashboards(is_default);

-- Reports
CREATE TABLE IF NOT EXISTS reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  query JSONB NOT NULL,
  schedule JSONB,
  recipients TEXT[] NOT NULL,
  format VARCHAR(20) NOT NULL CHECK (format IN ('pdf', 'csv', 'json')),
  is_active BOOLEAN DEFAULT TRUE,
  last_run_at TIMESTAMP,
  next_run_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT fk_reports_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

-- Indexes for reports
CREATE INDEX idx_reports_tenant_id ON reports(tenant_id);
CREATE INDEX idx_reports_is_active ON reports(is_active);
CREATE INDEX idx_reports_next_run_at ON reports(next_run_at) WHERE is_active = TRUE;

-- Funnels
CREATE TABLE IF NOT EXISTS funnels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  name VARCHAR(255) NOT NULL,
  steps JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT fk_funnels_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

-- Indexes for funnels
CREATE INDEX idx_funnels_tenant_id ON funnels(tenant_id);

-- Analytics Events (for funnel tracking)
CREATE TABLE IF NOT EXISTS analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  user_id UUID,
  session_id VARCHAR(255),
  event_name VARCHAR(255) NOT NULL,
  properties JSONB DEFAULT '{}',
  timestamp TIMESTAMP DEFAULT NOW(),
  CONSTRAINT fk_analytics_events_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  CONSTRAINT fk_analytics_events_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Indexes for analytics events
CREATE INDEX idx_analytics_events_tenant_id ON analytics_events(tenant_id);
CREATE INDEX idx_analytics_events_user_id ON analytics_events(user_id);
CREATE INDEX idx_analytics_events_event_name ON analytics_events(event_name);
CREATE INDEX idx_analytics_events_timestamp ON analytics_events(timestamp DESC);
CREATE INDEX idx_analytics_events_session_id ON analytics_events(session_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_analytics_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_metric_definitions_updated_at BEFORE UPDATE ON metric_definitions
  FOR EACH ROW EXECUTE FUNCTION update_analytics_updated_at();

CREATE TRIGGER update_dashboards_updated_at BEFORE UPDATE ON dashboards
  FOR EACH ROW EXECUTE FUNCTION update_analytics_updated_at();

CREATE TRIGGER update_reports_updated_at BEFORE UPDATE ON reports
  FOR EACH ROW EXECUTE FUNCTION update_analytics_updated_at();

CREATE TRIGGER update_funnels_updated_at BEFORE UPDATE ON funnels
  FOR EACH ROW EXECUTE FUNCTION update_analytics_updated_at();

-- Comments for documentation
COMMENT ON TABLE metrics IS 'Stores metric values for analytics';
COMMENT ON TABLE metric_definitions IS 'Stores metric definitions and configurations';
COMMENT ON TABLE dashboards IS 'Stores dashboard configurations';
COMMENT ON TABLE reports IS 'Stores report configurations and schedules';
COMMENT ON TABLE funnels IS 'Stores funnel definitions';
COMMENT ON TABLE analytics_events IS 'Stores individual events for funnel tracking and analytics';

COMMENT ON COLUMN metrics.metadata IS 'Additional metadata for the metric';
COMMENT ON COLUMN dashboards.widgets IS 'JSON array of widget configurations';
COMMENT ON COLUMN reports.schedule IS 'JSON configuration for report scheduling';
COMMENT ON COLUMN analytics_events.properties IS 'Event properties for filtering and analysis';
