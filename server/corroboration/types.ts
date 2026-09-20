import { UserRole } from '../db/schema.ts';

export type EvidenceType =
  | 'INCIDENT_REPORT'
  | 'SECONDARY_INCIDENT_REPORT'
  | 'MESH_OBSERVATION'
  | 'RESPONDER_CONFIRMATION'
  | 'RESPONDER_OBSERVATION'
  | 'RESOURCE_OBSERVATION'
  | 'GIS_LOCATION_CONSISTENCY'
  | 'TIME_CONSISTENCY'
  | 'AI_TRIAGE_EVIDENCE'
  | 'RAG_KNOWLEDGE_EVIDENCE';

export type CorroborationVerificationStatus =
  | 'REPORTED'
  | 'AI_TRIAGED'
  | 'CORROBORATED'
  | 'RESPONDER_VERIFIED'
  | 'CONFIRMED'
  | 'CONFLICTING'
  | 'UNVERIFIED'
  | 'DISPUTED';

export type EvidenceConflictType =
  | 'CATEGORY_CONFLICT'
  | 'SEVERITY_CONFLICT'
  | 'HAZARD_CONFLICT'
  | 'LOCATION_CONFLICT'
  | 'TIME_CONFLICT'
  | 'VICTIM_COUNT_CONFLICT'
  | 'STATUS_CONFLICT';

export interface StructuredFacts {
  category?: string | null;
  severity?: string | null;
  estimatedVictimCount?: number | null;
  verifiedVictimCount?: number | null;
  hazards?: string[];
  symptoms?: string[];
  locationText?: string;
  status?: string;
  isVerifiedVictimCount?: boolean;
  [key: string]: any;
}

export interface EvidenceItem {
  id: string;
  incidentId: string;
  type: EvidenceType;
  sourceId: string;
  sourceRole: UserRole | 'SYSTEM' | 'MESH_NODE' | 'PUBLIC_REPORTER';
  sourceDescription: string;
  timestamp: string;
  latitude?: number | null;
  longitude?: number | null;
  locationAccuracy?: number | null;
  content: string;
  structuredFacts?: StructuredFacts;
  severity?: string | null;
  victimCount?: number | null;
  hazards?: string[];
  category?: string | null;
  confidence: number;
  reliability: number;
  independenceGroup: string;
  isDirectEvidence: boolean;
  isDerivedEvidence: boolean;
  isConflict?: boolean;
  conflictsWith?: string[];
  fingerprint: string;
  isDuplicate?: boolean;
  createdAt: string;
  metadata?: Record<string, any>;
}

export interface EvidenceConflict {
  id: string;
  type: EvidenceConflictType;
  evidenceAId: string;
  evidenceBId: string;
  sourceA: string;
  sourceB: string;
  field: string;
  valueA: any;
  valueB: any;
  description: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
}

export interface CorroborationScoreBreakdown {
  sourceReliabilityScore: number;   // max 25
  directnessScore: number;         // max 15
  independenceScore: number;       // max 20
  locationConsistencyScore: number; // max 15
  timeConsistencyScore: number;     // max 10
  factConsistencyScore: number;     // max 15
  conflictPenalty: number;          // penalty up to -30
  totalScore: number;               // 0 to 100
}

export interface CorroborationResult {
  corroborationId: string;
  incidentId: string;
  verificationStatus: CorroborationVerificationStatus;
  corroborationScore: number; // 0-100
  evidenceStrength: 'STRONG' | 'MODERATE' | 'WEAK' | 'INSUFFICIENT';
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  independentSourceCount: number;
  totalEvidenceCount: number;

  supportingEvidence: EvidenceItem[];
  conflictingEvidence: EvidenceItem[];
  conflicts: EvidenceConflict[];

  scoreBreakdown: CorroborationScoreBreakdown;

  locationAssessment: {
    status: 'LOCATION_CONSISTENT' | 'LOCATION_PARTIALLY_CONSISTENT' | 'LOCATION_INCONSISTENT' | 'LOCATION_UNAVAILABLE';
    distanceMeters?: number | null;
    explanation: string;
  };

  timeAssessment: {
    status: 'TEMPORAL_CONSISTENT' | 'TEMPORAL_PARTIALLY_CONSISTENT' | 'TEMPORAL_MISMATCH' | 'TEMPORAL_UNAVAILABLE';
    timeDeltaMinutes?: number | null;
    explanation: string;
  };

  contentAssessment: {
    categoryConsensus?: string | null;
    severityConsensus?: string | null;
    hazardsConsensus?: string[];
    explanation: string;
  };

  victimCountAssessment: {
    estimatedConsensus?: number | null;
    verifiedCount?: number | null;
    hasConflict: boolean;
    explanation: string;
  };

  consensusFacts: Record<string, any>;
  disputedFacts: Record<string, any>;

  requiresHumanReview: boolean;
  humanReviewReasons: string[];

  reasoningSummary: string;
  supportingFactors: string[];
  limitingFactors: string[];
  generatedAt: string;
  disclaimer: string;
}
