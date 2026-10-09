import { Router, Request, Response } from 'express';
import { supabase } from '../../core/config/supabase';

const router = Router();

const getOrgId = (req: Request): string | null => {
  const orgId = (req as any).organizationId;
  return orgId || null;
};

// GET /api/knowledge/bases
router.get('/bases', async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req);
    if (!orgId) return res.status(401).json({ error: 'Organization ID requerido' });

    const { data, error } = await supabase
      .from('knowledge_bases')
      .select('*, knowledge_documents(count)')
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching knowledge bases:', error);
      return res.status(500).json({ error: 'Failed to fetch knowledge bases' });
    }

    const formatted = (data || []).map((kb: any) => ({
      id: kb.id,
      name: kb.name,
      description: kb.description || '',
      documentCount: kb.knowledge_documents?.[0]?.count || 0,
      chunkSize: kb.chunk_size ?? 500,
      chunkOverlap: kb.chunk_overlap ?? 50,
      createdAt: kb.created_at,
      updatedAt: kb.updated_at,
    }));

    res.json(formatted);
  } catch (err) {
    console.error('Error fetching knowledge bases:', err);
    res.status(500).json({ error: 'Failed to fetch knowledge bases' });
  }
});

// POST /api/knowledge/bases
router.post('/bases', async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req);
    if (!orgId) return res.status(401).json({ error: 'Organization ID requerido' });

    const { name, description } = req.body || {};
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'El nombre es requerido' });
    }

    const { data, error } = await supabase
      .from('knowledge_bases')
      .insert({
        organization_id: orgId,
        name: name.trim(),
        description: description || null,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating knowledge base:', error);
      return res.status(500).json({ error: 'Failed to create knowledge base' });
    }

    res.status(201).json({
      id: data.id,
      name: data.name,
      description: data.description || '',
      documentCount: 0,
      chunkSize: data.chunk_size ?? 500,
      chunkOverlap: data.chunk_overlap ?? 50,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    });
  } catch (err) {
    console.error('Error creating knowledge base:', err);
    res.status(500).json({ error: 'Failed to create knowledge base' });
  }
});

// DELETE /api/knowledge/bases/:id
router.delete('/bases/:id', async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req);
    if (!orgId) return res.status(401).json({ error: 'Organization ID requerido' });

    const { id } = req.params;

    const { data: base, error: baseError } = await supabase
      .from('knowledge_bases')
      .select('id')
      .eq('id', id)
      .eq('organization_id', orgId)
      .single();

    if (baseError || !base) {
      return res.status(404).json({ error: 'Base de conocimiento no encontrada' });
    }

    const { error } = await supabase
      .from('knowledge_bases')
      .delete()
      .eq('id', id)
      .eq('organization_id', orgId);

    if (error) {
      console.error('Error deleting knowledge base:', error);
      return res.status(500).json({ error: 'Failed to delete knowledge base' });
    }

    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting knowledge base:', err);
    res.status(500).json({ error: 'Failed to delete knowledge base' });
  }
});

// GET /api/knowledge/bases/:id/documents
router.get('/bases/:id/documents', async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req);
    if (!orgId) return res.status(401).json({ error: 'Organization ID requerido' });

    const { id } = req.params;

    const { data: base, error: baseError } = await supabase
      .from('knowledge_bases')
      .select('id')
      .eq('id', id)
      .eq('organization_id', orgId)
      .single();

    if (baseError || !base) {
      return res.status(404).json({ error: 'Base de conocimiento no encontrada' });
    }

    const { data, error } = await supabase
      .from('knowledge_documents')
      .select('*')
      .eq('knowledge_base_id', id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching knowledge documents:', error);
      return res.status(500).json({ error: 'Failed to fetch documents' });
    }

    const formatted = (data || []).map((doc: any) => ({
      id: doc.id,
      title: doc.title,
      type: doc.type || 'text',
      status: doc.status || 'ready',
      chunkCount: doc.chunk_count || 0,
      content: doc.content || '',
      url: doc.url || '',
      createdAt: doc.created_at,
    }));

    res.json(formatted);
  } catch (err) {
    console.error('Error fetching knowledge documents:', err);
    res.status(500).json({ error: 'Failed to fetch documents' });
  }
});

// POST /api/knowledge/bases/:id/documents
router.post('/bases/:id/documents', async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req);
    if (!orgId) return res.status(401).json({ error: 'Organization ID requerido' });

    const { id } = req.params;
    const { title, content, url, type } = req.body || {};

    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'El título es requerido' });
    }

    const { data: base, error: baseError } = await supabase
      .from('knowledge_bases')
      .select('id')
      .eq('id', id)
      .eq('organization_id', orgId)
      .single();

    if (baseError || !base) {
      return res.status(404).json({ error: 'Base de conocimiento no encontrada' });
    }

    const docType = type || 'text';
    const { data, error } = await supabase
      .from('knowledge_documents')
      .insert({
        knowledge_base_id: id,
        title: title.trim(),
        type: docType,
        content: content || null,
        url: url || null,
        status: 'ready',
        chunk_count: 0,
      })
      .select()
      .single();

    if (error) {
      console.error('Error adding document:', error);
      return res.status(500).json({ error: 'Failed to add document' });
    }

    res.status(201).json({
      id: data.id,
      title: data.title,
      type: data.type || 'text',
      status: data.status || 'ready',
      chunkCount: data.chunk_count || 0,
      content: data.content || '',
      url: data.url || '',
      createdAt: data.created_at,
    });
  } catch (err) {
    console.error('Error adding document:', err);
    res.status(500).json({ error: 'Failed to add document' });
  }
});

// DELETE /api/knowledge/documents/:id
router.delete('/documents/:id', async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req);
    if (!orgId) return res.status(401).json({ error: 'Organization ID requerido' });

    const { id } = req.params;

    // Verificar que el documento pertenezca a una base de la organización
    const { data: doc, error: docError } = await supabase
      .from('knowledge_documents')
      .select('knowledge_base_id')
      .eq('id', id)
      .single();

    if (docError || !doc) {
      return res.status(404).json({ error: 'Documento no encontrado' });
    }

    const { data: base } = await supabase
      .from('knowledge_bases')
      .select('id')
      .eq('id', doc.knowledge_base_id)
      .eq('organization_id', orgId)
      .single();

    if (!base) {
      return res.status(403).json({ error: 'No autorizado' });
    }

    const { error } = await supabase
      .from('knowledge_documents')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting document:', error);
      return res.status(500).json({ error: 'Failed to delete document' });
    }

    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting document:', err);
    res.status(500).json({ error: 'Failed to delete document' });
  }
});

// POST /api/knowledge/rag
router.post('/rag', async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req);
    if (!orgId) return res.status(401).json({ error: 'Organization ID requerido' });

    const { knowledgeBaseId, query } = req.body || {};
    if (!knowledgeBaseId || !query) {
      return res.status(400).json({ error: 'knowledgeBaseId y query son requeridos' });
    }

    const { data: base, error: baseError } = await supabase
      .from('knowledge_bases')
      .select('id')
      .eq('id', knowledgeBaseId)
      .eq('organization_id', orgId)
      .single();

    if (baseError || !base) {
      return res.status(404).json({ error: 'Base de conocimiento no encontrada' });
    }

    // Búsqueda simple por coincidencia en título/contenido
    const q = `%${query.trim()}%`;
    const { data: documents, error } = await supabase
      .from('knowledge_documents')
      .select('title, content')
      .eq('knowledge_base_id', knowledgeBaseId)
      .or(`title.ilike.${q},content.ilike.${q}`)
      .limit(5);

    if (error) {
      console.error('Error in RAG query:', error);
      return res.status(500).json({ error: 'Failed to run RAG query' });
    }

    const sources = (documents || []).map((doc: any) => ({
      title: doc.title,
      content: doc.content || '',
      similarity: 0.9,
    }));

    res.json({
      context: 'Información relevante encontrada en la base de conocimiento:\n'
        + sources.map((s: any) => s.content).join('\n'),
      sources,
      query,
      knowledgeBaseId,
    });
  } catch (err) {
    console.error('Error in RAG query:', err);
    res.status(500).json({ error: 'Failed to run RAG query' });
  }
});

export default router;
