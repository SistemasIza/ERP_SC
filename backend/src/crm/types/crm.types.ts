/**
 * CRM Module Types
 * Type definitions for Customer Relationship Management
 */

export type ContactStatus = 'lead' | 'prospect' | 'customer' | 'churned';
export type DealStage = 'prospecting' | 'qualification' | 'proposal' | 'negotiation' | 'closed_won' | 'closed_lost';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';
export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';

export interface Contact {
  id: string;
  tenantId: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  company?: string;
  title?: string;
  status: ContactStatus;
  source?: string;
  tags: string[];
  customFields: Record<string, any>;
  assignedTo?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Deal {
  id: string;
  tenantId: string;
  contactId: string;
  name: string;
  description?: string;
  value: number;
  currency: string;
  stage: DealStage;
  probability: number;
  expectedCloseDate?: Date;
  actualCloseDate?: Date;
  assignedTo?: string;
  tags: string[];
  customFields: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface Task {
  id: string;
  tenantId: string;
  title: string;
  description?: string;
  type: 'call' | 'email' | 'meeting' | 'follow_up' | 'task';
  priority: TaskPriority;
  status: TaskStatus;
  dueDate?: Date;
  completedAt?: Date;
  assignedTo: string;
  relatedContactId?: string;
  relatedDealId?: string;
  reminder?: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Note {
  id: string;
  tenantId: string;
  content: string;
  relatedContactId?: string;
  relatedDealId?: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Activity {
  id: string;
  tenantId: string;
  type: 'email' | 'call' | 'meeting' | 'note' | 'task' | 'deal_update';
  subject?: string;
  description?: string;
  relatedContactId?: string;
  relatedDealId?: string;
  createdBy: string;
  metadata: Record<string, any>;
  createdAt: Date;
}

export interface Pipeline {
  id: string;
  tenantId: string;
  name: string;
  stages: PipelineStage[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface PipelineStage {
  id: string;
  name: string;
  order: number;
  probability: number;
  color?: string;
}
