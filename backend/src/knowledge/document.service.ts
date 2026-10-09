/**
 * Document Management Service for Knowledge Base
 * Handles document upload, processing, and management
 */

import { knowledgeService } from './knowledge.service';
import { supabase } from '../core/config/supabase';
import { CreateDocumentInput } from './types/knowledge.types';

export interface DocumentUploadResult {
  documentId: string;
  status: 'processing' | 'completed' | 'failed';
  message: string;
}

export interface DocumentProcessingOptions {
  chunkSize?: number;
  chunkOverlap?: number;
  extractMetadata?: boolean;
}

export class DocumentService {
  /**
   * Upload and process a text document
   */
  async uploadTextDocument(
    knowledgeBaseId: string,
    title: string,
    content: string,
    options?: DocumentProcessingOptions
  ): Promise<DocumentUploadResult> {
    try {
      const document = await knowledgeService.addDocument({
        knowledgeBaseId,
        title,
        content,
        contentType: 'text/plain',
        metadata: options ? { processingOptions: options } : {},
      });

      return {
        documentId: document.id,
        status: document.status as any,
        message: 'Document uploaded and processing started',
      };
    } catch (error) {
      return {
        documentId: '',
        status: 'failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Upload and process a URL (fetch content and add to KB)
   */
  async uploadUrlDocument(
    knowledgeBaseId: string,
    url: string,
    options?: DocumentProcessingOptions
  ): Promise<DocumentUploadResult> {
    try {
      // Fetch content from URL
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch URL: ${response.statusText}`);
      }

      const content = await response.text();
      const title = this.extractTitleFromUrl(url) || 'Web Document';

      const document = await knowledgeService.addDocument({
        knowledgeBaseId,
        title,
        content,
        contentType: 'text/html',
        sourceUrl: url,
        metadata: options ? { processingOptions: options } : {},
      });

      return {
        documentId: document.id,
        status: document.status as any,
        message: 'URL content uploaded and processing started',
      };
    } catch (error) {
      return {
        documentId: '',
        status: 'failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Upload a file (PDF, DOCX, etc.) - placeholder for future implementation
   */
  async uploadFileDocument(
    knowledgeBaseId: string,
    file: File,
    options?: DocumentProcessingOptions
  ): Promise<DocumentUploadResult> {
    try {
      // This is a placeholder - actual implementation would depend on file type
      // For now, we'll assume text-based files
      
      const content = await file.text();
      const document = await knowledgeService.addDocument({
        knowledgeBaseId,
        title: file.name,
        content,
        contentType: file.type || 'text/plain',
        fileName: file.name,
        fileSize: file.size,
        metadata: options ? { processingOptions: options } : {},
      });

      return {
        documentId: document.id,
        status: document.status as any,
        message: 'File uploaded and processing started',
      };
    } catch (error) {
      return {
        documentId: '',
        status: 'failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get documents for a knowledge base
   */
  async getKnowledgeBaseDocuments(knowledgeBaseId: string): Promise<any[]> {
    const { data, error } = await supabase
      .from('knowledge_documents')
      .select('*')
      .eq('knowledge_base_id', knowledgeBaseId)
      .order('created_at', { ascending: false });

    if (error) throw new Error(`Error fetching documents: ${error.message}`);
    return data || [];
  }

  /**
   * Get document by ID
   */
  async getDocument(documentId: string): Promise<any | null> {
    const { data, error } = await supabase
      .from('knowledge_documents')
      .select('*')
      .eq('id', documentId)
      .single();

    if (error) return null;
    return data;
  }

  /**
   * Delete a document
   */
  async deleteDocument(documentId: string): Promise<boolean> {
    try {
      // Chunks will be deleted automatically due to CASCADE
      const { error } = await supabase
        .from('knowledge_documents')
        .delete()
        .eq('id', documentId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error deleting document:', error);
      return false;
    }
  }

  /**
   * Get document chunks
   */
  async getDocumentChunks(documentId: string): Promise<any[]> {
    const { data, error } = await supabase
      .from('knowledge_chunks')
      .select('*')
      .eq('document_id', documentId)
      .order('chunk_index', { ascending: true });

    if (error) throw new Error(`Error fetching chunks: ${error.message}`);
    return data || [];
  }

  /**
   * Re-process a document (re-chunk and re-embed)
   */
  async reprocessDocument(documentId: string): Promise<boolean> {
    try {
      const document = await this.getDocument(documentId);
      if (!document) return false;

      // Delete existing chunks
      await supabase
        .from('knowledge_chunks')
        .delete()
        .eq('document_id', documentId);

      // Re-add document (will trigger processing)
      await knowledgeService.addDocument({
        knowledgeBaseId: document.knowledge_base_id,
        title: document.title,
        content: document.content,
        contentType: document.content_type,
        sourceUrl: document.source_url,
        fileName: document.file_name,
        fileSize: document.file_size,
        metadata: document.metadata,
      });

      return true;
    } catch (error) {
      console.error('Error reprocessing document:', error);
      return false;
    }
  }

  /**
   * Bulk upload documents
   */
  async bulkUploadDocuments(
    knowledgeBaseId: string,
    documents: Array<{ title: string; content: string; sourceUrl?: string }>,
    options?: DocumentProcessingOptions
  ): Promise<DocumentUploadResult[]> {
    const results: DocumentUploadResult[] = [];

    for (const doc of documents) {
      const result = await this.uploadTextDocument(
        knowledgeBaseId,
        doc.title,
        doc.content,
        options
      );
      results.push(result);
    }

    return results;
  }

  /**
   * Extract title from URL
   */
  private extractTitleFromUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      const pathParts = urlObj.pathname.split('/').filter(Boolean);
      const lastPart = pathParts[pathParts.length - 1];
      return lastPart || urlObj.hostname;
    } catch {
      return 'Web Document';
    }
  }

  /**
   * Get document statistics
   */
  async getDocumentStats(documentId: string): Promise<any> {
    const document = await this.getDocument(documentId);
    if (!document) return null;

    const chunks = await this.getDocumentChunks(documentId);

    return {
      documentId: document.id,
      title: document.title,
      status: document.status,
      chunkCount: chunks.length,
      totalCharacters: document.content.length,
      createdAt: document.created_at,
      updatedAt: document.updated_at,
    };
  }
}

export const documentService = new DocumentService();
