/**
 * Knowledge Retrieval Service
 * Main service for RAG (Retrieval Augmented Generation) system
 */

import { 
  KnowledgeBase, 
  KnowledgeDocument, 
  KnowledgeChunk, 
  WhatsAppKBMapping,
  RAGQueryHistory,
  CreateKnowledgeBaseInput,
  CreateDocumentInput,
  SearchResult,
  RAGQueryOptions,
  RAGResponse 
} from './types/knowledge.types';
import { supabase } from '../core/config/supabase';
import { OpenAI } from 'openai';

export class KnowledgeService {
  private openai: OpenAI | null;

  constructor() {
    this.openai = process.env.OPENAI_API_KEY ? new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    }) : null;
  }

  /**
   * Create a new knowledge base
   */
  async createKnowledgeBase(input: CreateKnowledgeBaseInput): Promise<KnowledgeBase> {
    const { data, error } = await supabase
      .from('knowledge_bases')
      .insert({
        tenant_id: input.tenantId,
        name: input.name,
        description: input.description,
        embedding_model: input.embeddingModel || 'text-embedding-3-small',
        chunk_size: input.chunkSize || 500,
        chunk_overlap: input.chunkOverlap || 50,
        metadata: input.metadata || {},
      })
      .select()
      .single();

    if (error) throw new Error(`Error creating knowledge base: ${error.message}`);
    return this.mapKnowledgeBase(data);
  }

  /**
   * Get knowledge bases for a tenant
   */
  async getTenantKnowledgeBases(tenantId: string): Promise<KnowledgeBase[]> {
    const { data, error } = await supabase
      .from('knowledge_bases')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });

    if (error) throw new Error(`Error fetching knowledge bases: ${error.message}`);
    return (data || []).map(this.mapKnowledgeBase);
  }

  /**
   * Get a knowledge base by ID
   */
  async getKnowledgeBase(id: string): Promise<KnowledgeBase | null> {
    const { data, error } = await supabase
      .from('knowledge_bases')
      .select('*')
      .eq('id', id)
      .single();

    if (error) return null;
    return this.mapKnowledgeBase(data);
  }

  /**
   * Add a document to a knowledge base
   */
  async addDocument(input: CreateDocumentInput): Promise<KnowledgeDocument> {
    // Create document record
    const { data: document, error: docError } = await supabase
      .from('knowledge_documents')
      .insert({
        knowledge_base_id: input.knowledgeBaseId,
        title: input.title,
        content: input.content,
        content_type: input.contentType || 'text',
        source_url: input.sourceUrl,
        file_name: input.fileName,
        file_size: input.fileSize,
        metadata: input.metadata || {},
        status: 'processing',
      })
      .select()
      .single();

    if (docError) throw new Error(`Error creating document: ${docError.message}`);

    // Process document asynchronously (chunking and embedding)
    this.processDocument(document.id, input.knowledgeBaseId, input.content)
      .catch(error => console.error('Error processing document:', error));

    return this.mapKnowledgeDocument(document);
  }

  /**
   * Process document: chunk and generate embeddings
   */
  private async processDocument(documentId: string, knowledgeBaseId: string, content: string) {
    try {
      // Get knowledge base settings
      const kb = await this.getKnowledgeBase(knowledgeBaseId);
      if (!kb) throw new Error('Knowledge base not found');

      // Chunk the content
      const chunks = this.chunkText(content, kb.chunkSize, kb.chunkOverlap);

      // Generate embeddings for each chunk
      const embeddingPromises = chunks.map(async (chunkText, index) => {
        const embedding = await this.generateEmbedding(chunkText);
        
        const { data: chunk, error } = await supabase
          .from('knowledge_chunks')
          .insert({
            document_id: documentId,
            knowledge_base_id: knowledgeBaseId,
            chunk_index: index,
            content: chunkText,
            embedding: embedding,
            metadata: {},
          })
          .select()
          .single();

        if (error) throw error;
        return chunk;
      });

      await Promise.all(embeddingPromises);

      // Update document status
      await supabase
        .from('knowledge_documents')
        .update({ 
          status: 'completed',
          chunk_count: chunks.length,
          updated_at: new Date().toISOString()
        })
        .eq('id', documentId);

    } catch (error) {
      console.error('Error processing document:', error);
      
      // Update document status to failed
      await supabase
        .from('knowledge_documents')
        .update({ 
          status: 'failed',
          error_message: error instanceof Error ? error.message : 'Unknown error',
          updated_at: new Date().toISOString()
        })
        .eq('id', documentId);
    }
  }

  /**
   * Split text into chunks
   */
  private chunkText(text: string, chunkSize: number, overlap: number): string[] {
    const chunks: string[] = [];
    let start = 0;

    while (start < text.length) {
      const end = Math.min(start + chunkSize, text.length);
      chunks.push(text.slice(start, end));
      start = end - overlap;
    }

    return chunks;
  }

  /**
   * Generate embedding for text using OpenAI
   */
  private async generateEmbedding(text: string): Promise<number[]> {
    if (!this.openai) {
      throw new Error('OpenAI API key not configured');
    }
    try {
      const response = await this.openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: text,
      });
      return response.data[0].embedding;
    } catch (error) {
      console.error('Error generating embedding:', error);
      throw error;
    }
  }

  /**
   * Search for relevant chunks using vector similarity
   */
  async search(options: RAGQueryOptions): Promise<SearchResult[]> {
    const { knowledgeBaseId, query, topK = 5, minSimilarity = 0.7 } = options;

    // Generate embedding for query
    const queryEmbedding = await this.generateEmbedding(query);

    // Search using pgvector similarity
    const { data, error } = await supabase.rpc('match_documents', {
      query_embedding: queryEmbedding,
      knowledge_base_id: knowledgeBaseId,
      match_threshold: minSimilarity,
      match_count: topK
    });

    if (error) {
      console.error('Error searching:', error);
      return [];
    }

    // Fetch document details for each chunk — batched to avoid N+1
    const results: SearchResult[] = [];
    if (data && data.length > 0) {
      const documentIds = [...new Set(data.map((m: any) => m.document_id))];
      const { data: documents } = await supabase
        .from('knowledge_documents')
        .select('id, title, content, content_type, status, chunk_count, created_at')
        .in('id', documentIds);

      const docMap = new Map((documents || []).map((d: any) => [d.id, d]));

      for (const match of data) {
        const document = docMap.get(match.document_id);
        if (document) {
          results.push({
            chunk: this.mapKnowledgeChunk(match),
            document: this.mapKnowledgeDocument(document),
            similarity: match.similarity,
          });
        }
      }
    }

    return results;
  }

  /**
   * RAG query: search and generate context
   */
  async ragQuery(options: RAGQueryOptions): Promise<RAGResponse> {
    const startTime = Date.now();
    
    // Search for relevant chunks
    const results = await this.search(options);
    
    // Build context from results
    const context = results
      .map(r => `[Source: ${r.document.title}]\n${r.chunk.content}`)
      .join('\n\n');

    const latency = Date.now() - startTime;

    // Log query for analytics
    await supabase.from('rag_query_history').insert({
      tenant_id: options.metadata?.tenantId || '',
      conversation_id: options.conversationId,
      knowledge_base_id: options.knowledgeBaseId,
      query: options.query,
      retrieved_chunks: results.length,
      response_generated: false,
      latency_ms: latency,
      metadata: options.metadata || {},
    });

    return {
      query: options.query,
      context,
      sources: results,
      knowledgeBaseId: options.knowledgeBaseId,
    };
  }

  /**
   * Map WhatsApp connection to knowledge base
   */
  async mapWhatsAppToKB(
    tenantId: string,
    whatsappConnectionId: string,
    knowledgeBaseId: string,
    isDefault: boolean = false,
    priority: number = 0
  ): Promise<WhatsAppKBMapping> {
    const { data, error } = await supabase
      .from('whatsapp_kb_mappings')
      .insert({
        tenant_id: tenantId,
        whatsapp_connection_id: whatsappConnectionId,
        knowledge_base_id: knowledgeBaseId,
        is_default: isDefault,
        priority: priority,
      })
      .select()
      .single();

    if (error) throw new Error(`Error mapping WhatsApp to KB: ${error.message}`);
    return this.mapWhatsAppKBMapping(data);
  }

  /**
   * Get knowledge base for WhatsApp connection
   */
  async getKBForWhatsAppConnection(whatsappConnectionId: string): Promise<KnowledgeBase | null> {
    const { data, error } = await supabase
      .from('whatsapp_kb_mappings')
      .select('*, knowledge_bases(*)')
      .eq('whatsapp_connection_id', whatsappConnectionId)
      .order('priority', { ascending: false })
      .limit(1)
      .single();

    if (error || !data) return null;
    return this.mapKnowledgeBase(data.knowledge_bases);
  }

  /**
   * Get default knowledge base for tenant
   */
  async getDefaultKB(tenantId: string): Promise<KnowledgeBase | null> {
    const { data, error } = await supabase
      .from('whatsapp_kb_mappings')
      .select('*, knowledge_bases(*)')
      .eq('tenant_id', tenantId)
      .eq('is_default', true)
      .limit(1)
      .single();

    if (error || !data) return null;
    return this.mapKnowledgeBase(data.knowledge_bases);
  }

  // Mapping helpers
  private mapKnowledgeBase(data: any): KnowledgeBase {
    return {
      id: data.id,
      tenantId: data.tenant_id,
      name: data.name,
      description: data.description,
      embeddingModel: data.embedding_model,
      chunkSize: data.chunk_size,
      chunkOverlap: data.chunk_overlap,
      isActive: data.is_active,
      metadata: data.metadata,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
    };
  }

  private mapKnowledgeDocument(data: any): KnowledgeDocument {
    return {
      id: data.id,
      knowledgeBaseId: data.knowledge_base_id,
      title: data.title,
      content: data.content,
      contentType: data.content_type,
      sourceUrl: data.source_url,
      fileName: data.file_name,
      fileSize: data.file_size,
      metadata: data.metadata,
      status: data.status,
      errorMessage: data.error_message,
      chunkCount: data.chunk_count,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
    };
  }

  private mapKnowledgeChunk(data: any): KnowledgeChunk {
    return {
      id: data.id,
      documentId: data.document_id,
      knowledgeBaseId: data.knowledge_base_id,
      chunkIndex: data.chunk_index,
      content: data.content,
      embedding: data.embedding,
      metadata: data.metadata,
      createdAt: new Date(data.created_at),
    };
  }

  private mapWhatsAppKBMapping(data: any): WhatsAppKBMapping {
    return {
      id: data.id,
      tenantId: data.tenant_id,
      whatsappConnectionId: data.whatsapp_connection_id,
      knowledgeBaseId: data.knowledge_base_id,
      isDefault: data.is_default,
      priority: data.priority,
      createdAt: new Date(data.created_at),
    };
  }
}

export const knowledgeService = new KnowledgeService();
