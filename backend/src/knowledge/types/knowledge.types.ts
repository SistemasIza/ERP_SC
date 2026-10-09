/**
 * Knowledge Base Types
 * Types for RAG (Retrieval Augmented Generation) system
 */

export interface KnowledgeBase {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  embeddingModel: string;
  chunkSize: number;
  chunkOverlap: number;
  isActive: boolean;
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface KnowledgeDocument {
  id: string;
  knowledgeBaseId: string;
  title: string;
  content: string;
  contentType: string;
  sourceUrl?: string;
  fileName?: string;
  fileSize?: number;
  metadata: Record<string, any>;
  status: 'processing' | 'completed' | 'failed';
  errorMessage?: string;
  chunkCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface KnowledgeChunk {
  id: string;
  documentId: string;
  knowledgeBaseId: string;
  chunkIndex: number;
  content: string;
  embedding?: number[];
  metadata: Record<string, any>;
  createdAt: Date;
}

export interface WhatsAppKBMapping {
  id: string;
  tenantId: string;
  whatsappConnectionId?: string;
  knowledgeBaseId: string;
  isDefault: boolean;
  priority: number;
  createdAt: Date;
}

export interface RAGQueryHistory {
  id: string;
  tenantId: string;
  conversationId?: string;
  knowledgeBaseId: string;
  query: string;
  retrievedChunks: number;
  responseGenerated: boolean;
  latencyMs?: number;
  metadata: Record<string, any>;
  createdAt: Date;
}

export interface CreateKnowledgeBaseInput {
  tenantId: string;
  name: string;
  description?: string;
  embeddingModel?: string;
  chunkSize?: number;
  chunkOverlap?: number;
  metadata?: Record<string, any>;
}

export interface CreateDocumentInput {
  knowledgeBaseId: string;
  title: string;
  content: string;
  contentType?: string;
  sourceUrl?: string;
  fileName?: string;
  fileSize?: number;
  metadata?: Record<string, any>;
}

export interface SearchResult {
  chunk: KnowledgeChunk;
  document: KnowledgeDocument;
  similarity: number;
}

export interface RAGQueryOptions {
  knowledgeBaseId: string;
  query: string;
  topK?: number;
  minSimilarity?: number;
  conversationId?: string;
  metadata?: Record<string, any>;
}

export interface RAGResponse {
  query: string;
  context: string;
  sources: SearchResult[];
  knowledgeBaseId: string;
}
