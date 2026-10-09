/**
 * CRM Service
 * Service for Customer Relationship Management
 */

import { Contact, Deal, Task, Note, Activity, Pipeline, ContactStatus, DealStage, TaskPriority, TaskStatus } from './types/crm.types';
import { EventEmitter } from 'events';

export class CRMService extends EventEmitter {
  private contacts: Map<string, Contact> = new Map();
  private deals: Map<string, Deal> = new Map();
  private tasks: Map<string, Task> = new Map();
  private notes: Map<string, Note> = new Map();
  private activities: Map<string, Activity> = new Map();
  private pipelines: Map<string, Pipeline> = new Map();

  constructor() {
    super();
    this.initializeDefaultPipeline();
  }

  /**
   * Initialize default pipeline
   */
  private initializeDefaultPipeline(): void {
    const pipeline: Pipeline = {
      id: this.generateId(),
      tenantId: 'default',
      name: 'Default Sales Pipeline',
      stages: [
        { id: this.generateId(), name: 'Prospecting', order: 1, probability: 10, color: '#3B82F6' },
        { id: this.generateId(), name: 'Qualification', order: 2, probability: 25, color: '#8B5CF6' },
        { id: this.generateId(), name: 'Proposal', order: 3, probability: 50, color: '#EC4899' },
        { id: this.generateId(), name: 'Negotiation', order: 4, probability: 75, color: '#F59E0B' },
        { id: this.generateId(), name: 'Closed Won', order: 5, probability: 100, color: '#10B981' },
        { id: this.generateId(), name: 'Closed Lost', order: 6, probability: 0, color: '#EF4444' },
      ],
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.pipelines.set(pipeline.id, pipeline);
  }

  /**
   * Create a contact
   */
  async createContact(tenantId: string, contactData: Omit<Contact, 'id' | 'tenantId' | 'createdAt' | 'updatedAt'>): Promise<Contact> {
    const contact: Contact = {
      ...contactData,
      id: this.generateId(),
      tenantId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.contacts.set(contact.id, contact);
    
    // TODO: Save to database
    this.emit('contact.created', { contact });

    return contact;
  }

  /**
   * Get a contact by ID
   */
  getContact(id: string): Contact | undefined {
    return this.contacts.get(id);
  }

  /**
   * Get contacts for a tenant
   */
  getTenantContacts(tenantId: string, filters?: { status?: ContactStatus; assignedTo?: string }): Contact[] {
    let contacts = Array.from(this.contacts.values()).filter(c => c.tenantId === tenantId);

    if (filters?.status) {
      contacts = contacts.filter(c => c.status === filters.status);
    }

    if (filters?.assignedTo) {
      contacts = contacts.filter(c => c.assignedTo === filters.assignedTo);
    }

    return contacts;
  }

  /**
   * Update a contact
   */
  async updateContact(id: string, updates: Partial<Contact>): Promise<Contact | null> {
    const contact = this.contacts.get(id);
    if (!contact) return null;

    const updatedContact: Contact = {
      ...contact,
      ...updates,
      id,
      updatedAt: new Date(),
    };

    this.contacts.set(id, updatedContact);
    
    // TODO: Update in database
    this.emit('contact.updated', { contact: updatedContact });

    return updatedContact;
  }

  /**
   * Delete a contact
   */
  async deleteContact(id: string): Promise<boolean> {
    const deleted = this.contacts.delete(id);
    
    if (deleted) {
      // TODO: Delete from database
      this.emit('contact.deleted', { contactId: id });
    }

    return deleted;
  }

  /**
   * Create a deal
   */
  async createDeal(tenantId: string, dealData: Omit<Deal, 'id' | 'tenantId' | 'createdAt' | 'updatedAt'>): Promise<Deal> {
    const deal: Deal = {
      ...dealData,
      id: this.generateId(),
      tenantId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.deals.set(deal.id, deal);
    
    // TODO: Save to database
    this.emit('deal.created', { deal });

    return deal;
  }

  /**
   * Get a deal by ID
   */
  getDeal(id: string): Deal | undefined {
    return this.deals.get(id);
  }

  /**
   * Get deals for a tenant
   */
  getTenantDeals(tenantId: string, filters?: { stage?: DealStage; assignedTo?: string }): Deal[] {
    let deals = Array.from(this.deals.values()).filter(d => d.tenantId === tenantId);

    if (filters?.stage) {
      deals = deals.filter(d => d.stage === filters.stage);
    }

    if (filters?.assignedTo) {
      deals = deals.filter(d => d.assignedTo === filters.assignedTo);
    }

    return deals;
  }

  /**
   * Update a deal
   */
  async updateDeal(id: string, updates: Partial<Deal>): Promise<Deal | null> {
    const deal = this.deals.get(id);
    if (!deal) return null;

    const updatedDeal: Deal = {
      ...deal,
      ...updates,
      id,
      updatedAt: new Date(),
    };

    this.deals.set(id, updatedDeal);
    
    // TODO: Update in database
    this.emit('deal.updated', { deal: updatedDeal });

    return updatedDeal;
  }

  /**
   * Delete a deal
   */
  async deleteDeal(id: string): Promise<boolean> {
    const deleted = this.deals.delete(id);
    
    if (deleted) {
      // TODO: Delete from database
      this.emit('deal.deleted', { dealId: id });
    }

    return deleted;
  }

  /**
   * Create a task
   */
  async createTask(tenantId: string, taskData: Omit<Task, 'id' | 'tenantId' | 'createdAt' | 'updatedAt'>): Promise<Task> {
    const task: Task = {
      ...taskData,
      id: this.generateId(),
      tenantId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.tasks.set(task.id, task);
    
    // TODO: Save to database
    this.emit('task.created', { task });

    return task;
  }

  /**
   * Get tasks for a tenant
   */
  getTenantTasks(tenantId: string, filters?: { assignedTo?: string; status?: TaskStatus; priority?: TaskPriority }): Task[] {
    let tasks = Array.from(this.tasks.values()).filter(t => t.tenantId === tenantId);

    if (filters?.assignedTo) {
      tasks = tasks.filter(t => t.assignedTo === filters.assignedTo);
    }

    if (filters?.status) {
      tasks = tasks.filter(t => t.status === filters.status);
    }

    if (filters?.priority) {
      tasks = tasks.filter(t => t.priority === filters.priority);
    }

    return tasks;
  }

  /**
   * Update a task
   */
  async updateTask(id: string, updates: Partial<Task>): Promise<Task | null> {
    const task = this.tasks.get(id);
    if (!task) return null;

    const updatedTask: Task = {
      ...task,
      ...updates,
      id,
      updatedAt: new Date(),
    };

    this.tasks.set(id, updatedTask);
    
    // TODO: Update in database
    this.emit('task.updated', { task: updatedTask });

    return updatedTask;
  }

  /**
   * Complete a task
   */
  async completeTask(id: string): Promise<Task | null> {
    return this.updateTask(id, { status: 'completed', completedAt: new Date() });
  }

  /**
   * Create a note
   */
  async createNote(tenantId: string, noteData: Omit<Note, 'id' | 'tenantId' | 'createdAt' | 'updatedAt'>): Promise<Note> {
    const note: Note = {
      ...noteData,
      id: this.generateId(),
      tenantId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.notes.set(note.id, note);
    
    // TODO: Save to database
    this.emit('note.created', { note });

    return note;
  }

  /**
   * Get notes for a tenant
   */
  getTenantNotes(tenantId: string, filters?: { relatedContactId?: string; relatedDealId?: string }): Note[] {
    let notes = Array.from(this.notes.values()).filter(n => n.tenantId === tenantId);

    if (filters?.relatedContactId) {
      notes = notes.filter(n => n.relatedContactId === filters.relatedContactId);
    }

    if (filters?.relatedDealId) {
      notes = notes.filter(n => n.relatedDealId === filters.relatedDealId);
    }

    return notes;
  }

  /**
   * Log an activity
   */
  async logActivity(tenantId: string, activityData: Omit<Activity, 'id' | 'tenantId' | 'createdAt'>): Promise<Activity> {
    const activity: Activity = {
      ...activityData,
      id: this.generateId(),
      tenantId,
      createdAt: new Date(),
    };

    this.activities.set(activity.id, activity);
    
    // TODO: Save to database
    this.emit('activity.logged', { activity });

    return activity;
  }

  /**
   * Get activities for a tenant
   */
  getTenantActivities(tenantId: string, filters?: { relatedContactId?: string; relatedDealId?: string }): Activity[] {
    let activities = Array.from(this.activities.values()).filter(a => a.tenantId === tenantId);

    if (filters?.relatedContactId) {
      activities = activities.filter(a => a.relatedContactId === filters.relatedContactId);
    }

    if (filters?.relatedDealId) {
      activities = activities.filter(a => a.relatedDealId === filters.relatedDealId);
    }

    return activities.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  /**
   * Create a pipeline
   */
  async createPipeline(tenantId: string, name: string, stages: Omit<Pipeline['stages'][number], 'id'>[]): Promise<Pipeline> {
    const pipelineStages = stages.map((stage, index) => ({
      ...stage,
      id: this.generateId(),
      order: index,
    }));

    const pipeline: Pipeline = {
      id: this.generateId(),
      tenantId,
      name,
      stages: pipelineStages,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.pipelines.set(pipeline.id, pipeline);
    
    // TODO: Save to database
    this.emit('pipeline.created', { pipeline });

    return pipeline;
  }

  /**
   * Get pipelines for a tenant
   */
  getTenantPipelines(tenantId: string): Pipeline[] {
    return Array.from(this.pipelines.values()).filter(p => p.tenantId === tenantId && p.isActive);
  }

  /**
   * Generate a unique ID
   */
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
