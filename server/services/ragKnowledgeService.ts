import { db } from '../db/database.ts';
import {
  KnowledgeDocument,
  KnowledgeCorpusMetadata,
  KnowledgeDocumentVersion,
  KnowledgeCategory,
  KnowledgeStatus,
  RAGQueryInput,
  RAGQueryResult
} from '../knowledge/types.ts';
import { CORPUS_METADATA, DEFAULT_KNOWLEDGE_CORPUS } from '../knowledge/defaultCorpus.ts';
import { ragEngine } from '../knowledge/ragEngine.ts';
import { localRetrievalEngine } from '../knowledge/retrievalEngine.ts';
import { ServiceModuleInfo } from './aiTriageService.ts';

export class RAGKnowledgeService {
  /**
   * Returns subsystem capability information and diagnostics.
   */
  public getInfo(): ServiceModuleInfo {
    const docs = this.getDocuments();
    const activeCount = docs.filter(d => d.status === 'ACTIVE').length;

    return {
      moduleName: 'Offline Emergency Knowledge Base & Local RAG',
      phasePlanned: 8,
      isImplemented: true,
      statusText: `Operational — Local Emergency Corpus v${CORPUS_METADATA.version} (${activeCount}/${docs.length} active documents). Zero-cloud deterministic lexical retrieval & evidence-grounded decision support.`,
      description: 'Zero-cloud offline emergency field manuals, MCI triage standards, HazMat containment guides, and deterministic evidence-backed retrieval.',
      offlineCapability: '100% offline-first. Runs deterministically on local JSON database with no internet, no external vector cloud, and no external AI dependencies.'
    };
  }

  /**
   * Returns corpus metadata and status.
   */
  public getCorpusMetadata(): KnowledgeCorpusMetadata {
    const docs = this.getDocuments();
    const activeCount = docs.filter(d => d.status === 'ACTIVE').length;
    const categories = new Set(docs.map(d => d.category));

    return {
      ...CORPUS_METADATA,
      totalDocuments: docs.length,
      activeDocuments: activeCount,
      categoriesCount: categories.size,
      lastUpdated: new Date().toISOString()
    };
  }

  /**
   * Returns all documents in the knowledge base.
   */
  public getDocuments(filter?: {
    category?: string;
    hazard?: string;
    status?: string;
    search?: string;
  }): KnowledgeDocument[] {
    let docs = db.getKnowledgeDocuments();

    // If database is empty or not seeded yet, return default corpus
    if (!docs || docs.length === 0) {
      docs = DEFAULT_KNOWLEDGE_CORPUS;
    }

    if (!filter) return [...docs];

    return docs.filter(doc => {
      if (filter.status && filter.status !== 'ALL') {
        if (doc.status !== filter.status) return false;
      }
      if (filter.category && filter.category !== 'ALL') {
        if (doc.category !== filter.category) return false;
      }
      if (filter.hazard && filter.hazard !== 'ALL') {
        if (!doc.hazards || !doc.hazards.includes(filter.hazard)) return false;
      }
      if (filter.search && filter.search.trim()) {
        const query = filter.search.toLowerCase().trim();
        const matchesTitle = doc.title.toLowerCase().includes(query);
        const matchesSummary = (doc.summary || '').toLowerCase().includes(query);
        const matchesContent = doc.content.toLowerCase().includes(query);
        const matchesKeywords = (doc.keywords || []).some(k => k.toLowerCase().includes(query));
        const matchesTags = (doc.tags || []).some(t => t.toLowerCase().includes(query));
        const matchesId = doc.id.toLowerCase().includes(query);

        if (!matchesTitle && !matchesSummary && !matchesContent && !matchesKeywords && !matchesTags && !matchesId) {
          return false;
        }
      }
      return true;
    });
  }

  /**
   * Returns category breakdown with counts.
   */
  public getCategoriesWithCounts(): Array<{ category: string; count: number; activeCount: number }> {
    const docs = this.getDocuments();
    const map = new Map<string, { total: number; active: number }>();

    for (const doc of docs) {
      const cat = doc.category || 'OTHER';
      const current = map.get(cat) || { total: 0, active: 0 };
      current.total++;
      if (doc.status === 'ACTIVE') current.active++;
      map.set(cat, current);
    }

    return Array.from(map.entries()).map(([category, stats]) => ({
      category,
      count: stats.total,
      activeCount: stats.active
    })).sort((a, b) => b.count - a.count);
  }

  /**
   * Retrieves a single knowledge document by ID.
   */
  public getDocumentById(id: string): KnowledgeDocument | undefined {
    const docs = this.getDocuments();
    return docs.find(d => d.id === id || d.id.toUpperCase() === id.toUpperCase());
  }

  /**
   * Creates a new knowledge document (Requires ADMIN role).
   */
  public createDocument(
    doc: Omit<KnowledgeDocument, 'createdAt' | 'updatedAt'>,
    actor?: { userId?: string; role?: string; name?: string }
  ): KnowledgeDocument {
    db.assertOperational();

    // Check duplicate ID
    const existing = this.getDocumentById(doc.id);
    if (existing) {
      throw new Error(`Knowledge document with ID "${doc.id}" already exists.`);
    }

    const now = new Date().toISOString();
    const newDoc: KnowledgeDocument = {
      ...doc,
      version: doc.version || '1.0.0',
      status: doc.status || 'ACTIVE',
      provenanceType: doc.provenanceType || 'LOCAL_DEMONSTRATION',
      publicationDate: doc.publicationDate || now,
      lastReviewed: doc.lastReviewed || now,
      keywords: doc.keywords || [],
      tags: doc.tags || [],
      hazards: doc.hazards || [],
      severityLevels: doc.severityLevels || ['P2', 'HIGH'],
      applicableIncidentTypes: doc.applicableIncidentTypes || ['OTHER'],
      priority: doc.priority ?? 5,
      actionSteps: doc.actionSteps || [],
      safetyPrecautions: doc.safetyPrecautions || [],
      contraindications: doc.contraindications || [],
      versionHistory: doc.versionHistory || [
        {
          version: doc.version || '1.0.0',
          modifiedAt: now,
          modifiedBy: actor?.name || 'Administrator',
          changeLog: 'Initial document registration.'
        }
      ],
      createdAt: now,
      updatedAt: now
    };

    db.insertKnowledgeDocument(newDoc);

    db.logAudit({
      actorId: actor?.userId,
      actorRole: actor?.role,
      actorEmail: actor?.name,
      action: 'KNOWLEDGE_DOCUMENT_CREATED',
      entityType: 'KnowledgeDocument',
      entityId: newDoc.id,
      details: `Created knowledge document "${newDoc.title}" (${newDoc.id}) v${newDoc.version} in category ${newDoc.category}`
    });

    return newDoc;
  }

  /**
   * Updates an existing knowledge document (Requires ADMIN role).
   */
  public updateDocument(
    id: string,
    updates: Partial<KnowledgeDocument>,
    actor?: { userId?: string; role?: string; name?: string }
  ): KnowledgeDocument {
    db.assertOperational();

    const existing = this.getDocumentById(id);
    if (!existing) {
      throw new Error(`Knowledge document with ID "${id}" not found.`);
    }

    const now = new Date().toISOString();
    const updated: KnowledgeDocument = {
      ...existing,
      ...updates,
      id: existing.id, // Immutable ID
      updatedAt: now
    };

    db.updateKnowledgeDocument(id, updated);

    db.logAudit({
      actorId: actor?.userId,
      actorRole: actor?.role,
      actorEmail: actor?.name,
      action: 'KNOWLEDGE_DOCUMENT_UPDATED',
      entityType: 'KnowledgeDocument',
      entityId: updated.id,
      details: `Updated knowledge document "${updated.title}" (${updated.id})`
    });

    return updated;
  }

  /**
   * Publishes a new version of a knowledge document (Requires ADMIN role).
   */
  public publishNewVersion(
    id: string,
    newVersion: string,
    changeLog: string,
    updatedContent?: {
      title?: string;
      content?: string;
      summary?: string;
      actionSteps?: string[];
      safetyPrecautions?: string[];
      contraindications?: string[];
      lastReviewed?: string;
      isOutdated?: boolean;
    },
    actor?: { userId?: string; role?: string; name?: string }
  ): KnowledgeDocument {
    db.assertOperational();

    const existing = this.getDocumentById(id);
    if (!existing) {
      throw new Error(`Knowledge document with ID "${id}" not found.`);
    }

    const now = new Date().toISOString();
    const historyItem: KnowledgeDocumentVersion = {
      version: newVersion,
      modifiedAt: now,
      modifiedBy: actor?.name || 'Administrator',
      changeLog: changeLog || `Published version ${newVersion}`,
      contentSnippet: (updatedContent?.summary || existing.summary).slice(0, 150)
    };

    const updated: KnowledgeDocument = {
      ...existing,
      ...(updatedContent || {}),
      version: newVersion,
      lastReviewed: updatedContent?.lastReviewed || now,
      isOutdated: updatedContent?.isOutdated ?? false,
      versionHistory: [historyItem, ...(existing.versionHistory || [])],
      updatedAt: now
    };

    db.updateKnowledgeDocument(id, updated);

    db.logAudit({
      actorId: actor?.userId,
      actorRole: actor?.role,
      actorEmail: actor?.name,
      action: 'KNOWLEDGE_VERSION_PUBLISHED',
      entityType: 'KnowledgeDocument',
      entityId: updated.id,
      details: `Published new version v${newVersion} for document "${updated.title}" (${updated.id}): ${changeLog}`
    });

    return updated;
  }

  /**
   * Updates status of a document (ACTIVE / INACTIVE / ARCHIVED).
   */
  public setDocumentStatus(
    id: string,
    status: KnowledgeStatus,
    actor?: { userId?: string; role?: string; name?: string }
  ): KnowledgeDocument {
    db.assertOperational();

    const existing = this.getDocumentById(id);
    if (!existing) {
      throw new Error(`Knowledge document with ID "${id}" not found.`);
    }

    const updated = this.updateDocument(id, { status }, actor);

    db.logAudit({
      actorId: actor?.userId,
      actorRole: actor?.role,
      actorEmail: actor?.name,
      action: 'KNOWLEDGE_STATUS_CHANGED',
      entityType: 'KnowledgeDocument',
      entityId: id,
      details: `Changed document status for "${existing.title}" (${id}) to ${status}`
    });

    return updated;
  }

  /**
   * Executes deterministic RAG retrieval and synthesis for an incident or operational query.
   * Invariant: Does NOT mutate incidents, dispatches, or resources.
   */
  public queryRAG(input: RAGQueryInput, actor?: { userId?: string; role?: string; name?: string }): RAGQueryResult {
    const documents = this.getDocuments();

    // If an incidentId is provided, enrich input with structured incident data and triage context
    let context: {
      aiTriageConfidence?: number | null;
      incidentVerificationStatus?: string | null;
      requiresHumanReviewByTriage?: boolean;
    } = {};

    let enrichedInput = { ...input };

    if (input.incidentId) {
      const incident = db.findIncidentById(input.incidentId);
      if (incident) {
        enrichedInput.incidentNumber = incident.incidentNumber;
        enrichedInput.query = enrichedInput.query || `${incident.title}. ${incident.description}`;
        enrichedInput.severity = enrichedInput.severity || incident.severity;
        enrichedInput.locationAddress = enrichedInput.locationAddress || incident.location?.address;

        context.incidentVerificationStatus = incident.verificationStatus;

        // Fetch latest triage record for richer context
        const triage = db.getTriageForIncident(incident.id);
        if (triage) {
          enrichedInput.category = enrichedInput.category || triage.category;
          enrichedInput.hazards = Array.from(new Set([...(enrichedInput.hazards || []), ...(triage.hazards || [])]));
          enrichedInput.symptomsOrConditions = Array.from(
            new Set([...(enrichedInput.symptomsOrConditions || []), ...(triage.symptomsOrConditions || [])])
          );
          enrichedInput.urgency = enrichedInput.urgency || triage.urgency;
          context.aiTriageConfidence = triage.confidence;
          context.requiresHumanReviewByTriage = triage.requiresHumanReview;
        }
      }
    }

    const result = ragEngine.query(documents, enrichedInput, context);

    // Record non-authoritative read audit log
    if (actor?.userId) {
      db.logAudit({
        actorId: actor?.userId,
        actorRole: actor?.role,
        actorEmail: actor?.name,
        action: 'KNOWLEDGE_RAG_QUERIED',
        entityType: 'RAGQuery',
        entityId: result.queryId,
        details: `Queried RAG with status ${result.status} (${result.retrievedDocuments.length} docs retrieved, top score: ${result.diagnostics.topScore})`
      });
    }

    return result;
  }
}

export const ragKnowledgeService = new RAGKnowledgeService();
