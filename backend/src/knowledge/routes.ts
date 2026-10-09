/**
 * Knowledge Base API Routes
 * Endpoints for managing knowledge bases and documents
 */

import { Router, Request, Response } from 'express';
import { knowledgeService } from './knowledge.service';
import { documentService } from './document.service';
import { supabase } from '../core/config/supabase';

const router = Router();

/**
 * Middleware to verify organization access
 */
const verifyOrganizationAccess = async (req: Request, res: Response, next: Function) => {
  try {
    const organizationId = req.headers['x-organization-id'] as string;
    const userId = req.headers['x-user-id'] as string;

    if (!organizationId || !userId) {
      return res.status(401).json({ error: 'Missing organization or user ID' });
    }

    // Verify user belongs to organization
    const { data: user } = await supabase
      .from('users')
      .select('organization_id')
      .eq('id', userId)
      .single();

    if (!user || user.organization_id !== organizationId) {
      return res.status(403).json({ error: 'User does not belong to this organization' });
    }

    req.organizationId = organizationId;
    req.userId = userId;
    next();
  } catch (error) {
    res.status(500).json({ error: 'Error verifying organization access' });
  }
};

// Extend Request interface
declare global {
  namespace Express {
    interface Request {
      organizationId?: string;
      userId?: string;
    }
  }
}

/**
 * GET /api/knowledge/bases
 * Get all knowledge bases for the organization
 */
router.get('/bases', verifyOrganizationAccess, async (req: Request, res: Response) => {
  try {
    const knowledgeBases = await knowledgeService.getTenantKnowledgeBases(req.organizationId!);
    res.json(knowledgeBases);
  } catch (error) {
    console.error('Error fetching knowledge bases:', error);
    res.status(500).json({ error: 'Failed to fetch knowledge bases' });
  }
});

/**
 * POST /api/knowledge/bases
 * Create a new knowledge base
 */
router.post('/bases', verifyOrganizationAccess, async (req: Request, res: Response) => {
  try {
    const knowledgeBase = await knowledgeService.createKnowledgeBase({
      tenantId: req.organizationId!,
      name: req.body.name,
      description: req.body.description,
      embeddingModel: req.body.embeddingModel,
      chunkSize: req.body.chunkSize,
      chunkOverlap: req.body.chunkOverlap,
      metadata: req.body.metadata,
    });
    res.status(201).json(knowledgeBase);
  } catch (error) {
    console.error('Error creating knowledge base:', error);
    res.status(500).json({ error: 'Failed to create knowledge base' });
  }
});

/**
 * GET /api/knowledge/bases/:id
 * Get a specific knowledge base
 */
router.get('/bases/:id', verifyOrganizationAccess, async (req: Request, res: Response) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const knowledgeBase = await knowledgeService.getKnowledgeBase(id);
    if (!knowledgeBase) {
      return res.status(404).json({ error: 'Knowledge base not found' });
    }
    res.json(knowledgeBase);
  } catch (error) {
    console.error('Error fetching knowledge base:', error);
    res.status(500).json({ error: 'Failed to fetch knowledge base' });
  }
});

/**
 * POST /api/knowledge/bases/:id/documents
 * Add a document to a knowledge base
 */
router.post('/bases/:id/documents', verifyOrganizationAccess, async (req: Request, res: Response) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const document = await knowledgeService.addDocument({
      knowledgeBaseId: id,
      title: req.body.title,
      content: req.body.content,
      contentType: req.body.contentType,
      sourceUrl: req.body.sourceUrl,
      fileName: req.body.fileName,
      fileSize: req.body.fileSize,
      metadata: req.body.metadata,
    });
    res.status(201).json(document);
  } catch (error) {
    console.error('Error adding document:', error);
    res.status(500).json({ error: 'Failed to add document' });
  }
});

/**
 * GET /api/knowledge/bases/:id/documents
 * Get all documents in a knowledge base
 */
router.get('/bases/:id/documents', verifyOrganizationAccess, async (req: Request, res: Response) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const documents = await documentService.getKnowledgeBaseDocuments(id);
    res.json(documents);
  } catch (error) {
    console.error('Error fetching documents:', error);
    res.status(500).json({ error: 'Failed to fetch documents' });
  }
});

/**
 * POST /api/knowledge/documents/text
 * Upload a text document
 */
router.post('/documents/text', verifyOrganizationAccess, async (req: Request, res: Response) => {
  try {
    const result = await documentService.uploadTextDocument(
      req.body.knowledgeBaseId,
      req.body.title,
      req.body.content,
      req.body.options
    );
    res.json(result);
  } catch (error) {
    console.error('Error uploading text document:', error);
    res.status(500).json({ error: 'Failed to upload text document' });
  }
});

/**
 * POST /api/knowledge/documents/url
 * Upload a document from URL
 */
router.post('/documents/url', verifyOrganizationAccess, async (req: Request, res: Response) => {
  try {
    const result = await documentService.uploadUrlDocument(
      req.body.knowledgeBaseId,
      req.body.url,
      req.body.options
    );
    res.json(result);
  } catch (error) {
    console.error('Error uploading URL document:', error);
    res.status(500).json({ error: 'Failed to upload URL document' });
  }
});

/**
 * GET /api/knowledge/documents/:id
 * Get a specific document
 */
router.get('/documents/:id', verifyOrganizationAccess, async (req: Request, res: Response) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const document = await documentService.getDocument(id);
    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }
    res.json(document);
  } catch (error) {
    console.error('Error fetching document:', error);
    res.status(500).json({ error: 'Failed to fetch document' });
  }
});

/**
 * DELETE /api/knowledge/documents/:id
 * Delete a document
 */
router.delete('/documents/:id', verifyOrganizationAccess, async (req: Request, res: Response) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const success = await documentService.deleteDocument(id);
    if (!success) {
      return res.status(404).json({ error: 'Document not found' });
    }
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting document:', error);
    res.status(500).json({ error: 'Failed to delete document' });
  }
});

/**
 * GET /api/knowledge/documents/:id/chunks
 * Get chunks for a document
 */
router.get('/documents/:id/chunks', verifyOrganizationAccess, async (req: Request, res: Response) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const chunks = await documentService.getDocumentChunks(id);
    res.json(chunks);
  } catch (error) {
    console.error('Error fetching chunks:', error);
    res.status(500).json({ error: 'Failed to fetch chunks' });
  }
});

/**
 * POST /api/knowledge/documents/:id/reprocess
 * Re-process a document
 */
router.post('/documents/:id/reprocess', verifyOrganizationAccess, async (req: Request, res: Response) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const success = await documentService.reprocessDocument(id);
    if (!success) {
      return res.status(404).json({ error: 'Document not found' });
    }
    res.json({ success: true });
  } catch (error) {
    console.error('Error reprocessing document:', error);
    res.status(500).json({ error: 'Failed to reprocess document' });
  }
});

/**
 * POST /api/knowledge/search
 * Search in knowledge base
 */
router.post('/search', verifyOrganizationAccess, async (req: Request, res: Response) => {
  try {
    const results = await knowledgeService.search({
      knowledgeBaseId: req.body.knowledgeBaseId,
      query: req.body.query,
      topK: req.body.topK,
      minSimilarity: req.body.minSimilarity,
      conversationId: req.body.conversationId,
      metadata: {
        tenantId: req.organizationId,
      },
    });
    res.json(results);
  } catch (error) {
    console.error('Error searching knowledge base:', error);
    res.status(500).json({ error: 'Failed to search knowledge base' });
  }
});

/**
 * POST /api/knowledge/rag
 * RAG query
 */
router.post('/rag', verifyOrganizationAccess, async (req: Request, res: Response) => {
  try {
    const response = await knowledgeService.ragQuery({
      knowledgeBaseId: req.body.knowledgeBaseId,
      query: req.body.query,
      topK: req.body.topK,
      minSimilarity: req.body.minSimilarity,
      conversationId: req.body.conversationId,
      metadata: {
        tenantId: req.organizationId,
      },
    });
    res.json(response);
  } catch (error) {
    console.error('Error performing RAG query:', error);
    res.status(500).json({ error: 'Failed to perform RAG query' });
  }
});

/**
 * POST /api/knowledge/whatsapp/map
 * Map WhatsApp connection to knowledge base
 */
router.post('/whatsapp/map', verifyOrganizationAccess, async (req: Request, res: Response) => {
  try {
    const mapping = await knowledgeService.mapWhatsAppToKB(
      req.organizationId!,
      req.body.whatsappConnectionId,
      req.body.knowledgeBaseId,
      req.body.isDefault,
      req.body.priority
    );
    res.status(201).json(mapping);
  } catch (error) {
    console.error('Error mapping WhatsApp to KB:', error);
    res.status(500).json({ error: 'Failed to map WhatsApp to KB' });
  }
});

/**
 * GET /api/knowledge/whatsapp/:connectionId
 * Get knowledge base for WhatsApp connection
 */
router.get('/whatsapp/:connectionId', verifyOrganizationAccess, async (req: Request, res: Response) => {
  try {
    const connectionId = Array.isArray(req.params.connectionId) ? req.params.connectionId[0] : req.params.connectionId;
    const kb = await knowledgeService.getKBForWhatsAppConnection(connectionId);
    if (!kb) {
      return res.status(404).json({ error: 'Knowledge base not found for this connection' });
    }
    res.json(kb);
  } catch (error) {
    console.error('Error fetching KB for WhatsApp connection:', error);
    res.status(500).json({ error: 'Failed to fetch KB for WhatsApp connection' });
  }
});

/**
 * GET /api/knowledge/default
 * Get default knowledge base for organization
 */
router.get('/default', verifyOrganizationAccess, async (req: Request, res: Response) => {
  try {
    const kb = await knowledgeService.getDefaultKB(req.organizationId!);
    if (!kb) {
      return res.status(404).json({ error: 'No default knowledge base found' });
    }
    res.json(kb);
  } catch (error) {
    console.error('Error fetching default KB:', error);
    res.status(500).json({ error: 'Failed to fetch default KB' });
  }
});

export default router;
