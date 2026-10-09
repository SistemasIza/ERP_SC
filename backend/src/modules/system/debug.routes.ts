import express from 'express';
import { supabase } from '../../core/config/supabase';

const router = express.Router();

// Debug endpoints expone datos sensibles/PII y dispara flujos; restringir a super_admin
const requireSuperAdmin = (req: any, res: any, next: any) => {
  if (req.user?.role !== 'super_admin') {
    return res.status(403).json({ error: 'Forbidden: se requiere rol super_admin' });
  }
  next();
};

// GET /api/debug/bot-status - Debug bot status and flows
router.get('/bot-status', requireSuperAdmin, async (req, res) => {
  try {
    // Get organization
    const orgId = (req as any).organizationId;
    if (!orgId) return res.status(404).json({ error: 'Organization not found' });
    const { data: org } = await supabase.from('organizations').select('*').eq('id', orgId).single();
    
    if (!org) {
      return res.json({
        success: false,
        error: 'No organization found'
      });
    }

    // Get all flows
    const { data: flows } = await supabase
      .from('flows')
      .select('*')
      .eq('organization_id', org.id);

    // Get active flow
    const { data: activeFlow } = await supabase
      .from('flows')
      .select('*')
      .eq('organization_id', org.id)
      .eq('is_active', true)
      .limit(1)
      .single();

    // Get recent conversations
    const { data: conversations } = await supabase
      .from('conversations')
      .select('*, contacts(*)')
      .eq('organization_id', org.id)
      .order('last_message_at', { ascending: false })
      .limit(5);

    // Get recent messages
    const { data: messages } = await supabase
      .from('messages')
      .select('*')
      .eq('organization_id', org.id)
      .order('created_at', { ascending: false })
      .limit(10);

    res.json({
      success: true,
      organization: org,
      flows: flows || [],
      activeFlow: activeFlow || null,
      recentConversations: conversations || [],
      recentMessages: messages || [],
      summary: {
        totalFlows: flows?.length || 0,
        hasActiveFlow: !!activeFlow,
        totalConversations: conversations?.length || 0,
        totalMessages: messages?.length || 0,
        activeFlowNodes: activeFlow?.nodes?.length || 0,
        activeFlowEdges: activeFlow?.edges?.length || 0
      }
    });
  } catch (error: any) {
    console.error('Debug bot status error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// POST /api/debug/test-bot - Test bot with a message
router.post('/test-bot', requireSuperAdmin, async (req, res) => {
  try {
    const { message, phoneNumber } = req.body;

    if (!message || !phoneNumber) {
      return res.status(400).json({
        success: false,
        error: 'message and phoneNumber are required'
      });
    }

    // Import the handleIncomingMessage function
    const { handleIncomingMessage } = await import('../bots/engine/flow-core');

    const orgId = (req as any).organizationId;
    if (!orgId) return res.status(404).json({ error: 'Organization not found' });
    const { data: org } = await supabase.from('organizations').select('*').eq('id', orgId).single();
    
    if (!org) {
      return res.json({
        success: false,
        error: 'No organization found'
      });
    }

    // Create or get contact
    const { data: contact } = await supabase
      .from('contacts')
      .upsert({
        organization_id: orgId,
        phone_number: phoneNumber,
        profile_name: 'Test User',
        last_active_at: new Date().toISOString()
      }, { onConflict: 'organization_id,phone_number' })
      .select().single();

    // Create or get conversation
    let { data: conversations } = await supabase
      .from('conversations')
      .select('*')
      .eq('organization_id', orgId)
      .eq('contact_id', contact.id)
      .limit(1);
    
    let conversation = conversations && conversations.length > 0 ? conversations[0] : null;

    if (!conversation) {
      const { data: newConv } = await supabase
        .from('conversations')
        .insert({ organization_id: orgId, contact_id: contact.id })
        .select().single();
      conversation = newConv;
    }

    // Test the message
    const testMessage = {
      type: 'text',
      text: { body: message }
    };

    const organizationConfig = {
      organizationId: orgId,
      conversationId: conversation?.id,
      contactId: contact.id
    };

    // Mock WhatsApp service for testing
    const mockWaService = {
      sendTextMessage: async (to: string, body: string) => {
        console.log(`[MOCK] Would send to ${to}: "${body}"`);
        return { key: { id: 'mock-message-id' } };
      },
      sendButtonMessage: async (to: string, bodyText: string, buttons: any[]) => {
        console.log(`[MOCK] Would send buttons to ${to}: "${bodyText}"`, buttons);
        return { key: { id: 'mock-button-id' } };
      }
    };

    await handleIncomingMessage(testMessage, phoneNumber, organizationConfig, mockWaService);

    res.json({
      success: true,
      message: 'Test message processed',
      testMessage,
      organizationConfig
    });
  } catch (error: any) {
    console.error('Debug test bot error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
