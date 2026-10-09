/**
 * Analytics Module Types
 * Type definitions for analytics and reporting
 */

export interface Metric {
  id: string;
  tenantId: string;
  name: string;
  value: number;
  unit?: string;
  timestamp: Date;
  metadata: Record<string, any>;
}

export interface MetricDefinition {
  id: string;
  name: string;
  description: string;
  category: 'conversations' | 'users' | 'performance' | 'revenue' | 'engagement';
  aggregation: 'sum' | 'avg' | 'count' | 'min' | 'max';
  unit?: string;
}

export interface Dashboard {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  widgets: Widget[];
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Widget {
  id: string;
  type: 'metric' | 'chart' | 'table' | 'funnel';
  title: string;
  metricId?: string;
  config: WidgetConfig;
  position: { x: number; y: number; w: number; h: number };
}

export interface WidgetConfig {
  chartType?: 'line' | 'bar' | 'pie' | 'area';
  timeRange?: '1h' | '24h' | '7d' | '30d' | '90d' | '1y';
  groupBy?: 'hour' | 'day' | 'week' | 'month';
  filters?: Record<string, any>;
}

export interface Report {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  query: AnalyticsQuery;
  schedule?: ReportSchedule;
  recipients: string[];
  format: 'pdf' | 'csv' | 'json';
  isActive: boolean;
  lastRunAt?: Date;
  nextRunAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface AnalyticsQuery {
  metrics: string[];
  dimensions?: string[];
  filters: Record<string, any>;
  timeRange: {
    start: Date;
    end: Date;
  };
  groupBy?: string[];
}

export interface ReportSchedule {
  frequency: 'daily' | 'weekly' | 'monthly';
  timezone: string;
  hour: number;
  dayOfWeek?: number; // 0-6 for weekly
  dayOfMonth?: number; // 1-31 for monthly
}

export interface AnalyticsData {
  tenantId: string;
  metrics: Record<string, number>;
  dimensions?: Record<string, any>;
  timestamp: Date;
}

export interface Funnel {
  id: string;
  tenantId: string;
  name: string;
  steps: FunnelStep[];
  createdAt: Date;
  updatedAt: Date;
}

export interface FunnelStep {
  id: string;
  name: string;
  event: string;
  conditions?: Record<string, any>;
  order: number;
}
