/**
 * Knowledge Module Index
 * Exports all knowledge retrieval services and routes
 */

export { knowledgeService } from './knowledge.service';
export { documentService } from './document.service';
export { executeRAGNode, ragNodeDefinition } from '../automation/nodes/knowledge/rag.node';

export * from './types/knowledge.types';
export { default as knowledgeRoutes } from './routes';
