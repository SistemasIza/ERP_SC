/**
 * @sparktree/types
 * 
 * Shared TypeScript types and interfaces for the SparkTree SaaS platform.
 * This package is consumed by both backend and frontend workspaces.
 * 
 * @packageDocumentation
 */

// ============================================================================
// Common / Base Types
// ============================================================================

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp: string;
}

export interface PaginatedResponse<T = unknown> extends ApiResponse<T[]> {
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  // Fallback compatibility
  data?: any;
  total?: number;
  page?: number;
  limit?: number;
  hasMore?: boolean;
}

export interface TenantEntity {
  id: string;
  organization_id: string;
  created_at: string;
  updated_at?: string;
}

export enum Platform {
  WHATSAPP = 'whatsapp',
  TELEGRAM = 'telegram',
  INSTAGRAM = 'instagram',
  MESSENGER = 'facebook_messenger',
  TIKTOK = 'tiktok',
  MERCADOLIBRE = 'mercadolibre',
  EMAIL = 'email',
}

export enum UserRole {
  SUPER_ADMIN = 'super_admin',
  ADMIN = 'admin',
  STAFF = 'staff',
  EMPRESA = 'empresa',
  AGENTE = 'agente',
  AGENT = 'agent',
  AREA_CONTABLE = 'area_contable',
}

export enum ConversationStatus {
  ACTIVE = 'active',
  OPEN = 'open',
  CLOSED = 'closed',
  PENDING = 'pending',
  BOT = 'bot',
  ARCHIVED = 'archived',
}

// ============================================================================
// Core Entities
// ============================================================================

export interface Organization {
  id: string;
  name: string;
  plan: 'free' | 'basic' | 'pro' | 'enterprise';
  max_whatsapp_connections: number;
  created_at: string;
  updated_at: string;
}

export interface User {
  id: string;
  organization_id: string;
  email: string;
  name?: string;
  full_name?: string;
  role: UserRole | string;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
}

export interface Contact {
  id: string;
  organization_id: string;
  phone_number: string;
  profile_name?: string;
  bot_state?: string;
  custom_attributes?: Record<string, any>;
  last_active_at: string;
  created_at: string;
  profile_picture?: string;
}

export interface Conversation {
  id: string;
  organization_id: string;
  contact_id: string;
  status: ConversationStatus | string;
  last_message_at: string;
  created_at: string;
  updated_at: string;
  assigned_to?: string;
  assigned_at?: string;
  assignment_type?: 'manual' | 'round_robin' | 'load_balance' | 'auto';
  department?: string;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  is_transferred?: boolean;
  transferred_from?: string;
  transferred_at?: string;
  transfer_reason?: string;
}

export interface Message {
  id: string;
  organization_id: string;
  conversation_id: string;
  contact_id: string;
  direction: 'inbound' | 'outbound';
  type: 'text' | 'image' | 'audio' | 'video' | 'document' | 'location' | 'contact' | 'interactive' | string;
  content?: string;
  media_url?: string;
  status: 'pending' | 'sent' | 'delivered' | 'read' | 'failed';
  created_at: string;
}

export interface FlowNode {
  id: string;
  type: string;
  data: any;
  position: { x: number; y: number };
}

export interface FlowEdge {
  id: string;
  source: string;
  target: string;
  data?: any;
}

export interface Flow {
  id: string;
  organization_id: string;
  name: string;
  description?: string;
  nodes: FlowNode[] | any[];
  edges: FlowEdge[] | any[];
  triggers: any[];
  is_active: boolean;
  is_default: boolean;
  status: 'draft' | 'active' | 'inactive' | 'archived';
  version: string;
  category: 'sales' | 'support' | 'marketing' | 'onboarding' | 'other';
  bot_mode: string;
  fallback_message?: string;
  metrics?: Record<string, any>;
  assigned_to?: string;
  created_at: string;
  updated_at: string;
}

export interface PlatformConnection {
  id: string;
  user_id: string;
  organization_id: string;
  platform_type: Platform | string;
  display_name: string;
  platform_account_id?: string;
  status: 'disconnected' | 'connecting' | 'connected' | 'error';
  config: Record<string, any>;
  last_connected_at?: string;
}

export interface InternalNote {
  id: string;
  organization_id: string;
  conversation_id: string;
  user_id: string;
  note: string;
  is_visible_to_all: boolean;
  created_at: string;
  updated_at: string;
}

export interface AgentWorkload {
  id: string;
  organization_id: string;
  user_id: string;
  active_conversations: number;
  total_conversations_today: number;
  avg_response_time_seconds: number;
  last_assigned_at?: string;
  is_online: boolean;
  is_available: boolean;
}

export interface Department {
  id: string;
  organization_id: string;
  name: string;
  description?: string;
  color: string;
  is_active: boolean;
}

// ============================================================================
// Request / Options Types
// ============================================================================

export interface FilterOptions {
  platform?: string;
  status?: string;
  assignedTo?: string;
  priority?: string;
  department?: string;
  limit?: number;
  offset?: number;
}

export interface AssignmentOptions {
  conversationId: string;
  userId?: string;
  departmentId?: string;
  reason?: string;
}

// ============================================================================
// WhatsApp Specific Types
// ============================================================================

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';
export type MessageType = 'text' | 'image' | 'audio' | 'video' | 'document' | 'location' | 'contact' | 'interactive';
export type MessageDirection = 'inbound' | 'outbound';
export type MessageStatus = 'pending' | 'sent' | 'delivered' | 'read' | 'failed';

export interface WhatsAppConnection {
  id: string;
  userId: string;
  organizationId: string;
  displayName: string;
  phoneNumber?: string;
  status: ConnectionStatus;
  socket?: any;
  qr?: string;
  authStatePath?: string;
  lastConnectedAt?: Date;
}

export interface TextMessage {
  body: string;
}

export interface InteractiveMessage {
  type: 'button_reply' | 'list_reply';
  button_reply?: {
    id: string;
    title: string;
  };
  list_reply?: {
    id: string;
    title: string;
    description: string;
  };
}

export interface MediaMessage {
  type: 'image' | 'video' | 'audio' | 'document';
  url?: string;
  caption?: string;
  filename?: string;
  mimetype?: string;
}

export interface LocationMessage {
  latitude: number;
  longitude: number;
  name?: string;
  address?: string;
}

export interface ContactMessage {
  name: {
    first_name: string;
    last_name?: string;
  };
  phone?: string;
}

export interface FormattedMessage {
  id: string;
  from: string;
  jid?: string;
  type: MessageType;
  text?: TextMessage;
  interactive?: InteractiveMessage;
  media?: MediaMessage;
  location?: LocationMessage;
  contact?: ContactMessage;
  isNumericButtonResponse?: boolean;
  buttonNumber?: string;
}

export interface AuthState {
  creds: any;
  keys: Record<string, any>;
}

export interface WhatsAppSession {
  id: string;
  whatsapp_connection_id: string;
  organization_id: string;
  auth_state: AuthState;
  user_jid?: string;
  phone_number?: string;
  device_id?: string;
  is_active: boolean;
  last_restored_at?: string;
  expires_at?: string;
  created_at: string;
  updated_at: string;
}

export interface MessageQueueJob {
  messageId: string;
  connectionId: string;
  organizationId: string;
  conversationId: string;
  contactId: string;
  senderPhone: string;
  message: FormattedMessage | any;
  timestamp: string;
}

export interface ConnectionStatusUpdate {
  connectionId: string;
  status: ConnectionStatus;
  qr?: string;
  phoneNumber?: string;
  timestamp: string;
}

export interface QRCodeUpdate {
  connectionId: string;
  qr: string;
  timestamp: string;
}

export interface OrganizationConfig {
  organizationId?: string;
  conversationId?: string;
  contactId?: string;
  whatsappConnectionId?: string;
  senderJid?: string;
}

export interface ConnectionStatusResponse {
  id: string;
  status: ConnectionStatus;
  qr?: string;
  displayName: string;
  phoneNumber?: string;
}
