/**
 * SentinelGrid Offline Emergency Knowledge & RAG Type Definitions
 * Phase 8: Offline Emergency Knowledge Base + Deterministic Local RAG
 * Designed for zero-network, local decision support.
 */

export type KnowledgeCategory =
  | 'MEDICAL_EMERGENCY'
  | 'TRAUMA_BLEEDING'
  | 'BURNS'
  | 'FRACTURES_DISLOCATION'
  | 'UNCONSCIOUSNESS'
  | 'RESPIRATORY_DISTRESS'
  | 'CARDIAC_CHEST_PAIN'
  | 'SEIZURES'
  | 'ENVIRONMENTAL_HEAT'
  | 'ENVIRONMENTAL_COLD'
  | 'DEHYDRATION_SHOCK'
  | 'NATURAL_FLOOD'
  | 'NATURAL_FIRE'
  | 'STRUCTURAL_COLLAPSE'
  | 'LANDSLIDE'
  | 'HAZMAT_CHEMICAL'
  | 'ELECTRICAL_HAZARDS'
  | 'EVACUATION_SHELTER'
  | 'SEARCH_AND_RESCUE'
  | 'CROWD_SAFETY'
  | 'EMERGENCY_COMMUNICATIONS'
  | 'RESPONDER_SAFETY'
  | 'HAZARD_ZONE_PRECAUTIONS'
  // Legacy compatibility
  | 'FIRST_AID'
  | 'TRIAGE_PROTOCOLS'
  | 'HAZMAT'
  | 'SHELTER_SPECS'
  | 'COMMUNICATION_CODES';

export type KnowledgeStatus = 'ACTIVE' | 'INACTIVE' | 'ARCHIVED' | 'DRAFT' | 'INDEXED' | 'PENDING';

export type ProvenanceType = 'LOCAL_DEMONSTRATION' | 'AUTHORITATIVE_EXTERNAL';

export interface KnowledgeDocumentVersion {
  version: string;
  modifiedAt: string;
  modifiedBy: string;
  changeLog: string;
  contentSnippet?: string;
}

export interface KnowledgeDocument {
  id: string;
  title: string;
  category: KnowledgeCategory | string;
  subcategory?: string;
  version: string;
  source: string;
  sourceOrganization?: string;
  provenanceType?: ProvenanceType;
  publicationDate?: string;
  lastReviewed?: string;
  expirationDate?: string;
  isOutdated?: boolean;
  summary: string;
  content: string;
  keywords?: string[];
  tags?: string[];
  hazards?: string[];
  severityLevels?: string[];
  applicableIncidentTypes?: string[];
  priority?: number; // 1 (lowest) to 10 (highest priority)
  status: KnowledgeStatus;
  actionSteps?: string[];
  safetyPrecautions?: string[];
  contraindications?: string[];
  versionHistory?: KnowledgeDocumentVersion[];
  fullTextPath?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface KnowledgeCorpusMetadata {
  corpusId: string;
  name: string;
  version: string;
  description: string;
  lastUpdated: string;
  totalDocuments: number;
  activeDocuments: number;
  categoriesCount: number;
  isOffline: true;
  provenanceStatement: string;
  medicalSafetyNotice: string;
}

export interface RetrievalScoreBreakdown {
  keywordScore: number;
  categoryScore: number;
  hazardScore: number;
  incidentTypeScore: number;
  severityScore: number;
  tagScore: number;
  outdatedPenalty: number;
  totalScore: number;
}

export interface RetrievedEvidenceItem {
  documentId: string;
  title: string;
  category: string;
  version: string;
  source: string;
  sourceOrganization: string;
  provenanceType: ProvenanceType;
  lastReviewed: string;
  isOutdated: boolean;
  relevanceScore: number;
  scoreBreakdown: RetrievalScoreBreakdown;
  matchReasons: string[];
  matchedKeywords: string[];
  relevantSnippet: string;
  actionSteps: string[];
  safetyPrecautions: string[];
  contraindications?: string[];
}

export interface RAGRecommendation {
  id: string;
  action: string;
  rationale: string;
  sourceDocumentId: string;
  sourceDocumentTitle: string;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  requiresHumanReview: boolean;
  category: string;
}

export type RAGQueryResultStatus = 
  | 'SUCCESS' 
  | 'INSUFFICIENT_LOCAL_EVIDENCE' 
  | 'CONFLICTING_KNOWLEDGE';

export interface RAGQueryResult {
  queryId: string;
  incidentId?: string;
  query: string;
  corpusVersion: string;
  corpusName: string;
  status: RAGQueryResultStatus;
  
  // Retrieved evidence with complete traceability
  retrievedDocuments: RetrievedEvidenceItem[];
  
  // Synthesized operational guidance
  evidenceSummary: string;
  recommendations: RAGRecommendation[];
  safetyWarnings: string[];
  actionChecklist: string[];
  contraindications: string[];
  missingContextWarnings: string[];

  // Conflict handling
  hasConflicts: boolean;
  conflictingDetails?: {
    conflictingDocuments: string[];
    description: string;
  } | null;

  // Confidence and human gate separation
  retrievalConfidence: 'HIGH' | 'MEDIUM' | 'LOW';
  aiTriageConfidence?: number | null;
  incidentVerificationStatus?: string | null;
  requiresHumanReview: boolean;
  humanReviewReasons: string[];

  // Safety & Provenance
  medicalDisclaimer: string;
  isOffline: true;
  generatedAt: string;
  diagnostics: {
    executionTimeMs: number;
    documentsEvaluated: number;
    documentsMatched: number;
    topScore: number;
  };
}

export interface RAGQueryInput {
  incidentId?: string;
  incidentNumber?: string;
  query?: string;
  category?: string;
  severity?: string;
  hazards?: string[];
  symptomsOrConditions?: string[];
  urgency?: string;
  locationAddress?: string;
  maxResults?: number;
  includeInactive?: boolean;
}
