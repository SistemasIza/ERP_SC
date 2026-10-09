/**
 * Analytics API Routes
 * REST API endpoints for analytics and reporting
 */

import { Router, Request, Response } from 'express';
import { AnalyticsService } from '../analytics.service';

const router = Router();
const analyticsService = new AnalyticsService();

/**
 * POST /api/analytics/metrics
 * Record a metric
 */
router.post('/metrics', async (req: Request, res: Response) => {
  try {
    const { tenantId, name, value, unit, metadata } = req.body;
    
    if (!tenantId || !name || value === undefined) {
      return res.status(400).json({ error: 'tenantId, name, and value are required' });
    }

    const metric = await analyticsService.recordMetric(tenantId, name, value, unit, metadata);
    res.status(201).json({ metric });
  } catch (error) {
    console.error('Error recording metric:', error);
    res.status(500).json({ error: 'Failed to record metric' });
  }
});

/**
 * GET /api/analytics/metrics/:tenantId
 * Get metrics for a tenant
 */
router.get('/metrics/:tenantId', async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.params;
    const resolvedTenantId = Array.isArray(tenantId) ? tenantId[0] : tenantId;
    const { metricName, startDate, endDate } = req.query;

    const metrics = analyticsService.getTenantMetrics(
      resolvedTenantId,
      metricName as string,
      startDate ? new Date(startDate as string) : undefined,
      endDate ? new Date(endDate as string) : undefined
    );
    res.json({ metrics });
  } catch (error) {
    console.error('Error fetching metrics:', error);
    res.status(500).json({ error: 'Failed to fetch metrics' });
  }
});

/**
 * GET /api/analytics/metrics/:tenantId/aggregate
 * Aggregate metrics
 */
router.get('/metrics/:tenantId/aggregate', async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.params;
    const resolvedTenantId = Array.isArray(tenantId) ? tenantId[0] : tenantId;
    const { metricName, aggregation, startDate, endDate } = req.query;

    if (!metricName || !aggregation) {
      return res.status(400).json({ error: 'metricName and aggregation are required' });
    }

    const value = analyticsService.aggregateMetrics(
      resolvedTenantId,
      metricName as string,
      aggregation as 'sum' | 'avg' | 'count' | 'min' | 'max',
      startDate ? new Date(startDate as string) : undefined,
      endDate ? new Date(endDate as string) : undefined
    );
    res.json({ value });
  } catch (error) {
    console.error('Error aggregating metrics:', error);
    res.status(500).json({ error: 'Failed to aggregate metrics' });
  }
});

/**
 * POST /api/analytics/query
 * Execute an analytics query
 */
router.post('/query', async (req: Request, res: Response) => {
  try {
    const { tenantId, query } = req.body;
    
    if (!tenantId || !query) {
      return res.status(400).json({ error: 'tenantId and query are required' });
    }

    const data = await analyticsService.executeQuery(tenantId, query);
    res.json({ data });
  } catch (error) {
    console.error('Error executing query:', error);
    res.status(500).json({ error: 'Failed to execute query' });
  }
});

/**
 * POST /api/analytics/dashboards
 * Create a dashboard
 */
router.post('/dashboards', async (req: Request, res: Response) => {
  try {
    const { tenantId, name, widgets, description, isDefault } = req.body;
    
    if (!tenantId || !name || !widgets) {
      return res.status(400).json({ error: 'tenantId, name, and widgets are required' });
    }

    const dashboard = await analyticsService.createDashboard(tenantId, name, widgets, description, isDefault);
    res.status(201).json({ dashboard });
  } catch (error) {
    console.error('Error creating dashboard:', error);
    res.status(500).json({ error: 'Failed to create dashboard' });
  }
});

/**
 * GET /api/analytics/dashboards/:tenantId
 * Get dashboards for a tenant
 */
router.get('/dashboards/:tenantId', async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.params;
    const resolvedTenantId = Array.isArray(tenantId) ? tenantId[0] : tenantId;
    const dashboards = analyticsService.getTenantDashboards(resolvedTenantId);
    res.json({ dashboards });
  } catch (error) {
    console.error('Error fetching dashboards:', error);
    res.status(500).json({ error: 'Failed to fetch dashboards' });
  }
});

/**
 * PUT /api/analytics/dashboards/:id
 * Update a dashboard
 */
router.put('/dashboards/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const dashboardId = Array.isArray(id) ? id[0] : id;
    const updates = req.body;

    const dashboard = await analyticsService.updateDashboard(dashboardId, updates);
    if (!dashboard) {
      return res.status(404).json({ error: 'Dashboard not found' });
    }

    res.json({ dashboard });
  } catch (error) {
    console.error('Error updating dashboard:', error);
    res.status(500).json({ error: 'Failed to update dashboard' });
  }
});

/**
 * DELETE /api/analytics/dashboards/:id
 * Delete a dashboard
 */
router.delete('/dashboards/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const dashboardId = Array.isArray(id) ? id[0] : id;
    const deleted = await analyticsService.deleteDashboard(dashboardId);

    if (!deleted) {
      return res.status(404).json({ error: 'Dashboard not found' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting dashboard:', error);
    res.status(500).json({ error: 'Failed to delete dashboard' });
  }
});

/**
 * POST /api/analytics/reports
 * Create a report
 */
router.post('/reports', async (req: Request, res: Response) => {
  try {
    const { tenantId, name, query, recipients, format, description, schedule } = req.body;
    
    if (!tenantId || !name || !query || !recipients) {
      return res.status(400).json({ error: 'tenantId, name, query, and recipients are required' });
    }

    const report = await analyticsService.createReport(tenantId, name, query, recipients, format, description, schedule);
    res.status(201).json({ report });
  } catch (error) {
    console.error('Error creating report:', error);
    res.status(500).json({ error: 'Failed to create report' });
  }
});

/**
 * GET /api/analytics/reports/:tenantId
 * Get reports for a tenant
 */
router.get('/reports/:tenantId', async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.params;
    const resolvedTenantId = Array.isArray(tenantId) ? tenantId[0] : tenantId;
    const reports = analyticsService.getTenantReports(resolvedTenantId);
    res.json({ reports });
  } catch (error) {
    console.error('Error fetching reports:', error);
    res.status(500).json({ error: 'Failed to fetch reports' });
  }
});

/**
 * POST /api/analytics/reports/:id/execute
 * Execute a report
 */
router.post('/reports/:id/execute', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const reportId = Array.isArray(id) ? id[0] : id;
    const data = await analyticsService.executeReport(reportId);
    res.json({ data });
  } catch (error) {
    console.error('Error executing report:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to execute report' });
  }
});

/**
 * POST /api/analytics/funnels
 * Create a funnel
 */
router.post('/funnels', async (req: Request, res: Response) => {
  try {
    const { tenantId, name, steps } = req.body;
    
    if (!tenantId || !name || !steps) {
      return res.status(400).json({ error: 'tenantId, name, and steps are required' });
    }

    const funnel = await analyticsService.createFunnel(tenantId, name, steps);
    res.status(201).json({ funnel });
  } catch (error) {
    console.error('Error creating funnel:', error);
    res.status(500).json({ error: 'Failed to create funnel' });
  }
});

/**
 * GET /api/analytics/funnels/:tenantId
 * Get funnels for a tenant
 */
router.get('/funnels/:tenantId', async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.params;
    const resolvedTenantId = Array.isArray(tenantId) ? tenantId[0] : tenantId;
    const funnels = analyticsService.getTenantFunnels(resolvedTenantId);
    res.json({ funnels });
  } catch (error) {
    console.error('Error fetching funnels:', error);
    res.status(500).json({ error: 'Failed to fetch funnels' });
  }
});

/**
 * GET /api/analytics/funnels/:id/conversion
 * Calculate funnel conversion
 */
router.get('/funnels/:id/conversion', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const funnelId = Array.isArray(id) ? id[0] : id;
    const { startDate, endDate } = req.query;

    const conversion = analyticsService.calculateFunnelConversion(
      funnelId,
      startDate ? new Date(startDate as string) : undefined,
      endDate ? new Date(endDate as string) : undefined
    );
    res.json({ conversion });
  } catch (error) {
    console.error('Error calculating funnel conversion:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to calculate funnel conversion' });
  }
});

export default router;
