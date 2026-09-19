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
  assignedIncidentNumber?: string;
  isDemoData?: boolean;
  createdAt: string;
  updatedAt: string;
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
