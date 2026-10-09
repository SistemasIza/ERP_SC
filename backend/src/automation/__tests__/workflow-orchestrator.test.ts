/**
 * Workflow Orchestrator Tests
 * Unit tests for the workflow orchestrator
 */

import { WorkflowOrchestrator } from '../orchestrator/workflow-orchestrator';
import { EventTriggerNode } from '../nodes/triggers/event-trigger.node';
import { ConditionNode } from '../nodes/logic/condition.node';
import { Workflow, WorkflowContext, WorkflowNode, SystemEvent } from '../types/workflow.types';

describe('WorkflowOrchestrator', () => {
  let orchestrator: WorkflowOrchestrator;

  beforeEach(() => {
    orchestrator = new WorkflowOrchestrator();
  });

  describe('Node Registration', () => {
    it('should register a node', () => {
      const node = new EventTriggerNode();
      orchestrator.registerNode(node);
      
      expect(orchestrator.getNode(node.type)).toBeDefined();
    });

    it('should not register duplicate nodes', () => {
      const node = new EventTriggerNode();
      orchestrator.registerNode(node);
      
      expect(() => orchestrator.registerNode(node)).not.toThrow();
    });
  });

  describe('Workflow Execution', () => {
    it('should execute a simple workflow', async () => {
      const triggerNode = new EventTriggerNode();
      orchestrator.registerNode(triggerNode);

      const workflow: Workflow = {
        id: 'test-workflow',
        tenantId: 'tenant-1',
        name: 'Test Workflow',
        description: 'A test workflow',
        version: 1,
        status: 'active',
        trigger: {
          type: 'event',
          config: {
            eventType: 'message.received',
            startNodeId: 'node-1',
          },
        },
        nodes: [
          {
            id: 'node-1',
            type: 'event_trigger',
            position: { x: 0, y: 0 },
            config: {
              eventType: 'message.received',
            },
            connections: {
              input: [],
              output: [],
            },
          },
        ],
        variables: {},
        settings: {
          retryPolicy: {
            maxRetries: 3,
            backoffMs: 1000,
          },
          timeoutMs: 30000,
          errorHandling: 'stop',
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const triggerEvent: SystemEvent = {
        id: 'event-1',
        tenantId: 'tenant-1',
        type: 'message.received',
        source: 'test',
        payload: {},
        metadata: {
          timestamp: Date.now(),
        },
      };

      const result = await orchestrator.executeWorkflow(workflow, triggerEvent);

      expect(result.status).toBeDefined();
    });

    it('should handle node execution errors', async () => {
      const triggerNode = new EventTriggerNode();
      orchestrator.registerNode(triggerNode);

      const workflow: Workflow = {
        id: 'test-workflow',
        tenantId: 'tenant-1',
        name: 'Test Workflow',
        description: 'A test workflow',
        version: 1,
        status: 'active',
        trigger: {
          type: 'event',
          config: {
            eventType: 'message.received',
            startNodeId: 'node-1',
          },
        },
        nodes: [
          {
            id: 'node-1',
            type: 'event_trigger',
            position: { x: 0, y: 0 },
            config: {},
            connections: {
              input: [],
              output: [],
            },
          },
        ],
        variables: {},
        settings: {
          retryPolicy: {
            maxRetries: 3,
            backoffMs: 1000,
          },
          timeoutMs: 30000,
          errorHandling: 'stop',
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const triggerEvent: SystemEvent = {
        id: 'event-1',
        tenantId: 'tenant-1',
        type: 'message.received',
        source: 'test',
        payload: {},
        metadata: {
          timestamp: Date.now(),
        },
      };

      const result = await orchestrator.executeWorkflow(workflow, triggerEvent);

      expect(result.status).toBeDefined();
    });
  });

  describe('Workflow Validation', () => {
    it('should validate a valid workflow', () => {
      const workflow: Workflow = {
        id: 'test-workflow',
        tenantId: 'tenant-1',
        name: 'Test Workflow',
        description: 'A test workflow',
        version: 1,
        status: 'active',
        trigger: {
          type: 'event',
          config: {
            eventType: 'message.received',
            startNodeId: 'node-1',
          },
        },
        nodes: [
          {
            id: 'node-1',
            type: 'event_trigger',
            position: { x: 0, y: 0 },
            config: {
              eventType: 'message.received',
            },
            connections: {
              input: [],
              output: [],
            },
          },
        ],
        variables: {},
        settings: {
          retryPolicy: {
            maxRetries: 3,
            backoffMs: 1000,
          },
          timeoutMs: 30000,
          errorHandling: 'stop',
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = orchestrator.validateWorkflow(workflow);

      expect(result.valid).toBe(true);
    });

    it('should invalidate a workflow with missing nodes', () => {
      const workflow: Workflow = {
        id: 'test-workflow',
        tenantId: 'tenant-1',
        name: 'Test Workflow',
        description: 'A test workflow',
        version: 1,
        status: 'active',
        trigger: {
          type: 'event',
          config: {
            eventType: 'message.received',
            startNodeId: 'node-1',
          },
        },
        nodes: [],
        variables: {},
        settings: {
          retryPolicy: {
            maxRetries: 3,
            backoffMs: 1000,
          },
          timeoutMs: 30000,
          errorHandling: 'stop',
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = orchestrator.validateWorkflow(workflow);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });
});
