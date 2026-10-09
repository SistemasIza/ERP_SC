import express from 'express';
import { supabase } from '../../core/config/supabase';

const router = express.Router();

const getOrgId = (req: any) => (req as any).organizationId;

// ─── GET /api/analytics ─── Main analytics endpoint with real computed stats
router.get('/', async (req: any, res) => {
  try {
    const orgId = getOrgId(req);
    if (!orgId) return res.status(404).json({ error: 'Organization not found' });

    const now = new Date();
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const prevThirtyDays = new Date(thirtyDaysAgo);
    prevThirtyDays.setDate(prevThirtyDays.getDate() - 30);

    const [
      weeklyData,
      topFlowsData,
      dailyData,
      hourlyData,
      messagesResult,
      conversationsCountResult,
      openConversationsCountResult,
      flowExecutionsResult,
      contactsCountResult,
      prevMessagesResult,
    ] = await Promise.allSettled([
      supabase.from('weekly_flow_summary').select('*').eq('organization_id', orgId).order('semana', { ascending: false }).limit(12),
      supabase.from('top_flows_weekly').select('*').eq('organization_id', orgId).order('ejecuciones_semana', { ascending: false }).limit(10),
      supabase.from('daily_flow_summary').select('*').eq('organization_id', orgId).order('dia', { ascending: false }).limit(30),
      supabase.from('hourly_activity').select('*').eq('organization_id', orgId).order('hora', { ascending: true }),
      supabase.from('messages').select('id, direction, created_at, status, type').eq('organization_id', orgId).gte('created_at', thirtyDaysAgo.toISOString()),
      supabase.from('conversations').select('id', { count: 'exact', head: true }).eq('organization_id', orgId),
      supabase.from('conversations').select('id', { count: 'exact', head: true }).eq('organization_id', orgId).eq('status', 'open'),
      supabase.from('flow_executions').select('id, status, executed_at, completed_at').eq('organization_id', orgId).gte('executed_at', thirtyDaysAgo.toISOString()),
      supabase.from('contacts').select('id', { count: 'exact', head: true }).eq('organization_id', orgId),
      supabase.from('messages').select('id').eq('organization_id', orgId).gte('created_at', prevThirtyDays.toISOString()).lte('created_at', thirtyDaysAgo.toISOString()),
    ]);

    const weeklySummary = weeklyData.status === 'fulfilled' ? weeklyData.value.data || [] : [];
    const topFlows = topFlowsData.status === 'fulfilled' ? topFlowsData.value.data || [] : [];
    const dailyFlowSummary = dailyData.status === 'fulfilled' ? dailyData.value.data || [] : [];
    const hourlyActivity = hourlyData.status === 'fulfilled' ? hourlyData.value.data || [] : [];
    const messages = messagesResult.status === 'fulfilled' ? (messagesResult.value.data || []) as any[] : [];
    const conversationsCount = conversationsCountResult.status === 'fulfilled' ? (conversationsCountResult.value.count || 0) : 0;
    const openConversationsCount = openConversationsCountResult.status === 'fulfilled' ? (openConversationsCountResult.value.count || 0) : 0;
    const flowExecutions = flowExecutionsResult.status === 'fulfilled' ? (flowExecutionsResult.value.data || []) as any[] : [];
    const totalContacts = contactsCountResult.status === 'fulfilled' ? (contactsCountResult.value.count || 0) : 0;
    const prevMessagesCount = prevMessagesResult.status === 'fulfilled' ? (prevMessagesResult.value.data || []).length : 0;

    const totalMessages = messages.length;
    const messagesSent = messages.filter(m => m.direction === 'outbound').length;
    const messagesReceived = messages.filter(m => m.direction === 'inbound').length;
    const totalConversations = conversationsCount;
    const openConversations = openConversationsCount;

    const completedExecutions = flowExecutions.filter(e => e.status === 'completed');
    const failedExecutions = flowExecutions.filter(e => e.status === 'failed');
    const completionRate = flowExecutions.length > 0
      ? Math.round((completedExecutions.length / flowExecutions.length) * 100)
      : 0;

    const responseTimes = completedExecutions
      .filter((e: any) => e.completed_at && e.executed_at)
      .map((e: any) => (new Date(e.completed_at).getTime() - new Date(e.executed_at).getTime()) / 1000);
    const avgResponseTime = responseTimes.length > 0
      ? Math.round(responseTimes.reduce((a: number, b: number) => a + b, 0) / responseTimes.length)
      : 0;

    const messagesThisWeek = messages.filter(m => {
      const d = new Date(m.created_at);
      const weekAgo = new Date(now);
      weekAgo.setDate(weekAgo.getDate() - 7);
      return d >= weekAgo;
    }).length;
    const messagesLastWeek = totalMessages - messagesThisWeek;
    const messageTrend = messagesLastWeek > 0
      ? Math.round(((messagesThisWeek - messagesLastWeek) / messagesLastWeek) * 100)
      : messagesThisWeek > 0 ? 100 : 0;

    const dailyMessages: Record<string, { sent: number; received: number }> = {};
    messages.forEach((m: any) => {
      const day = new Date(m.created_at).toISOString().split('T')[0];
      if (!dailyMessages[day]) dailyMessages[day] = { sent: 0, received: 0 };
      if (m.direction === 'outbound') dailyMessages[day].sent++;
      else dailyMessages[day].received++;
    });

    const messagesPerDay = Object.entries(dailyMessages)
      .map(([date, counts]) => ({ date, value: counts.sent + counts.received, sent: counts.sent, received: counts.received }))
      .sort((a, b) => a.date.localeCompare(b.date));

    const hourlyMessages: Record<number, number> = {};
    messages.forEach((m: any) => {
      const h = new Date(m.created_at).getHours();
      hourlyMessages[h] = (hourlyMessages[h] || 0) + 1;
    });
    const hourlyActivityData = Array.from({ length: 24 }, (_, i) => ({
      hora: i,
      ejecuciones: hourlyMessages[i] || 0,
      dias_activos: hourlyActivity.find((h: any) => h.hora === i)?.dias_activos || 0,
    }));

    const totalExecutions = flowExecutions.length;
    const successRate = totalExecutions > 0 ? Math.round((completedExecutions.length / totalExecutions) * 100) : 0;

    const response = {
      interactionsPerDay: dailyFlowSummary.length > 0
        ? dailyFlowSummary.map((item: any) => ({ date: item.dia, value: item.interacciones || 0 }))
        : messagesPerDay,
      topFlows,
      activeUsers: dailyFlowSummary.length > 0
        ? dailyFlowSummary.map((item: any) => ({ date: item.dia, value: item.usuarios_unicos || 0 }))
        : messagesPerDay.map(d => ({ date: d.date, value: 0 })),
      weeklySummary,
      dailyFlowSummary,
      hourlyActivity: hourlyActivityData,
      stats: {
        avgResponseTime,
        satisfactionRate: successRate,
        completionRate,
        totalUsers: totalContacts,
        totalMessages,
        totalConversations,
        messagesSent,
        messagesReceived,
        openConversations,
        messageTrend,
        completedExecutions: completedExecutions.length,
        failedExecutions: failedExecutions.length,
      }
    };

    res.json(response);
  } catch (error) {
    console.error('Error in /api/analytics:', error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

// ─── GET /api/analytics/dashboard ─── Dashboard-specific data (chart + sparklines + activity + insights)
router.get('/dashboard', async (req: any, res) => {
  try {
    const orgId = getOrgId(req);
    if (!orgId) return res.status(404).json({ error: 'Organization not found' });

    const now = new Date();
    const range = (req.query.range as string) || '7d';
    const days = range === '30d' ? 30 : 7;
    const startDate = new Date(now);
    startDate.setDate(startDate.getDate() - days + 1);
    startDate.setHours(0, 0, 0, 0);

    const prevStart = new Date(startDate);
    prevStart.setDate(prevStart.getDate() - days);

    const [
      messagesResult,
      prevMessagesResult,
      contactsCountResult,
      newContactsCountResult,
      prevNewContactsResult,
      sparkContactsResult,
      conversationsResult,
      flowExecutionsResult,
      recentContactsResult,
      recentMessagesResult,
      recentExecutionsResult,
    ] = await Promise.allSettled([
      supabase.from('messages').select('id, direction, created_at, type, status').eq('organization_id', orgId).gte('created_at', startDate.toISOString()),
      supabase.from('messages').select('id, direction').eq('organization_id', orgId).gte('created_at', prevStart.toISOString()).lte('created_at', startDate.toISOString()),
      supabase.from('contacts').select('id', { count: 'exact', head: true }).eq('organization_id', orgId),
      supabase.from('contacts').select('id', { count: 'exact', head: true }).eq('organization_id', orgId).gte('created_at', startDate.toISOString()),
      supabase.from('contacts').select('id', { count: 'exact', head: true }).eq('organization_id', orgId).gte('created_at', prevStart.toISOString()).lte('created_at', startDate.toISOString()),
      supabase.from('contacts').select('id, created_at').eq('organization_id', orgId).order('created_at', { ascending: false }).limit(200),
      supabase.from('conversations').select('id, status, last_message_at').eq('organization_id', orgId).order('last_message_at', { ascending: false }).limit(1000),
      supabase.from('flow_executions').select('id, status, executed_at, completed_at').eq('organization_id', orgId).gte('executed_at', startDate.toISOString()),
      supabase.from('contacts').select('id, profile_name, phone_number, created_at, last_active_at').eq('organization_id', orgId).order('created_at', { ascending: false }).limit(5),
      supabase.from('messages').select('id, direction, content, type, created_at, contacts(profile_name, phone_number)').eq('organization_id', orgId).order('created_at', { ascending: false }).limit(10),
      supabase.from('flow_executions').select('id, status, executed_at, flows(name)').eq('organization_id', orgId).order('executed_at', { ascending: false }).limit(10),
    ]);

    const messages = messagesResult.status === 'fulfilled' ? (messagesResult.value.data || []) as any[] : [];
    const prevMessages = prevMessagesResult.status === 'fulfilled' ? (prevMessagesResult.value.data || []) as any[] : [];
    const totalContacts = contactsCountResult.status === 'fulfilled' ? (contactsCountResult.value.count || 0) : 0;
    const newContactsNow = newContactsCountResult.status === 'fulfilled' ? (newContactsCountResult.value.count || 0) : 0;
    const newContactsPrev = prevNewContactsResult.status === 'fulfilled' ? (prevNewContactsResult.value.count || 0) : 0;
    const sparkContacts = sparkContactsResult.status === 'fulfilled' ? (sparkContactsResult.value.data || []) as any[] : [];
    const conversations = conversationsResult.status === 'fulfilled' ? (conversationsResult.value.data || []) as any[] : [];
    const flowExecutions = flowExecutionsResult.status === 'fulfilled' ? (flowExecutionsResult.value.data || []) as any[] : [];
    const recentContacts = recentContactsResult.status === 'fulfilled' ? (recentContactsResult.value.data || []) as any[] : [];
    const recentMessages = recentMessagesResult.status === 'fulfilled' ? (recentMessagesResult.value.data || []) as any[] : [];
    const recentExecutions = recentExecutionsResult.status === 'fulfilled' ? (recentExecutionsResult.value.data || []) as any[] : [];

    const chartData: { date: string; value: number; sent: number; received: number }[] = [];
    for (let i = 0; i < days; i++) {
      const d = new Date(startDate);
      d.setDate(d.getDate() + i);
      const dayStr = d.toISOString().split('T')[0];
      const dayMessages = messages.filter(m => new Date(m.created_at).toISOString().split('T')[0] === dayStr);
      chartData.push({
        date: d.toLocaleDateString('es-ES', { month: 'short', day: 'numeric' }),
        value: dayMessages.length,
        sent: dayMessages.filter(m => m.direction === 'outbound').length,
        received: dayMessages.filter(m => m.direction === 'inbound').length,
      });
    }

    const sparklines = {
      messages: chartData.map(d => d.value),
      contacts: (() => {
        const sorted = [...sparkContacts].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        const last8 = sorted.slice(-8);
        return last8.map((_, i) => {
          const cutoff = new Date(last8[i].created_at);
          return sorted.filter(c => new Date(c.created_at) <= cutoff).length;
        });
      })(),
      conversations: (() => {
        const open = conversations.filter(c => c.status === 'open').length;
        const closed = conversations.filter(c => c.status === 'closed').length;
        return [open, closed, conversations.length];
      })(),
    };

    const totalMessagesNow = messages.length;
    const totalMessagesPrev = prevMessages.length;
    const msgTrend = totalMessagesPrev > 0 ? Math.round(((totalMessagesNow - totalMessagesPrev) / totalMessagesPrev) * 100) : totalMessagesNow > 0 ? 100 : 0;

    const contactTrend = newContactsPrev > 0 ? Math.round(((newContactsNow - newContactsPrev) / newContactsPrev) * 100) : newContactsNow > 0 ? 100 : 0;

    const completedExecutions = flowExecutions.filter(e => e.status === 'completed');
    const successRate = flowExecutions.length > 0 ? Math.round((completedExecutions.length / flowExecutions.length) * 100) : 0;

    const responseTimes = completedExecutions
      .filter((e: any) => e.completed_at && e.executed_at)
      .map((e: any) => (new Date(e.completed_at).getTime() - new Date(e.executed_at).getTime()) / 1000);
    const avgResponseTime = responseTimes.length > 0
      ? Math.round(responseTimes.reduce((a: number, b: number) => a + b, 0) / responseTimes.length)
      : 0;

    const activity: any[] = [];
    recentContacts.forEach((c: any) => {
      activity.push({ type: 'user', title: `${c.profile_name || 'Usuario'} registrado`, time: c.created_at, icon: 'user' });
    });
    recentMessages.slice(0, 5).forEach((m: any) => {
      const contactName = m.contacts?.profile_name || m.contacts?.phone_number || 'Desconocido';
      activity.push({ type: 'message', title: `Mensaje ${m.direction === 'inbound' ? 'recibido' : 'enviado'} de ${contactName}`, time: m.created_at, icon: 'message' });
    });
    recentExecutions.slice(0, 5).forEach((e: any) => {
      const flowName = e.flows?.name || 'Flujo';
      activity.push({ type: 'flow', title: `Flujo "${flowName}" ${e.status === 'completed' ? 'completado' : e.status}`, time: e.executed_at, icon: 'flow' });
    });
    activity.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());

    const insights: any[] = [];
    if (totalMessagesNow > 0) {
      if (msgTrend > 20) insights.push({ type: 'growth', text: `Los mensajes crecieron ${msgTrend}% respecto al período anterior.` });
      else if (msgTrend < -20) insights.push({ type: 'alert', text: `Los mensajes bajaron ${Math.abs(msgTrend)}% respecto al período anterior.` });
      else insights.push({ type: 'traffic', text: `Se procesaron ${totalMessagesNow} mensajes en los últimos ${days} días.` });
    }
    if (successRate > 0) {
      insights.push({ type: 'bot', text: `El sistema completó el ${successRate}% de las ejecuciones exitosamente.` });
    }
    if (newContactsNow > 0) {
      insights.push({ type: 'growth', text: `${newContactsNow} nuevos contactos se agregaron este período.` });
    }
    if (insights.length === 0) {
      insights.push({ type: 'traffic', text: 'Aún no hay suficientes datos para generar insights. ¡Empieza a usar el sistema!' });
    }

    const openConversationsCount = conversations.filter(c => c.status === 'open').length;
    if (openConversationsCount > 0) {
      insights.push({ type: 'alert', text: `Hay ${openConversationsCount} conversaciones abiertas pendientes.` });
    }

    res.json({
      chart: chartData,
      sparklines,
      stats: {
        totalMessages: totalMessagesNow,
        messageTrend: msgTrend,
        totalContacts,
        contactTrend,
        openConversations: openConversationsCount,
        activeFlows: flowExecutions.length,
        completionRate: successRate,
        avgResponseTime,
      },
      activity: activity.slice(0, 8),
      insights,
    });
  } catch (error) {
    console.error('Error in /api/analytics/dashboard:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard analytics' });
  }
});

// GET /api/analytics/flows/weekly
router.get('/flows/weekly', async (req: any, res) => {
  try {
    const orgId = getOrgId(req);
    if (!orgId) return res.status(404).json({ error: 'Organization not found' });

    const { data, error } = await supabase
      .from('weekly_flow_summary')
      .select('*')
      .eq('organization_id', orgId)
      .order('semana', { ascending: false })
      .limit(12);

    if (error) throw error;
    res.json(data || []);
  } catch (error) {
    console.error('Error in /api/analytics/flows/weekly:', error);
    res.status(500).json({ error: 'Failed to fetch weekly flow summary' });
  }
});

// GET /api/analytics/flows/top
router.get('/flows/top', async (req: any, res) => {
  try {
    const orgId = getOrgId(req);
    if (!orgId) return res.status(404).json({ error: 'Organization not found' });

    const { data, error } = await supabase
      .from('top_flows_weekly')
      .select('*')
      .eq('organization_id', orgId)
      .order('ejecuciones_semana', { ascending: false })
      .limit(10);

    if (error) throw error;
    res.json(data || []);
  } catch (error) {
    console.error('Error in /api/analytics/flows/top:', error);
    res.status(500).json({ error: 'Failed to fetch top flows' });
  }
});

// GET /api/analytics/flows/daily
router.get('/flows/daily', async (req: any, res) => {
  try {
    const orgId = getOrgId(req);
    if (!orgId) return res.status(404).json({ error: 'Organization not found' });

    const { data, error } = await supabase
      .from('daily_flow_summary')
      .select('*')
      .eq('organization_id', orgId)
      .order('dia', { ascending: false })
      .limit(30);

    if (error) throw error;
    res.json(data || []);
  } catch (error) {
    console.error('Error in /api/analytics/flows/daily:', error);
    res.status(500).json({ error: 'Failed to fetch daily flow summary' });
  }
});

// GET /api/analytics/activity/hourly
router.get('/activity/hourly', async (req: any, res) => {
  try {
    const orgId = getOrgId(req);
    if (!orgId) return res.status(404).json({ error: 'Organization not found' });

    const { data, error } = await supabase
      .from('hourly_activity')
      .select('*')
      .eq('organization_id', orgId)
      .order('hora', { ascending: true });

    if (error) throw error;
    res.json(data || []);
  } catch (error) {
    console.error('Error in /api/analytics/activity/hourly:', error);
    res.status(500).json({ error: 'Failed to fetch hourly activity' });
  }
});

export default router;
