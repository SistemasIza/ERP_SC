-- RBAC Schema
-- Tables for Role-Based Access Control

-- User Roles
CREATE TABLE IF NOT EXISTS user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  tenant_id UUID NOT NULL,
  role VARCHAR(50) NOT NULL CHECK (role IN ('admin', 'owner', 'agent', 'viewer', 'custom')),
  custom_permissions TEXT[] DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT fk_user_roles_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_user_roles_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  UNIQUE(user_id, tenant_id)
);

-- Indexes for user roles
CREATE INDEX idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX idx_user_roles_tenant_id ON user_roles(tenant_id);
CREATE INDEX idx_user_roles_role ON user_roles(role);

-- Access Policies
CREATE TABLE IF NOT EXISTS access_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  resource_type VARCHAR(100) NOT NULL,
  permissions TEXT[] NOT NULL,
  conditions JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT fk_access_policies_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

-- Indexes for access policies
CREATE INDEX idx_access_policies_tenant_id ON access_policies(tenant_id);
CREATE INDEX idx_access_policies_resource_type ON access_policies(resource_type);
CREATE INDEX idx_access_policies_is_active ON access_policies(is_active);

-- Resource Access
CREATE TABLE IF NOT EXISTS resource_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  tenant_id UUID NOT NULL,
  resource_type VARCHAR(100) NOT NULL,
  resource_id UUID NOT NULL,
  permissions TEXT[] NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT fk_resource_access_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_resource_access_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  UNIQUE(user_id, resource_type, resource_id)
);

-- Indexes for resource access
CREATE INDEX idx_resource_access_user_id ON resource_access(user_id);
CREATE INDEX idx_resource_access_tenant_id ON resource_access(tenant_id);
CREATE INDEX idx_resource_access_resource ON resource_access(resource_type, resource_id);

-- Permission Audit Log
CREATE TABLE IF NOT EXISTS permission_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  tenant_id UUID NOT NULL,
  action VARCHAR(50) NOT NULL,
  resource_type VARCHAR(100),
  resource_id UUID,
  permission VARCHAR(255),
  granted BOOLEAN,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT fk_permission_audit_log_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_permission_audit_log_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

-- Indexes for audit log
CREATE INDEX idx_permission_audit_log_user_id ON permission_audit_log(user_id);
CREATE INDEX idx_permission_audit_log_tenant_id ON permission_audit_log(tenant_id);
CREATE INDEX idx_permission_audit_log_created_at ON permission_audit_log(created_at DESC);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_rbac_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_user_roles_updated_at BEFORE UPDATE ON user_roles
  FOR EACH ROW EXECUTE FUNCTION update_rbac_updated_at();

CREATE TRIGGER update_access_policies_updated_at BEFORE UPDATE ON access_policies
  FOR EACH ROW EXECUTE FUNCTION update_rbac_updated_at();

CREATE TRIGGER update_resource_access_updated_at BEFORE UPDATE ON resource_access
  FOR EACH ROW EXECUTE FUNCTION update_rbac_updated_at();

-- Comments for documentation
COMMENT ON TABLE user_roles IS 'Stores user roles per tenant';
COMMENT ON TABLE access_policies IS 'Stores access policies for resources';
COMMENT ON TABLE resource_access IS 'Stores explicit resource access grants';
COMMENT ON TABLE permission_audit_log IS 'Audit log for permission checks and changes';

COMMENT ON COLUMN user_roles.custom_permissions IS 'Array of custom permissions for this user role';
COMMENT ON COLUMN access_policies.conditions IS 'JSON conditions for policy evaluation';
COMMENT ON COLUMN resource_access.permissions IS 'Array of permissions granted for this specific resource';
