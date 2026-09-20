export type UserRole = 'ADMIN' | 'DISPATCHER' | 'RESPONDER' | 'OPERATOR';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  badgeNumber?: string;
  department?: string;
  createdAt: string;
}

export type IncidentStatus = 'OPEN' | 'INVESTIGATING' | 'DISPATCHED' | 'CONTAINED' | 'RESOLVED';
export type IncidentSeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFORMATIONAL';
export type IncidentVerification = 'UNVERIFIED' | 'COMMUNITY_REPORTED' | 'OFFICIAL_VERIFIED' | 'FALSE_ALARM';

export interface IncidentLocation {
  id: string;
  latitude?: number | null;
  longitude?: number | null;
  address?: string;
  zone?: string;
  gridSquare?: string;
  isUnavailable?: boolean;
}

export interface Incident {
  id: string;
  incidentNumber: string;
  title: string;
  description: string;
  status: IncidentStatus;
  severity: IncidentSeverity;
  verificationStatus: IncidentVerification;
  location?: IncidentLocation;
  reportedByName?: string;
  priorityScore: number;
  isDemoData?: boolean;
  createdAt: string;
  updatedAt: string;
}

export type ResourceType = 
  | 'AMBULANCE' 
  | 'MEDICAL_TEAM' 
  | 'FIRE_UNIT' 
  | 'RESCUE_TEAM' 
  | 'HAZMAT_UNIT' 
  | 'SEARCH_TEAM' 
  | 'EVACUATION_UNIT' 
  | 'SHELTER' 
  | 'SUPPLY_UNIT' 
  | 'EMERGENCY_EQUIPMENT' 
  | 'OTHER';

export type ResourceStatus = 'AVAILABLE' | 'ASSIGNED' | 'EN_ROUTE' | 'ON_SCENE' | 'UNAVAILABLE';

export type ResourceCapability = 
  | 'MEDICAL' 
  | 'FIRE' 
  | 'RESCUE' 
  | 'HAZMAT' 
  | 'SEARCH' 
  | 'EVACUATION' 
  | 'SHELTER' 
  | 'SUPPLIES' 
  | 'OTHER';

export type ResourceAvailability = 'AVAILABLE' | 'DEPLOYED' | 'MAINTENANCE' | 'OFFLINE' | ResourceStatus;

export interface Resource {
  id: string;
  resourceCode?: string;
  name: string;
  type: ResourceType;
  capabilities?: ResourceCapability[];
  status?: ResourceStatus;
  availability: ResourceAvailability;
  latitude?: number | null;
  longitude?: number | null;
  location: string;
  capacity?: string | null;
  patientCapacity?: number | null;
  criticalCareCapacity?: number | null;
  teamSize?: number | null;
  occupantCapacity?: number | null;
  supplyCapacity?: number | null;
  statusDetails?: string;
  currentIncidentId?: string | null;
  assignedIncidentId?: string | null;
  assignedIncidentNumber?: string | null;
  metadata?: Record<string, any>;
  isDemoData?: boolean;
  createdAt: string;
  updatedAt: string;
}

export type RouteFeasibility = 
  | 'REACHABLE' 
  | 'REACHABLE_WITH_HAZARD_WARNING' 
  | 'NO_SAFE_ROUTE' 
  | 'LOCATION_UNAVAILABLE' 
  | 'OUTSIDE_OFFLINE_MAP';

export interface MatchingFactors {
  capabilityScore: number;
  availabilityScore: number;
  distanceScore: number;
  routeSafetyScore: number;
  severityFitScore: number;
  hazardCompatibilityScore: number;
  capacityScore: number;
}

export interface ResourceMatchRecommendation {
  resourceId: string;
  resourceCode: string;
  name: string;
  type: ResourceType;
  status: ResourceStatus;
  capabilities: ResourceCapability[];
  latitude: number | null;
  longitude: number | null;
  location?: string;
  capacity?: string | null;
  patientCapacity?: number | null;
  criticalCareCapacity?: number | null;
  teamSize?: number | null;
  occupantCapacity?: number | null;
  supplyCapacity?: number | null;
  capacityStatus?: 'SUFFICIENT' | 'PARTIAL' | 'INSUFFICIENT' | 'NOT_EVALUATED';
  capacityReason?: string;
  currentIncidentId?: string | null;
  
  matchScore: number;
  recommendedMatch: boolean;
  matchingFactors: MatchingFactors;
  factors?: MatchingFactors;
  
  straightLineDistanceKm: number | null;
  routeFeasibility: RouteFeasibility;
  routeInfo?: {
    routeStatus: string;
    distanceMeters: number;
    travelTimeSeconds: number;
    hazardPenalty: number;
    avoidedHazards: number;
    blockedEdgesAvoided: number;
    explanation: string;
  } | null;
  
  reasons: string[];
  warnings: string[];
}

export interface IncidentResourceMatchingResult {
  incidentId: string;
  incidentNumber: string;
  incidentTitle: string;
  requiredCapabilities: ResourceCapability[];
  extractedRequirements: {
    category?: string;
    severity?: string;
    urgency?: string;
    hazards?: string[];
    estimatedVictimCount?: number | null;
    hasLocation: boolean;
  };
  matches: ResourceMatchRecommendation[];
  evaluatedAt: string;
}

export interface SystemSubsystem {
  id: string;
  name: string;
  state: 'OPERATIONAL' | 'NOT_CONFIGURED' | 'SIMULATION_NOT_STARTED' | 'DEGRADED';
  stateLabel: string;
  badgeType: 'success' | 'warning' | 'neutral';
  phase: number;
  details: string;
  offlineCapable: boolean;
}

export interface SystemStatusData {
  systemMode: string;
  platform: string;
  zeroCloudCompliance: boolean;
  timestamp: string;
  subsystems: SystemSubsystem[];
  counts: {
    activeIncidents: number;
    criticalIncidents: number;
    connectedMeshNodes: number;
    availableResponders: number;
    availableResources: number;
    pendingDispatches: number;
  };
}

export type NodeType = 'COMMAND' | 'RELAY' | 'RESPONDER' | 'FIELD';
export type NodeOperationalStatus = 'ONLINE' | 'OFFLINE';

export interface SimulatedMeshNode {
  id: string;
  nodeId: string;
  nodeName: string;
  nodeType: NodeType;
  status: NodeOperationalStatus;
  latitude: number | null;
  longitude: number | null;
  batteryLevel: number;
  signalQuality: number;
  lastSeen: string;
  neighbors: string[];
  createdAt: string;
  updatedAt: string;
}

export type MeshPacketType = 
  | 'INCIDENT_REPORT' 
  | 'STATUS_UPDATE' 
  | 'RESOURCE_REQUEST' 
  | 'EMERGENCY_BROADCAST' 
  | 'EMERGENCY_ALERT'
  | 'TELEMETRY_PING'
  | 'ACK';

export type MeshPacketStatus = 
  | 'QUEUED'
  | 'IN_TRANSIT'
  | 'DELIVERED'
  | 'ACKNOWLEDGED'
  | 'TTL_EXPIRED'
  | 'MAX_HOPS_EXCEEDED'
  | 'DROPPED'
  | 'DUPLICATE_DROPPED';

export interface MeshPacketPayload {
  incidentId?: string;
  incidentNumber?: string;
  title?: string;
  severity?: IncidentSeverity;
  category?: string;
  victimCount?: number;
  hazardInfo?: string;
  locationText?: string;
  latitude?: number | null;
  longitude?: number | null;
  summary?: string;
  rawText?: string;
  message?: string;
  item?: string;
  [key: string]: any;
}

export interface SimulatedMeshPacket {
  packetId: string;
  messageType: MeshPacketType;
  sourceNodeId: string;
  destinationNodeId: string;
  incidentId?: string;
  incidentNumber?: string;
  createdAt: string;
  ttl: number;
  initialTtl: number;
  hopCount: number;
  payload: MeshPacketPayload;
  status: MeshPacketStatus;
  path: string[];
  duplicateCount: number;
  ackRequested: boolean;
  ackReceived: boolean;
  ackPacketId?: string;
  firstSentAt?: string;
  deliveredAt?: string;
  acknowledgedAt?: string;
  latencyMs?: number;
  totalLatencyMs?: number;
  lossSimulated?: boolean;
  dropReason?: string;
}

export type MeshEventType = 
  | 'PACKET_CREATED'
  | 'PACKET_RECEIVED'
  | 'PACKET_FORWARDED'
  | 'PACKET_DROPPED'
  | 'DUPLICATE_DROPPED'
  | 'TTL_EXPIRED'
  | 'MAX_HOPS_EXCEEDED'
  | 'PACKET_DELIVERED'
  | 'ACK_CREATED'
  | 'ACK_FORWARDED'
  | 'ACK_RECEIVED'
  | 'ACK_FAILED'
  | 'ACK_LOST'
  | 'NODE_OFFLINE';

export interface SimulatedMeshEvent {
  eventId: string;
  timestamp: string;
  packetId: string;
  nodeId: string;
  eventType: MeshEventType;
  message: string;
  details?: Record<string, any>;
}

export interface MeshSimulationConfig {
  packetLossRate: number;
  ackPacketLossRate?: number;
  minimumLatencyMs: number;
  maximumLatencyMs: number;
  initialTtl: number;
  maxHops: number;
  autoAck: boolean;
  deterministicMode?: boolean;
}

export interface MeshMetricsData {
  meshStatus: string;
  isSimulation: true;
  totalTransmitted: number;
  totalDelivered: number;
  totalAcknowledged: number;
  totalDropped: number;
  totalDuplicates: number;
  totalEvents: number;
  packetDeliveryRate: string;
  packetLossRate: string;
  averageHopCount: string;
  averageLatencyMs: string;
  duplicateRate: string;
  ackSuccessRate: string;
  activeNodeCount: number;
  totalNodeCount: number;
  notice: string;
}

export type NavTab = 
  | 'dashboard'
  | 'incidents'
  | 'dispatch'
  | 'mesh'
  | 'resources'
  | 'map'
  | 'knowledge'
  | 'analytics'
  | 'settings';

// Phase 3: AI-Assisted Incident Triage Types
export type TriageCategory = 
  | 'MEDICAL'
  | 'FIRE'
  | 'FLOOD'
  | 'EARTHQUAKE'
  | 'LANDSLIDE'
  | 'ROAD_ACCIDENT'
  | 'STRUCTURAL_COLLAPSE'
  | 'HAZMAT'
  | 'MISSING_PERSON'
  | 'SECURITY'
  | 'OTHER'
  | 'UNKNOWN';

export type TriageSeverity = 'P1' | 'P2' | 'P3' | 'P4' | 'UNKNOWN';

export type TriageUrgency = 'IMMEDIATE' | 'URGENT' | 'SOON' | 'ROUTINE' | 'UNKNOWN';

export interface AIIncidentTriageRecord {
  id: string;
  incidentId: string;
  incidentNumber?: string;
  category: TriageCategory;
  severity: TriageSeverity;
  estimatedVictimCount: number | null;
  verifiedVictimCount: number | null;
  hazards: string[];
  symptomsOrConditions: string[];
  urgency: TriageUrgency;
  locationClues: string[];
  confidence: number;
  requiresHumanReview: boolean;
  reasoningSummary: string;
  provider: string;
  providerVersion: string;
  sourceTextHash: string;
  createdAt: string;
  requestedByUserId?: string;
  requestedByName?: string;
}

export interface AIProviderInfo {
  providerId: string;
  displayName: string;
  providerVersion: string;
  isConfigured: boolean;
  statusMessage: string;
  requiresInternet: boolean;
  localCompatible: boolean;
  isOffline: boolean;
  modelIdentifier?: string;
}

// Phase 6: Dispatch & Responder Workflow
export type DispatchStatus =
  | 'PENDING'
  | 'DISPATCHED'
  | 'ACKNOWLEDGED'
  | 'EN_ROUTE'
  | 'ARRIVED'
  | 'ON_SCENE'
  | 'COMPLETED'
  | 'DECLINED'
  | 'CANCELLED';

export interface DispatchReassignment {
  previousResourceId: string;
  newResourceId: string;
  reason: string;
  timestamp: string;
  actorId: string;
  actorName: string;
}

export interface Dispatch {
  dispatchId: string;
  incidentId: string;
  incidentNumber: string;
  resourceId: string;
  status: DispatchStatus;
  priority: string;
  dispatchNotes?: string;
  routeInfo?: any;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  
  acknowledgementTimestamp?: string;
  enRouteTimestamp?: string;
  arrivedTimestamp?: string;
  onSceneTimestamp?: string;
  completedTimestamp?: string;
  
  declinedTimestamp?: string;
  declineReason?: string;
  
  cancelledTimestamp?: string;
  cancellationReason?: string;
  
  reassignmentHistory?: DispatchReassignment[];
  verifiedVictimCount?: number | null;
  completionNotes?: string | null;
}

// Phase 8: Emergency Knowledge Base & Local RAG Types
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
  priority?: number;
  status: KnowledgeStatus;
  actionSteps?: string[];
  safetyPrecautions?: string[];
  contraindications?: string[];
  versionHistory?: KnowledgeDocumentVersion[];
  fullTextPath?: string;
  createdAt: string;
  updatedAt?: string;
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
  sourceOrganization?: string;
  provenanceType: ProvenanceType;
  lastReviewed?: string;
  isOutdated?: boolean;
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
  category?: string;
}

export interface RAGQueryResult {
  queryId: string;
  incidentId?: string;
  query: string;
  corpusVersion: string;
  corpusName: string;
  status: 'SUCCESS' | 'INSUFFICIENT_LOCAL_EVIDENCE' | 'CONFLICTING_KNOWLEDGE' | 'ERROR';
  retrievedDocuments: RetrievedEvidenceItem[];
  evidenceSummary: string;
  recommendations: RAGRecommendation[];
  safetyWarnings: string[];
  actionChecklist: string[];
  contraindications: string[];
  missingContextWarnings: string[];
  hasConflicts: boolean;
  conflictingDetails: { conflictingDocuments: string[]; description: string } | null;
  retrievalConfidence: 'HIGH' | 'MEDIUM' | 'LOW';
  aiTriageConfidence: number | null;
  incidentVerificationStatus: string | null;
  requiresHumanReview: boolean;
  humanReviewReasons: string[];
  medicalDisclaimer: string;
  isOffline: boolean;
  generatedAt: string;
  diagnostics: {
    executionTimeMs: number;
    documentsEvaluated: number;
    documentsMatched: number;
    topScore: number;
  };
}

// Phase 9: Incident Corroboration & Evidence Fusion Types
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

