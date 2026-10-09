/**
 * RAG (Retrieval Augmented Generation) Node
 * Node for integrating knowledge retrieval with flow automation
 */

import { knowledgeService } from '../../../knowledge/knowledge.service';
import { supabase } from '../../../core/config/supabase';

export interface RAGNodeConfig {
  knowledgeBaseId?: string;
  useWhatsAppMapping?: boolean;
  topK?: number;
  minSimilarity?: number;
  promptTemplate?: string;
  includeSources?: boolean;
}

export interface RAGNodeInput {
  query: string;
  organizationId?: string;
  whatsappConnectionId?: string;
  conversationId?: string;
}

export interface RAGNodeOutput {
  context: string;
  sources: Array<{
    title: string;
    content: string;
    similarity: number;
  }>;
  query: string;
  knowledgeBaseId: string;
}

export async function executeRAGNode(
  config: RAGNodeConfig,
  input: RAGNodeInput
): Promise<RAGNodeOutput> {
  try {
    // Determine which knowledge base to use
    let knowledgeBaseId = config.knowledgeBaseId;

    if (config.useWhatsAppMapping && input.whatsappConnectionId) {
      // Get knowledge base mapped to WhatsApp connection
      const kb = await knowledgeService.getKBForWhatsAppConnection(input.whatsappConnectionId);
      if (kb) {
        knowledgeBaseId = kb.id;
      }
    }

    // Fallback to default knowledge base for organization
    if (!knowledgeBaseId && input.organizationId) {
      const defaultKb = await knowledgeService.getDefaultKB(input.organizationId);
      if (defaultKb) {
        knowledgeBaseId = defaultKb.id;
      }
    }

    if (!knowledgeBaseId) {
      throw new Error('No knowledge base configured for RAG node');
    }

    // Perform RAG query
    const ragResponse = await knowledgeService.ragQuery({
      knowledgeBaseId,
      query: input.query,
      topK: config.topK || 5,
      minSimilarity: config.minSimilarity || 0.7,
      conversationId: input.conversationId,
      metadata: {
        tenantId: input.organizationId,
      },
    });

    // Format sources
    const sources = ragResponse.sources.map(source => ({
      title: source.document.title,
      content: source.chunk.content,
      similarity: source.similarity,
    }));

    return {
      context: ragResponse.context,
      sources,
      query: ragResponse.query,
      knowledgeBaseId: ragResponse.knowledgeBaseId,
    };
  } catch (error) {
    console.error('[RAG Node] Error executing RAG query:', error);
    throw error;
  }
}

/**
 * RAG Node Definition for Flow Builder
 */
export const ragNodeDefinition = {
  type: 'knowledge_retrieval',
  name: 'Knowledge Retrieval',
  description: 'Retrieve relevant information from knowledge base using semantic search',
  icon: '📚',
  category: 'knowledge',
  
  inputs: {
    query: {
      type: 'string',
      description: 'Query to search in knowledge base',
      required: true,
    },
    organizationId: {
      type: 'string',
      description: 'Organization ID (optional, auto-detected from context)',
      required: false,
    },
    whatsappConnectionId: {
      type: 'string',
      description: 'WhatsApp connection ID for KB mapping',
      required: false,
    },
    conversationId: {
      type: 'string',
      description: 'Conversation ID for analytics',
      required: false,
    },
  },

  outputs: {
    context: {
      type: 'string',
      description: 'Retrieved context from knowledge base',
    },
    sources: {
      type: 'array',
      description: 'Array of source documents with similarity scores',
    },
    query: {
      type: 'string',
      description: 'Original query',
    },
    knowledgeBaseId: {
      type: 'string',
      description: 'Knowledge base used for retrieval',
    },
  },

  config: {
    knowledgeBaseId: {
      type: 'string',
      description: 'Specific knowledge base ID (optional)',
      required: false,
    },
    useWhatsAppMapping: {
      type: 'boolean',
      description: 'Use WhatsApp connection to KB mapping',
      default: true,
    },
    topK: {
      type: 'number',
      description: 'Number of results to retrieve',
      default: 5,
    },
    minSimilarity: {
      type: 'number',
      description: 'Minimum similarity threshold (0-1)',
      default: 0.7,
    },
    includeSources: {
      type: 'boolean',
      description: 'Include source information in output',
      default: true,
    },
  },
};
