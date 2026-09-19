import { ServiceModuleInfo } from './aiTriageService.ts';

/**
 * Local RAG / Emergency Knowledge Base Service (Architectural Placeholder - Phase 4)
 * Local vector store or BM25 keyword index for emergency field manuals, triage protocols,
 * and hazardous materials guides without internet access.
 */
export class RAGKnowledgeService {
  public getInfo(): ServiceModuleInfo {
    return {
      moduleName: 'Local Emergency Knowledge / RAG Engine',
      phasePlanned: 4,
      isImplemented: false,
      statusText: 'Not configured — Coming in Phase 4',
      description: 'Local vector database and semantic search for emergency guidelines, HazMat containment guides, and first aid procedures.',
      offlineCapability: 'Runs locally on disk with embedded vector embeddings or full-text SQLite indexing.'
    };
  }

  public getDocuments() {
    return [];
  }
}

export const ragKnowledgeService = new RAGKnowledgeService();
