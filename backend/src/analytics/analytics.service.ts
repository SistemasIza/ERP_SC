/**
 * Analytics Service
 * Service for analytics and reporting
 */

import { Metric, MetricDefinition, Dashboard, Widget, Report, AnalyticsQuery, AnalyticsData, Funnel, FunnelStep, ReportSchedule } from './types/analytics.types';
import { EventEmitter } from 'events';

export class AnalyticsService extends EventEmitter {
  private metrics: Map<string, Metric> = new Map();
  private metricDefinitions: Map<string, MetricDefinition> = new Map();
  private dashboards: Map<string, Dashboard> = new Map();
  private reports: Map<string, Report> = new Map();
  private funnels: Map<string, Funnel> = new Map();

  constructor() {
    super();
    this.initializeDefaultMetrics();
  }

  /**
   * Initialize default metric definitions
   */
  private initializeDefaultMetrics(): void {
    const defaultMetrics: Omit<MetricDefinition, 'id'>[] = [
      {
        name: 'total_conversations',
        description: 'Total number of conversations',
        category: 'conversations',
        aggregation: 'count',
      },
      {
        name: 'active_users',
        description: 'Number of active users',
        category: 'users',
        aggregation: 'count',
      },
      {
        name: 'response_time_avg',
        description: 'Average response time',
        category: 'performance',
        aggregation: 'avg',
        unit: 'seconds',
      },
      {
        name: 'messages_sent',
        description: 'Total messages sent',
        category: 'engagement',
        aggregation: 'sum',
      },
      {
        name: 'revenue',
        description: 'Total revenue',
        category: 'revenue',
        aggregation: 'sum',
        unit: 'USD',
      },
    ];

    for (const metricDef of defaultMetrics) {
      const definition: MetricDefinition = {
        ...metricDef,
        id: this.generateId(),
      };
      this.metricDefinitions.set(definition.id, definition);
    }
  }

  /**
   * Record a metric
   */
  async recordMetric(tenantId: string, name: string, value: number, unit?: string, metadata?: Record<string, any>): Promise<Metric> {
    const metric: Metric = {
      id: this.generateId(),
      tenantId,
      name,
      value,
      unit,
      timestamp: new Date(),
      metadata: metadata || {},
    };

    this.metrics.set(metric.id, metric);
    
    // TODO: Save to database
    this.emit('metric.recorded', { metric });

    return metric;
  }

  /**
   * Get metrics for a tenant
   */
  getTenantMetrics(tenantId: string, metricName?: string, startDate?: Date, endDate?: Date): Metric[] {
    let metrics = Array.from(this.metrics.values()).filter(m => m.tenantId === tenantId);

    if (metricName) {
      metrics = metrics.filter(m => m.name === metricName);
    }

    if (startDate) {
      metrics = metrics.filter(m => m.timestamp >= startDate);
    }

    if (endDate) {
      metrics = metrics.filter(m => m.timestamp <= endDate);
    }

    return metrics;
  }

  /**
   * Aggregate metrics
   */
  aggregateMetrics(tenantId: string, metricName: string, aggregation: 'sum' | 'avg' | 'count' | 'min' | 'max', startDate?: Date, endDate?: Date): number {
    const metrics = this.getTenantMetrics(tenantId, metricName, startDate, endDate);
    const values = metrics.map(m => m.value);

    switch (aggregation) {
      case 'sum':
        return values.reduce((sum, v) => sum + v, 0);
      case 'avg':
        return values.length > 0 ? values.reduce((sum, v) => sum + v, 0) / values.length : 0;
      case 'count':
        return values.length;
      case 'min':
        return values.length > 0 ? Math.min(...values) : 0;
      case 'max':
        return values.length > 0 ? Math.max(...values) : 0;
      default:
        return 0;
    }
  }

  /**
   * Execute an analytics query
   */
  async executeQuery(tenantId: string, query: AnalyticsQuery): Promise<AnalyticsData[]> {
    const results: AnalyticsData[] = [];

    // Group by time if specified
    const groupBy = query.groupBy || [];
    const timeRange = query.timeRange;

    // Get metrics for the time range
    for (const metricName of query.metrics) {
      const metrics = this.getTenantMetrics(tenantId, metricName, timeRange.start, timeRange.end);
      
      // Apply filters
      const filteredMetrics = metrics.filter(m => {
        if (!query.filters) return true;
        return Object.entries(query.filters).every(([key, value]) => m.metadata[key] === value);
      });

      // Aggregate
      const aggregatedValue = filteredMetrics.reduce((sum, m) => sum + m.value, 0);

      results.push({
        tenantId,
        metrics: { [metricName]: aggregatedValue },
        timestamp: new Date(),
      });
    }

    return results;
  }

  /**
   * Create a dashboard
   */
  async createDashboard(tenantId: string, name: string, widgets: Widget[], description?: string, isDefault: boolean = false): Promise<Dashboard> {
    const dashboard: Dashboard = {
      id: this.generateId(),
      tenantId,
      name,
      description,
      widgets,
      isDefault,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.dashboards.set(dashboard.id, dashboard);
    
    // TODO: Save to database
    this.emit('dashboard.created', { dashboard });

    return dashboard;
  }

  /**
   * Get dashboards for a tenant
   */
  getTenantDashboards(tenantId: string): Dashboard[] {
    return Array.from(this.dashboards.values()).filter(d => d.tenantId === tenantId);
  }

  /**
   * Update a dashboard
   */
  async updateDashboard(dashboardId: string, updates: Partial<Dashboard>): Promise<Dashboard | null> {
    const dashboard = this.dashboards.get(dashboardId);
    if (!dashboard) return null;

    const updatedDashboard: Dashboard = {
      ...dashboard,
      ...updates,
      id: dashboardId,
      updatedAt: new Date(),
    };

    this.dashboards.set(dashboardId, updatedDashboard);
    
    // TODO: Update in database
    this.emit('dashboard.updated', { dashboard: updatedDashboard });

    return updatedDashboard;
  }

  /**
   * Delete a dashboard
   */
  async deleteDashboard(dashboardId: string): Promise<boolean> {
    const deleted = this.dashboards.delete(dashboardId);
    
    if (deleted) {
      // TODO: Delete from database
      this.emit('dashboard.deleted', { dashboardId });
    }

    return deleted;
  }

  /**
   * Create a report
   */
  async createReport(tenantId: string, name: string, query: AnalyticsQuery, recipients: string[], format: 'pdf' | 'csv' | 'json' = 'pdf', description?: string, schedule?: ReportSchedule): Promise<Report> {
    const report: Report = {
      id: this.generateId(),
      tenantId,
      name,
      description,
      query,
      schedule,
      recipients,
      format,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.reports.set(report.id, report);
    
    // TODO: Save to database
    this.emit('report.created', { report });

    return report;
  }

  /**
   * Get reports for a tenant
   */
  getTenantReports(tenantId: string): Report[] {
    return Array.from(this.reports.values()).filter(r => r.tenantId === tenantId);
  }

  /**
   * Execute a report
   */
  async executeReport(reportId: string): Promise<AnalyticsData[]> {
    const report = this.reports.get(reportId);
    if (!report) {
      throw new Error('Report not found');
    }

    const data = await this.executeQuery(report.tenantId, report.query);
    
    report.lastRunAt = new Date();
    
    // Calculate next run if schedule exists
    if (report.schedule) {
      report.nextRunAt = this.calculateNextRun(report.schedule);
    }

    this.emit('report.executed', { report, data });

    return data;
  }

  /**
   * Create a funnel
   */
  async createFunnel(tenantId: string, name: string, steps: Omit<FunnelStep, 'id'>[]): Promise<Funnel> {
    const funnelSteps: FunnelStep[] = steps.map((step, index) => ({
      ...step,
      id: this.generateId(),
      order: index,
    }));

    const funnel: Funnel = {
      id: this.generateId(),
      tenantId,
      name,
      steps: funnelSteps,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.funnels.set(funnel.id, funnel);
    
    // TODO: Save to database
    this.emit('funnel.created', { funnel });

    return funnel;
  }

  /**
   * Get funnels for a tenant
   */
  getTenantFunnels(tenantId: string): Funnel[] {
    return Array.from(this.funnels.values()).filter(f => f.tenantId === tenantId);
  }

  /**
   * Calculate funnel conversion
   */
  calculateFunnelConversion(funnelId: string, startDate?: Date, endDate?: Date): { step: string; count: number; conversionRate: number }[] {
    const funnel = this.funnels.get(funnelId);
    if (!funnel) {
      throw new Error('Funnel not found');
    }

    // TODO: Implement actual funnel calculation using event data
    // For now, return placeholder data
    return funnel.steps.map(step => ({
      step: step.name,
      count: Math.floor(Math.random() * 1000),
      conversionRate: Math.random() * 100,
    }));
  }

  /**
   * Calculate next run time for scheduled reports
   */
  private calculateNextRun(schedule: ReportSchedule): Date {
    const now = new Date();
    const next = new Date(now);

    switch (schedule.frequency) {
      case 'daily':
        next.setDate(next.getDate() + 1);
        next.setHours(schedule.hour, 0, 0, 0);
        break;
      case 'weekly':
        next.setDate(next.getDate() + (7 - next.getDay() + (schedule.dayOfWeek || 0)));
        next.setHours(schedule.hour, 0, 0, 0);
        break;
      case 'monthly':
        next.setMonth(next.getMonth() + 1);
        next.setDate(schedule.dayOfMonth || 1);
        next.setHours(schedule.hour, 0, 0, 0);
        break;
    }

    return next;
  }

  /**
   * Generate a unique ID
   */
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
