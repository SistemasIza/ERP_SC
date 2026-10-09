-- Automation Engine Schema
-- Tables for workflow management and execution

-- Workflows table
CREATE TABLE IF NOT EXISTS workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  version INTEGER DEFAULT 1,
  status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('active', 'inactive', 'draft')),
  trigger JSONB NOT NULL,
  nodes JSONB NOT NULL,
  variables JSONB DEFAULT '{}',
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT fk_workflows_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

-- Index for faster tenant queries
CREATE INDEX idx_workflows_tenant_id ON workflows(tenant_id);
CREATE INDEX idx_workflows_status ON workflows(status);
CREATE INDEX idx_workflows_trigger_type ON workflows((trigger->>'type'));

-- Workflow executions table
CREATE TABLE IF NOT EXISTS workflow_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL,
  tenant_id UUID NOT NULL,
  status VARCHAR(50) DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed', 'stopped')),
  trigger_event JSONB NOT NULL,
  context JSONB NOT NULL,
  result JSONB,
  error TEXT,
  started_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP,
  CONSTRAINT fk_workflow_executions_workflow FOREIGN KEY (workflow_id) REFERENCES workflows(id) ON DELETE CASCADE,
  CONSTRAINT fk_workflow_executions_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

-- Indexes for workflow executions
CREATE INDEX idx_workflow_executions_workflow_id ON workflow_executions(workflow_id);
CREATE INDEX idx_workflow_executions_tenant_id ON workflow_executions(tenant_id);
CREATE INDEX idx_workflow_executions_status ON workflow_executions(status);
CREATE INDEX idx_workflow_executions_started_at ON workflow_executions(started_at DESC);

-- Workflow node execution history (for detailed tracking)
CREATE TABLE IF NOT EXISTS workflow_node_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  execution_id UUID NOT NULL,
  node_id VARCHAR(255) NOT NULL,
  node_type VARCHAR(100) NOT NULL,
  timestamp TIMESTAMP DEFAULT NOW(),
  success BOOLEAN NOT NULL,
  output JSONB,
  error TEXT,
  duration_ms INTEGER,
  CONSTRAINT fk_workflow_node_executions_execution FOREIGN KEY (execution_id) REFERENCES workflow_executions(id) ON DELETE CASCADE
);

-- Indexes for node executions
CREATE INDEX idx_workflow_node_executions_execution_id ON workflow_node_executions(execution_id);
CREATE INDEX idx_workflow_node_executions_node_id ON workflow_node_executions(node_id);
CREATE INDEX idx_workflow_node_executions_timestamp ON workflow_node_executions(timestamp DESC);

-- Workflow templates (for reusable workflow templates)
CREATE TABLE IF NOT EXISTS workflow_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100),
  template JSONB NOT NULL,
  is_public BOOLEAN DEFAULT FALSE,
  created_by UUID,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Index for workflow templates
CREATE INDEX idx_workflow_templates_category ON workflow_templates(category);
CREATE INDEX idx_workflow_templates_is_public ON workflow_templates(is_public);

-- Automation triggers (for scheduled and webhook triggers)
CREATE TABLE IF NOT EXISTS automation_triggers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL,
  tenant_id UUID NOT NULL,
  trigger_type VARCHAR(50) NOT NULL CHECK (trigger_type IN ('event', 'schedule', 'webhook', 'manual')),
  trigger_config JSONB NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  last_triggered_at TIMESTAMP,
  next_trigger_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT fk_automation_triggers_workflow FOREIGN KEY (workflow_id) REFERENCES workflows(id) ON DELETE CASCADE,
  CONSTRAINT fk_automation_triggers_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

-- Indexes for automation triggers
CREATE INDEX idx_automation_triggers_workflow_id ON automation_triggers(workflow_id);
CREATE INDEX idx_automation_triggers_tenant_id ON automation_triggers(tenant_id);
CREATE INDEX idx_automation_triggers_type ON automation_triggers(trigger_type);
CREATE INDEX idx_automation_triggers_next_trigger ON automation_triggers(next_trigger_at) WHERE is_active = TRUE;

-- Event log (for tracking all system events)
CREATE TABLE IF NOT EXISTS event_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  event_type VARCHAR(255) NOT NULL,
  source VARCHAR(100) NOT NULL,
  payload JSONB NOT NULL,
  metadata JSONB DEFAULT '{}',
  processed BOOLEAN DEFAULT FALSE,
  processed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT fk_event_log_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

-- Indexes for event log
CREATE INDEX idx_event_log_tenant_id ON event_log(tenant_id);
CREATE INDEX idx_event_log_event_type ON event_log(event_type);
CREATE INDEX idx_event_log_processed ON event_log(processed);
CREATE INDEX idx_event_log_created_at ON event_log(created_at DESC);

-- Composite index for event processing
CREATE INDEX idx_event_log_tenant_type_processed ON event_log(tenant_id, event_type, processed) WHERE processed = FALSE;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_workflows_updated_at BEFORE UPDATE ON workflows
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_workflow_templates_updated_at BEFORE UPDATE ON workflow_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_automation_triggers_updated_at BEFORE UPDATE ON automation_triggers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Comments for documentation
COMMENT ON TABLE workflows IS 'Stores workflow definitions for automation engine';
COMMENT ON TABLE workflow_executions IS 'Stores execution history of workflows';
COMMENT ON TABLE workflow_node_executions IS 'Stores detailed execution history for each node in a workflow';
COMMENT ON TABLE workflow_templates IS 'Stores reusable workflow templates';
COMMENT ON TABLE automation_triggers IS 'Stores trigger configurations for workflows';
COMMENT ON TABLE event_log IS 'Stores all system events for workflow triggering';

COMMENT ON COLUMN workflows.trigger IS 'Trigger configuration (event, schedule, webhook, manual)';
COMMENT ON COLUMN workflows.nodes IS 'Array of workflow nodes with their configurations';
COMMENT ON COLUMN workflows.variables IS 'Global variables accessible in the workflow';
COMMENT ON COLUMN workflows.settings IS 'Workflow settings (retry policy, timeout, error handling)';

COMMENT ON COLUMN workflow_executions.context IS 'Execution context including variables and history';
COMMENT ON COLUMN workflow_executions.result IS 'Final result of the workflow execution';

COMMENT ON COLUMN automation_triggers.next_trigger_at IS 'Next scheduled trigger time for scheduled workflows';
