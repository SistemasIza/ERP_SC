import { Router, Response } from 'express';
import { supabase } from '../../core/config/supabase';
import { tenantMiddleware, TenantRequest } from '../../core/middleware/tenant';

const router = Router();

// GET /api/inbox - Get unified inbox for organization
router.get('/', tenantMiddleware, async (req: TenantRequest, res: Response) => {
  try {
    const orgId = req.organizationId;
    const { platform, status, assignedTo, priority, department, limit = 50, offset = 0 } = req.query;

    if (!orgId) return res.status(400).json({ error: 'Organization ID required' });

    let query = supabase
      .from('conversations')
      .select(`
        *,
        contacts(*),
        platform_connections!inner(platform_type, display_name),
        assigned_agent:users!conversations_assigned_to_fkey(name, email, avatar_url),
        messages(count)
      `)
      .eq('organization_id', orgId);

    // Filter by platform
    if (platform) {
      query = query.eq('platform_type', platform);
    }

    // Filter by status
    if (status) {
      query = query.eq('status', status);
    }

    // Filter by assigned agent
    if (assignedTo) {
      query = query.eq('assigned_to', assignedTo);
    }

    // Filter by priority
    if (priority) {
      query = query.eq('priority', priority);
    }

    // Filter by department
    if (department) {
      query = query.eq('department', department);
    }

    // Pagination
    query = query
      .order('last_message_at', { ascending: false })
      .range(Number(offset), Number(offset) + Number(limit) - 1);

    const { data: conversations, error } = await query;

    if (error) throw error;

    res.json(conversations);
  } catch (error: any) {
    console.error('Error in /inbox:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/inbox/stats - Get inbox statistics
router.get('/stats', tenantMiddleware, async (req: TenantRequest, res: Response) => {
  try {
    const orgId = req.organizationId;

    if (!orgId) return res.status(400).json({ error: 'Organization ID required' });

    // Combine all stats into two queries: count with filters, and breakdown aggregates
    const { data: conversations, error: convError } = await supabase
      .from('conversations')
      .select('platform_type, priority, status, assigned_to')
      .eq('organization_id', orgId);

    if (convError) throw convError;

    const total = conversations?.length || 0;
    let open = 0, assigned = 0, unassigned = 0;
    const platformCounts: Record<string, number> = {};
    const priorityCounts: Record<string, number> = {};

    for (const conv of conversations || []) {
      if (conv.status === 'open') open++;
      if (conv.assigned_to) assigned++;
      else unassigned++;

      if (conv.platform_type) {
        platformCounts[conv.platform_type] = (platformCounts[conv.platform_type] || 0) + 1;
      }
      if (conv.priority) {
        priorityCounts[conv.priority] = (priorityCounts[conv.priority] || 0) + 1;
      }
    }

    res.json({
      total,
      open,
      assigned,
      unassigned,
      byPlatform: platformCounts,
      byPriority: priorityCounts
    });
  } catch (error: any) {
    console.error('Error in /inbox/stats:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/inbox/:conversationId - Get conversation with messages
router.get('/:conversationId', tenantMiddleware, async (req: TenantRequest, res: Response) => {
  try {
    const orgId = req.organizationId;
    const { conversationId } = req.params;

    if (!orgId) return res.status(400).json({ error: 'Organization ID required' });

    // Get conversation
    const { data: conversation, error } = await supabase
      .from('conversations')
      .select(`
        *,
        contacts(*),
        platform_connections!inner(platform_type, display_name),
        assigned_agent:users!conversations_assigned_to_fkey(name, email, avatar_url)
      `)
      .eq('id', conversationId)
      .eq('organization_id', orgId)
      .single();

    if (error || !conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    // Get messages (last 100, newest first for pagination)
    const messageLimit = Math.min(parseInt(req.query.messageLimit as string) || 100, 500);
    const { data: messages, error: messagesError } = await supabase
      .from('messages')
      .select('id, content, created_at, direction, type, status, organization_id')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: false })
      .limit(messageLimit);

    if (messagesError) throw messagesError;

    // Get internal notes
    const { data: notes, error: notesError } = await supabase
      .from('internal_notes')
      .select(`
        *,
        users(name, email, avatar_url)
      `)
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (notesError) throw notesError;

    res.json({
      conversation,
      messages: (messages || []).reverse(), // chronological order
      notes: notes || []
    });
  } catch (error: any) {
    console.error('Error in /inbox/:conversationId:', error);
    res.status(500).json({ error: error.message });
  }
});

// PATCH /api/inbox/:conversationId/priority - Update conversation priority
router.patch('/:conversationId/priority', tenantMiddleware, async (req: TenantRequest, res: Response) => {
  try {
    const orgId = req.organizationId;
    const { conversationId } = req.params;
    const { priority } = req.body;

    if (!orgId) return res.status(400).json({ error: 'Organization ID required' });
    if (!priority) return res.status(400).json({ error: 'Priority required' });

    const validPriorities = ['low', 'normal', 'high', 'urgent'];
    if (!validPriorities.includes(priority)) {
      return res.status(400).json({ error: `Invalid priority. Must be one of: ${validPriorities.join(', ')}` });
    }

    // Verify conversation belongs to organization
    const { data: conversation, error } = await supabase
      .from('conversations')
      .select('*')
      .eq('id', conversationId)
      .eq('organization_id', orgId)
      .single();

    if (error || !conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    const { data: updatedConversation, error: updateError } = await supabase
      .from('conversations')
      .update({ priority })
      .eq('id', conversationId)
      .eq('organization_id', orgId)
      .select()
      .single();

    if (updateError) throw updateError;

    res.json({ message: 'Priority updated successfully', conversation: updatedConversation });
  } catch (error: any) {
    console.error('Error in /inbox/:conversationId/priority:', error);
    res.status(500).json({ error: error.message });
  }
});

// PATCH /api/inbox/:conversationId/status - Update conversation status
router.patch('/:conversationId/status', tenantMiddleware, async (req: TenantRequest, res: Response) => {
  try {
    const orgId = req.organizationId;
    const { conversationId } = req.params;
    const { status } = req.body;

    if (!orgId) return res.status(400).json({ error: 'Organization ID required' });
    if (!status) return res.status(400).json({ error: 'Status required' });

    const validStatuses = ['open', 'closed', 'archived'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
    }

    // Verify conversation belongs to organization
    const { data: conversation, error } = await supabase
      .from('conversations')
      .select('*')
      .eq('id', conversationId)
      .eq('organization_id', orgId)
      .single();

    if (error || !conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    const { data: updatedConversation, error: updateError } = await supabase
      .from('conversations')
      .update({ status })
      .eq('id', conversationId)
      .eq('organization_id', orgId)
      .select()
      .single();

    if (updateError) throw updateError;

    res.json({ message: 'Status updated successfully', conversation: updatedConversation });
  } catch (error: any) {
    console.error('Error in /inbox/:conversationId/status:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
