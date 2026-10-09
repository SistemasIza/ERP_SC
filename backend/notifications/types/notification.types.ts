/**
 * Notification System Types
 * Type definitions for notification management
 */

export type NotificationChannel = 'email' | 'sms' | 'push' | 'in_app' | 'webhook';
export type NotificationStatus = 'pending' | 'sent' | 'delivered' | 'failed' | 'bounced';
export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent';

export interface Notification {
  id: string;
  tenantId: string;
  userId?: string;
  channel: NotificationChannel;
  type: string;
  subject?: string;
  content: string;
  htmlContent?: string;
  recipient: string;
  metadata: Record<string, any>;
  status: NotificationStatus;
  priority: NotificationPriority;
  scheduledFor?: Date;
  sentAt?: Date;
  deliveredAt?: Date;
  error?: string;
  retryCount: number;
  maxRetries: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface NotificationTemplate {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  channel: NotificationChannel;
  type: string;
  subjectTemplate?: string;
  contentTemplate: string;
  htmlTemplate?: string;
  variables: string[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface NotificationPreference {
  id: string;
  userId: string;
  tenantId: string;
  channel: NotificationChannel;
  enabled: boolean;
  categories: string[];
  quietHours?: {
    start: string; // HH:mm
    end: string; // HH:mm
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface EmailConfig {
  provider: 'smtp' | 'sendgrid' | 'ses' | 'mailgun';
  host?: string;
  port?: number;
  username?: string;
  password?: string;
  apiKey?: string;
  from: string;
  fromName?: string;
}

export interface SMSConfig {
  provider: 'twilio' | 'nexmo' | 'aws_sns';
  accountSid?: string;
  authToken?: string;
  apiKey?: string;
  apiSecret?: string;
  fromNumber?: string;
}

export interface PushConfig {
  provider: 'fcm' | 'apns' | 'one_signal';
  apiKey?: string;
  authKey?: string;
  projectId?: string;
  appId?: string;
}
