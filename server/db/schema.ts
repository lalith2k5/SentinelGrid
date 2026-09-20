/**
 * SentinelGrid Database Schema & Entity Definitions
 * Phase 1: Local Offline Foundation
 * Designed for local zero-cloud execution (Mac M2, Linux, etc.)
 */

export type UserRole = 'ADMIN' | 'DISPATCHER' | 'RESPONDER' | 'OPERATOR';

export interface User {
  id: string;
  email: string;
  passwordHash: string;
  salt: string;
  name: string;
  role: UserRole;
  badgeNumber?: string;
  department?: string;
  disabled?: boolean;
  createdAt: string;
  updatedAt: string;
}

export type IncidentStatus = 'OPEN' | 'INVESTIGATING' | 'DISPATCHED' | 'CONTAINED' | 'RESOLVED';
export type IncidentSeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFORMATIONAL';
export type IncidentVerification = 'UNVERIFIED' | 'COMMUNITY_REPORTED' | 'OFFICIAL_VERIFIED' | 'FALSE_ALARM';

export interface IncidentLocation {
  id: string;
  incidentId?: string;
  latitude?: number | null;
  longitude?: number | null;
  address?: string;
  landmark?: string;
  zone?: string;
  gridSquare?: string;
  accuracyMeters?: number;
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
  locationId?: string;
  location?: IncidentLocation;
  reportedByUserId?: string;
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

export type ResponderStatus = 'STANDBY' | 'DISPATCHED' | 'EN_ROUTE' | 'ON_SCENE' | 'OFF_DUTY';

export interface Responder {
  id: string;
  userId?: string;
  callsign: string;
  name: string;
  role: string;
  status: ResponderStatus;
  assignedResourceId?: string;
  currentGrid?: string;
  lastCheckIn?: string;
  createdAt: string;
  updatedAt: string;
}

export type MessageChannel = 'BROADCAST' | 'COMMAND' | 'TACTICAL' | 'MESH_RELAY';
export type MessageDeliveryStatus = 'PENDING' | 'RELAYED' | 'DELIVERED' | 'FAILED';

export interface Message {
  id: string;
  senderId: string;
  senderCallsign: string;
  recipientId?: string;
  channel: MessageChannel;
  content: string;
  hopCount: number;
  isMeshRelay: boolean;
  timestamp: string;
  deliveryStatus: MessageDeliveryStatus;
}

export type MeshHardwareType = 'LORA_V3' | 'T_BEAM' | 'HELTEC' | 'SIMULATED';
export type MeshNodeRole = 'ROUTER' | 'CLIENT' | 'REPEATER';
export type MeshNodeStatus = 'ONLINE' | 'OFFLINE' | 'DEGRADED';

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

export interface MeshNode {
  id: string;
  nodeId: string;
  callsign?: string;
  hardwareType: MeshHardwareType;
  role: MeshNodeRole;
  batteryPercentage?: number;
  snr?: number;
  rssi?: number;
  lastHeard?: string;
  status: MeshNodeStatus;
  createdAt: string;
}

export type KnowledgeCategory = 'FIRST_AID' | 'TRIAGE_PROTOCOLS' | 'HAZMAT' | 'SHELTER_SPECS' | 'COMMUNICATION_CODES';
export type KnowledgeStatus = 'INDEXED' | 'PENDING' | 'DRAFT';

export interface KnowledgeDocument {
  id: string;
  title: string;
  category: KnowledgeCategory;
  version: string;
  source: string;
  summary: string;
  fullTextPath?: string;
  status: KnowledgeStatus;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  actorId?: string;
  actorEmail?: string;
  actorRole?: string;
  action: string;
  entityType: string;
  entityId?: string;
  details?: string;
  ipAddress?: string;
  timestamp: string;
}

// Phase 3: Local AI Triage Types
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

export interface AIIncidentTriageInput {
  incidentId?: string;
  incidentNumber?: string;
  title: string;
  description: string;
  reportedVictimCount?: number | null;
  verifiedVictimCount?: number | null;
  hazards?: string[];
  locationAddress?: string;
  landmark?: string;
  zone?: string;
  gridSquare?: string;
  latitude?: number | null;
  longitude?: number | null;
  status?: string;
}

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
  reassignedBy: string;
  reassignedAt: string;
  reason: string;
}

export interface Dispatch {
  dispatchId: string;
  incidentId: string;
  resourceId: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  status: DispatchStatus;
  priority: string;
  routeInfo: any;
  dispatchNotes: string;
  acknowledgementTimestamp?: string | null;
  enRouteTimestamp?: string | null;
  arrivedTimestamp?: string | null;
  onSceneTimestamp?: string | null;
  completedTimestamp?: string | null;
  cancelledTimestamp?: string | null;
  cancellationReason?: string | null;
  declinedTimestamp?: string | null;
  declineReason?: string | null;
  reassignmentHistory?: DispatchReassignment[];
  verifiedVictimCount?: number | null;
  completionNotes?: string | null;
  auditInfo?: {
    createdActorId: string;
    createdActorRole: string;
    updatedActorId?: string;
    updatedActorRole?: string;
  };
}

import { Hazard, BlockedRoad, RouteResult } from '../gis/types.ts';

export interface DatabaseSchema {
  version: number;
  initializedAt: string;
  users: User[];
  incidents: Incident[];
  incidentLocations: IncidentLocation[];
  resources: Resource[];
  responders: Responder[];
  dispatches?: Dispatch[];
  messages: Message[];
  meshNodes: MeshNode[];
  simulatedNodes?: SimulatedMeshNode[];
  meshPackets?: SimulatedMeshPacket[];
  meshEvents?: SimulatedMeshEvent[];
  meshConfig?: MeshSimulationConfig;
  knowledgeDocuments: KnowledgeDocument[];
  auditLogs: AuditLog[];
  aiTriageRecords?: AIIncidentTriageRecord[];
  lastIncidentSequence?: Record<string, number>;
  revokedTokens?: string[];
  hazards?: Hazard[];
  blockedRoads?: BlockedRoad[];
  routeHistory?: RouteResult[];
}
