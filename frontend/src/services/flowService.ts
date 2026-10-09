import api from './api';

export interface FlowBot {
  id: string;      
  _id?: string;    
  name: string;
  description: string;
  status: 'active' | 'inactive' | 'draft';
  version: string;
  lastModified: string;
  nodes: any[];
  edges: any[];
  triggers: string[];
  category: 'sales' | 'support' | 'marketing' | 'onboarding' | 'other';
  metrics: {
    conversations: number;
    completionRate: number;
    avgResponseTime: number;
    satisfaction: number;
  };
  assignedTo?: string;
  isDefault: boolean;
  matchingStrategy?: 'strict' | 'flexible';
  reactivationTime?: number;
  updated_at?: string;
  created_at?: string;
}

export interface CreateFlowData {
  name: string;
  description?: string;
  status?: 'active' | 'inactive' | 'draft';
  version?: string;
  category?: 'sales' | 'support' | 'marketing' | 'onboarding' | 'other';
  triggers?: string[];
  assigned_to?: string | null;
  is_default?: boolean;
  metrics?: {
    conversations: number;
    completionRate: number;
    avgResponseTime: number;
    satisfaction: number;
  };
  nodes?: any[];
  edges?: any[];
  matchingStrategy?: 'strict' | 'flexible';
  reactivationTime?: number;
}

class FlowService {
  // Get all flows
  async getFlows(): Promise<FlowBot[]> {
    const response = await api.get('/flows');
    return response.data;
  }

  // Get a single flow by ID
  async getFlow(id: string): Promise<FlowBot> {
    const response = await api.get(`/flows/${id}`);
    return response.data;
  }

  // Create a new flow
  async createFlow(flowData: CreateFlowData): Promise<FlowBot> {
    const response = await api.post('/flows', flowData);
    return response.data;
  }

  // Update an existing flow
  async updateFlow(id: string, flowData: Partial<CreateFlowData>): Promise<FlowBot> {
    const response = await api.put(`/flows/${id}`, flowData);
    return response.data;
  }

  // Delete a flow
  async deleteFlow(id: string): Promise<void> {
    await api.delete(`/flows/${id}`);
  }

  // Duplicate a flow
  async duplicateFlow(id: string): Promise<FlowBot> {
    const response = await api.post(`/flows/${id}/duplicate`, {});
    return response.data;
  }

  // Toggle flow status
  async toggleFlowStatus(id: string): Promise<FlowBot> {
    const currentFlow = await this.getFlow(id);
    const newStatus = currentFlow.status === 'active' ? 'inactive' : 'active';
    return this.updateFlow(id, { status: newStatus });
  }
}

export const flowService = new FlowService();
