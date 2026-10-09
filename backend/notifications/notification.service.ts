/**
 * Notification Service
 * Service for managing notifications across multiple channels
 */

import { Notification, NotificationTemplate, NotificationPreference, NotificationChannel, NotificationStatus, NotificationPriority, EmailConfig, SMSConfig, PushConfig } from './types/notification.types';
import { EventEmitter } from 'events';

export class NotificationService extends EventEmitter {
  private notifications: Map<string, Notification> = new Map();
  private templates: Map<string, NotificationTemplate> = new Map();
  private preferences: Map<string, NotificationPreference> = new Map();
  private emailConfig?: EmailConfig;
  private smsConfig?: SMSConfig;
  private pushConfig?: PushConfig;

  constructor() {
    super();
  }

  /**
   * Configure email provider
   */
  configureEmail(config: EmailConfig): void {
    this.emailConfig = config;
  }

  /**
   * Configure SMS provider
   */
  configureSMS(config: SMSConfig): void {
    this.smsConfig = config;
  }

  /**
   * Configure push provider
   */
  configurePush(config: PushConfig): void {
    this.pushConfig = config;
  }

  /**
   * Send a notification
   */
  async sendNotification(notificationData: Omit<Notification, 'id' | 'status' | 'retryCount' | 'createdAt' | 'updatedAt'>): Promise<Notification> {
    const notification: Notification = {
      ...notificationData,
      id: this.generateId(),
      status: 'pending',
      retryCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.notifications.set(notification.id, notification);
    
    // TODO: Save to database
    this.emit('notification.created', { notification });

    // Send notification based on channel
    await this.sendToChannel(notification);

    return notification;
  }

  /**
   * Send notification to specific channel
   */
  private async sendToChannel(notification: Notification): Promise<void> {
    try {
      switch (notification.channel) {
        case 'email':
          await this.sendEmail(notification);
          break;
        case 'sms':
          await this.sendSMS(notification);
          break;
        case 'push':
          await this.sendPush(notification);
          break;
        case 'in_app':
          await this.sendInApp(notification);
          break;
        case 'webhook':
          await this.sendWebhook(notification);
          break;
      }
    } catch (error) {
      await this.handleFailedNotification(notification, error);
    }
  }

  /**
   * Send email notification
   */
  private async sendEmail(notification: Notification): Promise<void> {
    if (!this.emailConfig) {
      throw new Error('Email provider not configured');
    }

    // TODO: Implement actual email sending based on provider
    // For now, simulate success
    notification.status = 'sent';
    notification.sentAt = new Date();
    notification.deliveredAt = new Date();
    notification.updatedAt = new Date();

    this.emit('notification.sent', { notification });
  }

  /**
   * Send SMS notification
   */
  private async sendSMS(notification: Notification): Promise<void> {
    if (!this.smsConfig) {
      throw new Error('SMS provider not configured');
    }

    // TODO: Implement actual SMS sending based on provider
    notification.status = 'sent';
    notification.sentAt = new Date();
    notification.deliveredAt = new Date();
    notification.updatedAt = new Date();

    this.emit('notification.sent', { notification });
  }

  /**
   * Send push notification
   */
  private async sendPush(notification: Notification): Promise<void> {
    if (!this.pushConfig) {
      throw new Error('Push provider not configured');
    }

    // TODO: Implement actual push sending based on provider
    notification.status = 'sent';
    notification.sentAt = new Date();
    notification.deliveredAt = new Date();
    notification.updatedAt = new Date();

    this.emit('notification.sent', { notification });
  }

  /**
   * Send in-app notification
   */
  private async sendInApp(notification: Notification): Promise<void> {
    notification.status = 'delivered';
    notification.deliveredAt = new Date();
    notification.updatedAt = new Date();

    this.emit('notification.delivered', { notification });
  }

  /**
   * Send webhook notification
   */
  private async sendWebhook(notification: Notification): Promise<void> {
    // TODO: Implement webhook notification
    notification.status = 'sent';
    notification.sentAt = new Date();
    notification.updatedAt = new Date();

    this.emit('notification.sent', { notification });
  }

  /**
   * Handle failed notification
   */
  private async handleFailedNotification(notification: Notification, error: any): Promise<void> {
    notification.status = 'failed';
    notification.error = error instanceof Error ? error.message : String(error);
    notification.retryCount++;
    notification.updatedAt = new Date();

    // Retry if max retries not reached
    if (notification.retryCount < notification.maxRetries) {
      notification.status = 'pending';
      setTimeout(() => this.sendToChannel(notification), 5000 * notification.retryCount);
    }

    this.emit('notification.failed', { notification, error });
  }

  /**
   * Create a notification template
   */
  async createTemplate(tenantId: string, templateData: Omit<NotificationTemplate, 'id' | 'tenantId' | 'createdAt' | 'updatedAt'>): Promise<NotificationTemplate> {
    const template: NotificationTemplate = {
      ...templateData,
      id: this.generateId(),
      tenantId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.templates.set(template.id, template);
    
    // TODO: Save to database
    this.emit('template.created', { template });

    return template;
  }

  /**
   * Get templates for a tenant
   */
  getTenantTemplates(tenantId: string): NotificationTemplate[] {
    return Array.from(this.templates.values()).filter(t => t.tenantId === tenantId && t.isActive);
  }

  /**
   * Render template with variables
   */
  renderTemplate(template: NotificationTemplate, variables: Record<string, any>): { subject?: string; content: string; htmlContent?: string } {
    let content = template.contentTemplate;
    let htmlContent = template.htmlTemplate;
    let subject = template.subjectTemplate;

    // Replace variables
    for (const variable of template.variables) {
      const value = variables[variable] || '';
      const placeholder = `{{${variable}}}`;
      
      content = content.replace(new RegExp(placeholder, 'g'), String(value));
      if (htmlContent) {
        htmlContent = htmlContent.replace(new RegExp(placeholder, 'g'), String(value));
      }
      if (subject) {
        subject = subject.replace(new RegExp(placeholder, 'g'), String(value));
      }
    }

    return { subject, content, htmlContent };
  }

  /**
   * Set user notification preferences
   */
  async setPreferences(preferenceData: Omit<NotificationPreference, 'id' | 'createdAt' | 'updatedAt'>): Promise<NotificationPreference> {
    const preference: NotificationPreference = {
      ...preferenceData,
      id: this.generateId(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.preferences.set(preference.id, preference);
    
    // TODO: Save to database
    this.emit('preferences.set', { preference });

    return preference;
  }

  /**
   * Get user preferences
   */
  getUserPreferences(userId: string, tenantId: string): NotificationPreference[] {
    return Array.from(this.preferences.values()).filter(p => p.userId === userId && p.tenantId === tenantId);
  }

  /**
   * Check if user should receive notification
   */
  shouldReceiveNotification(userId: string, tenantId: string, channel: NotificationChannel, category: string): boolean {
    const preferences = this.getUserPreferences(userId, tenantId);
    const channelPreference = preferences.find(p => p.channel === channel);

    if (!channelPreference) return true; // Default to enabled
    if (!channelPreference.enabled) return false;
    if (!channelPreference.categories.includes(category)) return false;

    // Check quiet hours
    if (channelPreference.quietHours) {
      const now = new Date();
      const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      const { start, end } = channelPreference.quietHours;

      if (currentTime >= start && currentTime <= end) {
        return false;
      }
    }

    return true;
  }

  /**
   * Get notification by ID
   */
  getNotification(id: string): Notification | undefined {
    return this.notifications.get(id);
  }

  /**
   * Get notifications for a tenant
   */
  getTenantNotifications(tenantId: string, filters?: { status?: NotificationStatus; channel?: NotificationChannel }): Notification[] {
    let notifications = Array.from(this.notifications.values()).filter(n => n.tenantId === tenantId);

    if (filters?.status) {
      notifications = notifications.filter(n => n.status === filters.status);
    }

    if (filters?.channel) {
      notifications = notifications.filter(n => n.channel === filters.channel);
    }

    return notifications.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  /**
   * Generate a unique ID
   */
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
