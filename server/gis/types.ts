export type NodeType =
  | 'ROAD'
  | 'JUNCTION'
  | 'INTERSECTION'
  | 'BRIDGE'
  | 'TUNNEL'
  | 'CHECKPOINT'
  | 'SHELTER'
  | 'HOSPITAL'
  | 'OTHER';

export type RoadType =
  | 'PRIMARY'
  | 'SECONDARY'
  | 'LOCAL'
  | 'SERVICE'
  | 'EMERGENCY_ACCESS'
  | 'BRIDGE'
  | 'TUNNEL'
  | 'UNPAVED'
  | 'HIGHWAY';

export type EdgeDirection = 'BIDIRECTIONAL' | 'ONE_WAY';

export interface MapNode {
  nodeId: string;
  latitude: number;
  longitude: number;
  name: string;
  type: NodeType;
}

export interface MapEdge {
  edgeId: string;
  fromNodeId: string;
  toNodeId: string;
  distanceMeters: number;
  estimatedTravelSeconds: number;
  estimatedTravelTimeSeconds?: number;
  roadType: RoadType;
  direction: EdgeDirection;
  isBlocked: boolean;
  hazardPenalty: number;
  maxSafeSpeed: number;
  roadName?: string;
  capacity?: string;
  metadata?: Record<string, any>;
}

export type HazardType =
  | 'FLOOD'
  | 'FIRE'
  | 'LANDSLIDE'
  | 'EARTHQUAKE_DAMAGE'
  | 'STRUCTURAL_DAMAGE'
  | 'HAZMAT'
  | 'CHEMICAL'
  | 'STRUCTURAL'
  | 'ELECTRICAL'
  | 'ROAD_BLOCKAGE'
  | 'UNKNOWN';

export type HazardSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface Hazard {
  id?: string;
  hazardId: string;
  type: HazardType;
  severity: HazardSeverity;
  latitude: number;
  longitude: number;
  radiusMeters: number;
  geometryType?: 'CIRCLE';
  active: boolean;
  source: string;
  createdAt: string;
  expiresAt?: string | null;
  description?: string;
}

export interface BlockedRoad {
  id?: string;
  blockedRoadId: string;
  edgeId: string;
  reason: string;
  severity: HazardSeverity;
  createdAt: string;
  expiresAt?: string | null;
  source: string;
  active: boolean;
}

export type RouteMode = 'FASTEST' | 'SAFEST' | 'BALANCED';

export type RouteStatus =
  | 'FOUND'
  | 'NO_ROUTE'
  | 'LOCATION_UNAVAILABLE'
  | 'INVALID_ORIGIN'
  | 'INVALID_DESTINATION'
  | 'LOCATION_OUTSIDE_MAP'
  | 'MAP_UNAVAILABLE';

export interface RouteCoordinates {
  latitude: number;
  longitude: number;
}

export interface RoutePoint {
  nodeId?: string;
  latitude: number;
  longitude: number;
  name?: string;
}

export interface RouteResult {
  routeId: string;
  incidentId?: string | null;
  origin: RoutePoint | null;
  destination: RoutePoint | null;
  nodePath: string[];
  edgePath: string[];
  distanceMeters: number;
  estimatedTravelSeconds: number;
  hazardPenalty: number;
  totalCost: number;
  avoidedHazards: number;
  blockedEdgesAvoided: number;
  activeBlockedEdgesInNetwork?: number;
  calculatedAt: string;
  algorithm: string;
  mapDatasetVersion: string;
  mode: RouteMode;
  routeStatus: RouteStatus;
  explanation: string;
}

export interface MapMetadata {
  datasetName: string;
  version: string;
  nodeCount: number;
  edgeCount: number;
  isSyntheticDemo: boolean;
  boundingBox: {
    minLat: number;
    maxLat: number;
    minLng: number;
    maxLng: number;
  };
  lastUpdated: string;
}

export interface RouteModeConfig {
  timeWeight: number;
  distanceWeight: number;
  hazardWeight: number;
}

export const ROUTE_MODE_WEIGHTS: Record<RouteMode, RouteModeConfig> = {
  FASTEST: {
    timeWeight: 0.8,
    distanceWeight: 0.2,
    hazardWeight: 0.0
  },
  SAFEST: {
    timeWeight: 0.2,
    distanceWeight: 0.1,
    hazardWeight: 0.7
  },
  BALANCED: {
    timeWeight: 0.4,
    distanceWeight: 0.3,
    hazardWeight: 0.3
  }
};

// ==========================================
// Phase 7: Operational GIS & Map Types
// ==========================================

export type MapLayerId =
  | 'BASE_MAP'
  | 'ROADS'
  | 'INCIDENTS'
  | 'RESOURCES'
  | 'RESPONDERS'
  | 'HAZARDS'
  | 'BLOCKED_ROADS'
  | 'ACTIVE_ROUTE';

export interface MapLayerConfig {
  id: MapLayerId;
  name: string;
  visible: boolean;
  description: string;
  objectCount: number;
}

export type MapOperationalStatus = 'OPERATIONAL' | 'DEGRADED' | 'UNAVAILABLE';

export interface CoordinateReferenceInfo {
  datum: string;
  projection: string;
  isOffline: boolean;
  externalDependency: 'NONE';
  syntheticNotice: string;
}

export interface MapDiagnostics {
  status: MapOperationalStatus;
  provider: string;
  datasetName: string;
  version: string;
  nodeCount: number;
  roadCount: number;
  hazardCount: number;
  blockedRoadCount: number;
  incidentOverlayCount: number;
  resourceOverlayCount: number;
  responderOverlayCount: number;
  lastLocalLoadTime: string;
  internetDependency: 'NONE';
  coordinateSystem: CoordinateReferenceInfo;
  boundingBox: {
    minLat: number;
    maxLat: number;
    minLng: number;
    maxLng: number;
  };
  validationStatus: {
    valid: boolean;
    errors: string[];
    warnings: string[];
  };
  offlineNotice: string;
}

export interface MapValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  statistics: {
    nodeCount: number;
    edgeCount: number;
    oneWayCount: number;
    hazardCount: number;
    blockedRoadCount: number;
  };
}

export interface RouteComparisonMetric {
  mode: RouteMode;
  distanceMeters: number;
  estimatedTravelSeconds: number;
  hazardPenalty: number;
  avoidedHazards: number;
  blockedEdgesAvoided: number;
  feasible: boolean;
  routeStatus: RouteStatus;
  explanation: string;
}

export interface RouteComparisonResult {
  origin: RoutePoint | null;
  destination: RoutePoint | null;
  routes: {
    FASTEST: RouteResult;
    SAFEST: RouteResult;
    BALANCED: RouteResult;
  };
  metrics: RouteComparisonMetric[];
  tradeoffSummary: string;
}

export interface IncidentOverlay {
  incidentId: string;
  category: string;
  severity: string;
  verificationStatus: string;
  status: string;
  victimCount?: number;
  hazardType?: string;
  latitude: number | null;
  longitude: number | null;
  isLocationUnavailable: boolean;
  nearestNodeId?: string | null;
  nearestDistanceMeters?: number | null;
}

export interface ResourceOverlay {
  resourceId: string;
  name: string;
  type: string;
  status: string;
  capabilities: string[];
  capacity: number;
  latitude: number | null;
  longitude: number | null;
  isLocationUnavailable: boolean;
  nearestNodeId?: string | null;
  nearestDistanceMeters?: number | null;
}

export interface ResponderOverlay {
  responderId: string;
  name: string;
  callsign: string;
  role: string;
  status: string;
  latitude: number;
  longitude: number;
  locationStatus: 'SIMULATED_OFFLINE_POSITION';
  assignedResourceId?: string;
}

export interface OperationalOverlays {
  incidents: IncidentOverlay[];
  resources: ResourceOverlay[];
  responders: ResponderOverlay[];
  hazards: Hazard[];
  blockedRoads: BlockedRoad[];
  activeRoute: RouteResult | null;
}
