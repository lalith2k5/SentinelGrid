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

export type ResourceType = 'AMBULANCE' | 'RESCUE_TEAM' | 'MEDICAL_TEAM' | 'SHELTER' | 'EMERGENCY_EQUIPMENT';
export type ResourceAvailability = 'AVAILABLE' | 'DEPLOYED' | 'MAINTENANCE' | 'OFFLINE';

export interface Resource {
  id: string;
  name: string;
  type: ResourceType;
  availability: ResourceAvailability;
  location: string;
  capacity?: string;
  statusDetails?: string;
  assignedIncidentId?: string;
  assignedIncidentNumber?: string;
  isDemoData?: boolean;
  createdAt: string;
  updatedAt: string;
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

export interface DatabaseSchema {
  version: number;
  initializedAt: string;
  users: User[];
  incidents: Incident[];
  incidentLocations: IncidentLocation[];
  resources: Resource[];
  responders: Responder[];
  messages: Message[];
  meshNodes: MeshNode[];
  knowledgeDocuments: KnowledgeDocument[];
  auditLogs: AuditLog[];
  lastIncidentSequence?: Record<string, number>;
  revokedTokens?: string[];
}
