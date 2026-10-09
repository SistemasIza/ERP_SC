/**
 * Workflow Type Definitions
 * Core types for the automation engine
 */

export interface Workflow {
  id: string;
  tenantId: string;
  name: string;
  description: string;
  version: number;
  status: 'active' | 'inactive' | 'draft';
  trigger: WorkflowTrigger;
  nodes: WorkflowNode[];
  variables?: Record<string, any>;
  settings: WorkflowSettings;
  createdAt: Date;
  updatedAt: Date;
}

export interface WorkflowTrigger {
  type: 'event' | 'schedule' | 'webhook' | 'manual';
  config: {
    eventType?: string;
    eventFilters?: Record<string, any>;
    schedule?: string; // cron expression
    webhookPath?: string;
    startNodeId?: string;
  };
}

export interface WorkflowNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  config: Record<string, any>;
  connections: {
    input: string[];
    output: string[];
  };
}

export interface WorkflowSettings {
  retryPolicy: {
    maxRetries: number;
    backoffMs: number;
  };
  timeoutMs: number;
  errorHandling: 'stop' | 'continue' | 'retry';
}

export interface WorkflowContext {
  workflowId: string;
  executionId: string;
  tenantId: string;
  triggerEvent: SystemEvent;
  variables: Record<string, any>;
  currentNodeId: string | null;
  history: NodeExecutionHistory[];
  metadata: {
    startTime: number;
    userId?: string;
    ipAddress?: string;
  };
}

export interface NodeResult {
  success: boolean;
  output?: any;
  error?: Error;
  nextNodeId?: string;
  shouldStop?: boolean;
}

export interface NodeExecutionHistory {
  nodeId: string;
  nodeType: string;
  timestamp: number;
  success: boolean;
  output?: any;
  error?: string;
}

export interface SystemEvent {
  id: string;
  tenantId: string;
  type: string;
  source: string;
  payload: any;
  metadata: {
    timestamp: number;
    correlationId?: string;
    causationId?: string;
    userId?: string;
  };
}

export interface WorkflowExecution {
  id: string;
  workflowId: string;
  tenantId: string;
  status: 'running' | 'completed' | 'failed' | 'stopped';
  triggerEvent: SystemEvent;
  context: WorkflowContext;
  result?: NodeResult;
  error?: string;
  startedAt: Date;
  completedAt?: Date;
}

export enum EventType {
  // Contact Events
  CONTACT_CREATED = 'contact.created',
  CONTACT_UPDATED = 'contact.updated',
  CONTACT_DELETED = 'contact.deleted',
  
  // Conversation Events
  CONVERSATION_CREATED = 'conversation.created',
  CONVERSATION_UPDATED = 'conversation.updated',
  MESSAGE_RECEIVED = 'message.received',
  MESSAGE_SENT = 'message.sent',
  CONVERSATION_ASSIGNED = 'conversation.assigned',
  CONVERSATION_TRANSFERRED = 'conversation.transferred',
  
  // CRM Events
  LEAD_CREATED = 'lead.created',
  LEAD_UPDATED = 'lead.updated',
  LEAD_CONVERTED = 'lead.converted',
  DEAL_CREATED = 'deal.created',
  DEAL_UPDATED = 'deal.updated',
  DEAL_WON = 'deal.won',
  DEAL_LOST = 'deal.lost',
  
  // Automation Events
  WORKFLOW_TRIGGERED = 'workflow.triggered',
  WORKFLOW_EXECUTED = 'workflow.executed',
  WORKFLOW_FAILED = 'workflow.failed',
  
  // Channel Events
  CHANNEL_CONNECTED = 'channel.connected',
  CHANNEL_DISCONNECTED = 'channel.disconnected',
  CHANNEL_ERROR = 'channel.error',
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export interface ConfigSchema {
  type: 'object';
  properties: Record<string, ConfigProperty>;
  required?: string[];
}

export interface ConfigProperty {
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  description?: string;
  default?: any;
  enum?: any[];
  minimum?: number;
  maximum?: number;
  properties?: Record<string, ConfigProperty>;
  items?: ConfigProperty;
}
