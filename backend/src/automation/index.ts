/**
 * Automation Engine Module
 * Main entry point for the automation system
 */

export { WorkflowOrchestrator } from './orchestrator/workflow-orchestrator';
export { WorkflowService } from './workflow.service';
export { EventSystem } from './events/event-system';
export { AutomationWorker } from './worker/automation.worker';

export {
  Workflow,
  WorkflowTrigger,
  WorkflowNode,
  WorkflowSettings,
  WorkflowContext,
  NodeResult,
  NodeExecutionHistory,
  SystemEvent,
  WorkflowExecution,
  EventType,
  ValidationResult,
} from './types/workflow.types';

export {
  WorkflowNodeExecutor,
  BaseWorkflowNode,
  ConfigSchema,
  ConfigProperty,
} from './nodes/base-node.interface';

// Node exports
export { EventTriggerNode } from './nodes/triggers/event-trigger.node';
export { ConditionNode } from './nodes/logic/condition.node';
export { DelayNode } from './nodes/logic/delay.node';
export { SendMessageNode } from './nodes/actions/send-message.node';
export { CreateContactNode } from './nodes/actions/create-contact.node';
export { WebhookNode } from './nodes/integration/webhook.node';
export { HttpRequestNode } from './nodes/integration/http-request.node';

// Routes export
export { default as workflowRoutes } from './routes/workflow.routes';
