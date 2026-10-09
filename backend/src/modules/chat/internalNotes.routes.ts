import { Router, Response } from 'express';
import { internalNotesService } from './internalNotesService';
import { supabase } from '../../core/config/supabase';
import { tenantMiddleware, TenantRequest } from '../../core/middleware/tenant';

const router = Router();

// POST /api/internal-notes - Create note
router.post('/', tenantMiddleware, async (req: TenantRequest, res: Response) => {
  try {
    const orgId = req.organizationId;
    const userId = Array.isArray(req.headers['x-user-id']) ? req.headers['x-user-id'][0] : req.headers['x-user-id'] as string;
    const { conversationId, note, isVisibleToAll } = req.body;

    if (!orgId) return res.status(400).json({ error: 'Organization ID required' });
    if (!userId) return res.status(400).json({ error: 'User ID required' });
    if (!conversationId) return res.status(400).json({ error: 'Conversation ID required' });
    if (!note) return res.status(400).json({ error: 'Note content required' });

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

    const newNote = await internalNotesService.createNote(
      conversationId,
      userId,
      orgId,
      note,
      isVisibleToAll || false
    );
    res.json({ message: 'Note created successfully', note: newNote });
  } catch (error: any) {
    console.error('Error in /internal-notes POST:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/internal-notes/:conversationId - Get notes for conversation
router.get('/:conversationId', tenantMiddleware, async (req: TenantRequest, res: Response) => {
  try {
    const orgId = req.organizationId;
    const { conversationId } = req.params;

    if (!orgId) return res.status(400).json({ error: 'Organization ID required' });

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

    const notes = await internalNotesService.getConversationNotes(conversationId as string, orgId);
    res.json(notes);
  } catch (error: any) {
    console.error('Error in /internal-notes/:conversationId:', error);
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/internal-notes/:noteId - Update note
router.put('/:noteId', tenantMiddleware, async (req: TenantRequest, res: Response) => {
  try {
    const orgId = req.organizationId;
    const userId = Array.isArray(req.headers['x-user-id']) ? req.headers['x-user-id'][0] : req.headers['x-user-id'] as string;
    const { noteId } = req.params;
    const { note, isVisibleToAll } = req.body;

    if (!orgId) return res.status(400).json({ error: 'Organization ID required' });
    if (!userId) return res.status(400).json({ error: 'User ID required' });
    if (!note) return res.status(400).json({ error: 'Note content required' });

    const updatedNote = await internalNotesService.updateNote(
      noteId as string,
      userId,
      orgId,
      note,
      isVisibleToAll
    );
    res.json({ message: 'Note updated successfully', note: updatedNote });
  } catch (error: any) {
    console.error('Error in /internal-notes/:noteId PUT:', error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/internal-notes/:noteId - Delete note
router.delete('/:noteId', tenantMiddleware, async (req: TenantRequest, res: Response) => {
  try {
    const orgId = req.organizationId;
    const userId = Array.isArray(req.headers['x-user-id']) ? req.headers['x-user-id'][0] : req.headers['x-user-id'] as string;
    const { noteId } = req.params;

    if (!orgId) return res.status(400).json({ error: 'Organization ID required' });
    if (!userId) return res.status(400).json({ error: 'User ID required' });

    const result = await internalNotesService.deleteNote(noteId as string, userId, orgId);
    res.json(result);
  } catch (error: any) {
    console.error('Error in /internal-notes/:noteId DELETE:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/internal-notes - Get all organization notes (admin)
router.get('/', tenantMiddleware, async (req: TenantRequest, res: Response) => {
  try {
    const orgId = req.organizationId;

    if (!orgId) return res.status(400).json({ error: 'Organization ID required' });

    const notes = await internalNotesService.getOrganizationNotes(orgId);
    res.json(notes);
  } catch (error: any) {
    console.error('Error in /internal-notes GET:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
