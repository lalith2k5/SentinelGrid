import {
  LocalGraphMapProvider,
  calculateHaversineDistance,
  MAX_SNAP_DISTANCE_METERS
} from './OfflineMapProvider.ts';
import {
  MapNode,
  MapEdge,
  MapMetadata,
  Hazard,
  BlockedRoad,
  MapLayerConfig,
  MapDiagnostics,
  MapOperationalStatus,
  CoordinateReferenceInfo,
  MapValidationResult,
  OperationalOverlays,
  IncidentOverlay,
  ResourceOverlay,
  ResponderOverlay,
  RouteResult
} from './types.ts';
import {
  SYNTHETIC_MAP_METADATA,
  SYNTHETIC_MAP_NODES,
  SYNTHETIC_MAP_EDGES,
  SYNTHETIC_MAP_HAZARDS,
  SYNTHETIC_MAP_BLOCKED_ROADS
} from './syntheticDataset.ts';

export const OFFLINE_COORDINATE_INFO: CoordinateReferenceInfo = {
  datum: 'WGS-84 (Synthetic Local Grid)',
  projection: 'Local Equirectangular / Spherical Haversine',
  isOffline: true,
  externalDependency: 'NONE',
  syntheticNotice: 'SYNTHETIC OFFLINE TRAINING / DEMONSTRATION MAP'
};

export const DEFAULT_MAP_LAYERS: Omit<MapLayerConfig, 'objectCount'>[] = [
  {
    id: 'BASE_MAP',
    name: 'Base Map Grid',
    visible: true,
    description: 'Offline coordinate grid, bounding perimeter, and terrain canvas'
  },
  {
    id: 'ROADS',
    name: 'Road Network',
    visible: true,
    description: 'Authoritative road centerlines, directionality, and classifications'
  },
  {
    id: 'INCIDENTS',
    name: 'Emergency Incidents',
    visible: true,
    description: 'Active reported incidents positioned with authoritative coordinates'
  },
  {
    id: 'RESOURCES',
    name: 'Emergency Resources',
    visible: true,
    description: 'Deployable offline assets, units, supplies, and stations'
  },
  {
    id: 'RESPONDERS',
    name: 'Field Responders',
    visible: true,
    description: 'Field responder positions (Simulated Offline Positions)'
  },
  {
    id: 'HAZARDS',
    name: 'Hazard Zones',
    visible: true,
    description: 'Environmental, structural, and active perimeter hazards'
  },
  {
    id: 'BLOCKED_ROADS',
    name: 'Blocked Roads',
    visible: true,
    description: 'Explicit impassable corridors and physical road blockages'
  },
  {
    id: 'ACTIVE_ROUTE',
    name: 'Active Route Path',
    visible: true,
    description: 'Calculated optimal navigation corridors and route telemetry'
  }
];

export class OfflineOperationalMapProvider extends LocalGraphMapProvider {
  private lastLoadTime: string;
  private layerVisibilityMap: Map<string, boolean> = new Map();

  constructor() {
    super();
    this.lastLoadTime = new Date().toISOString();
    for (const layer of DEFAULT_MAP_LAYERS) {
      this.layerVisibilityMap.set(layer.id, layer.visible);
    }
  }

  public getMapBounds(): { minLat: number; maxLat: number; minLng: number; maxLng: number } {
    const meta = this.getMapMetadata();
    return { ...meta.boundingBox };
  }

  public getCoordinateReferenceInfo(): CoordinateReferenceInfo {
    return { ...OFFLINE_COORDINATE_INFO };
  }

  public getRoadNetwork(): MapEdge[] {
    return this.getEdges();
  }

  public getIntersections(): MapNode[] {
    return this.getNodes();
  }

  public getHazardZones(dbHazards?: Hazard[]): Hazard[] {
    if (dbHazards && dbHazards.length > 0) {
      return [...dbHazards];
    }
    return [...SYNTHETIC_MAP_HAZARDS];
  }

  public getBlockedRoads(dbBlockedRoads?: BlockedRoad[]): BlockedRoad[] {
    if (dbBlockedRoads && dbBlockedRoads.length > 0) {
      return [...dbBlockedRoads];
    }
    return [...SYNTHETIC_MAP_BLOCKED_ROADS];
  }

  public getMapStatus(): MapOperationalStatus {
    try {
      const nodes = this.getNodes();
      const edges = this.getEdges();
      if (nodes.length === 0 || edges.length === 0) {
        return 'UNAVAILABLE';
      }
      const validation = this.validateDataset(nodes, edges);
      if (!validation.valid) {
        return 'DEGRADED';
      }
      return 'OPERATIONAL';
    } catch {
      return 'UNAVAILABLE';
    }
  }

  public getLayers(counts?: Partial<Record<string, number>>): MapLayerConfig[] {
    return DEFAULT_MAP_LAYERS.map(l => ({
      ...l,
      visible: this.layerVisibilityMap.get(l.id) ?? true,
      objectCount: counts?.[l.id] ?? 0
    }));
  }

  public setLayerVisibility(layerId: string, visible: boolean): void {
    if (this.layerVisibilityMap.has(layerId)) {
      this.layerVisibilityMap.set(layerId, visible);
    }
  }

  public validateDataset(
    nodesToValidate?: MapNode[],
    edgesToValidate?: MapEdge[],
    hazardsToValidate?: Hazard[],
    blockedRoadsToValidate?: BlockedRoad[]
  ): MapValidationResult {
    const nodes = nodesToValidate || this.getNodes();
    const edges = edgesToValidate || this.getEdges();
    const hazards = hazardsToValidate || SYNTHETIC_MAP_HAZARDS;
    const blockedRoads = blockedRoadsToValidate || SYNTHETIC_MAP_BLOCKED_ROADS;

    const errors: string[] = [];
    const warnings: string[] = [];

    const nodeIds = new Set<string>();
    const nodeCoordMap = new Map<string, { lat: number; lng: number }>();

    let minLat = Infinity,
      maxLat = -Infinity,
      minLng = Infinity,
      maxLng = -Infinity;

    // Validate Nodes
    if (!Array.isArray(nodes) || nodes.length === 0) {
      errors.push('Map dataset contains no nodes');
    } else {
      for (const node of nodes) {
        if (!node || typeof node !== 'object') {
          errors.push('Invalid node entry: not an object');
          continue;
        }
        if (!node.nodeId || typeof node.nodeId !== 'string' || !node.nodeId.trim()) {
          errors.push(`Node missing valid nodeId`);
          continue;
        }
        if (nodeIds.has(node.nodeId)) {
          errors.push(`Duplicate node ID detected: ${node.nodeId}`);
        }
        nodeIds.add(node.nodeId);

        if (
          typeof node.latitude !== 'number' ||
          !Number.isFinite(node.latitude) ||
          node.latitude < -90 ||
          node.latitude > 90
        ) {
          errors.push(`Node ${node.nodeId} has invalid latitude: ${node.latitude}`);
        }
        if (
          typeof node.longitude !== 'number' ||
          !Number.isFinite(node.longitude) ||
          node.longitude < -180 ||
          node.longitude > 180
        ) {
          errors.push(`Node ${node.nodeId} has invalid longitude: ${node.longitude}`);
        }

        if (Number.isFinite(node.latitude) && Number.isFinite(node.longitude)) {
          nodeCoordMap.set(node.nodeId, { lat: node.latitude, lng: node.longitude });
          if (node.latitude < minLat) minLat = node.latitude;
          if (node.latitude > maxLat) maxLat = node.latitude;
          if (node.longitude < minLng) minLng = node.longitude;
          if (node.longitude > maxLng) maxLng = node.longitude;
        }
      }
    }

    // Validate Bounds
    if (minLat > maxLat || minLng > maxLng) {
      errors.push('Map bounding box coordinates are inverted or invalid');
    }

    // Validate Edges
    const edgeIds = new Set<string>();
    let oneWayCount = 0;

    if (!Array.isArray(edges) || edges.length === 0) {
      errors.push('Map dataset contains no road edges');
    } else {
      for (const edge of edges) {
        if (!edge || typeof edge !== 'object') {
          errors.push('Invalid edge entry: not an object');
          continue;
        }
        if (!edge.edgeId || typeof edge.edgeId !== 'string' || !edge.edgeId.trim()) {
          errors.push('Edge missing valid edgeId');
          continue;
        }
        if (edgeIds.has(edge.edgeId)) {
          errors.push(`Duplicate edge ID detected: ${edge.edgeId}`);
        }
        edgeIds.add(edge.edgeId);

        if (!edge.fromNodeId || !nodeIds.has(edge.fromNodeId)) {
          errors.push(
            `Edge ${edge.edgeId} references nonexistent fromNodeId: ${edge.fromNodeId}`
          );
        }
        if (!edge.toNodeId || !nodeIds.has(edge.toNodeId)) {
          errors.push(`Edge ${edge.edgeId} references nonexistent toNodeId: ${edge.toNodeId}`);
        }
        if (edge.fromNodeId === edge.toNodeId) {
          errors.push(`Edge ${edge.edgeId} is an invalid self-loop (${edge.fromNodeId})`);
        }

        if (
          typeof edge.distanceMeters !== 'number' ||
          !Number.isFinite(edge.distanceMeters) ||
          edge.distanceMeters <= 0
        ) {
          errors.push(
            `Edge ${edge.edgeId} has non-positive or invalid distanceMeters: ${edge.distanceMeters}`
          );
        }
        if (
          typeof edge.estimatedTravelSeconds !== 'number' ||
          !Number.isFinite(edge.estimatedTravelSeconds) ||
          edge.estimatedTravelSeconds <= 0
        ) {
          errors.push(
            `Edge ${edge.edgeId} has non-positive or invalid estimatedTravelSeconds: ${edge.estimatedTravelSeconds}`
          );
        }

        if (edge.direction !== 'BIDIRECTIONAL' && edge.direction !== 'ONE_WAY') {
          errors.push(
            `Edge ${edge.edgeId} has invalid direction constraint: ${edge.direction}`
          );
        } else if (edge.direction === 'ONE_WAY') {
          oneWayCount++;
        }
      }
    }

    // Validate Hazards
    if (Array.isArray(hazards)) {
      for (const h of hazards) {
        if (!h.hazardId) {
          errors.push('Hazard missing hazardId');
        }
        if (
          typeof h.latitude !== 'number' ||
          !Number.isFinite(h.latitude) ||
          h.latitude < -90 ||
          h.latitude > 90
        ) {
          errors.push(`Hazard ${h.hazardId || 'unknown'} has invalid latitude: ${h.latitude}`);
        }
        if (
          typeof h.longitude !== 'number' ||
          !Number.isFinite(h.longitude) ||
          h.longitude < -180 ||
          h.longitude > 180
        ) {
          errors.push(
            `Hazard ${h.hazardId || 'unknown'} has invalid longitude: ${h.longitude}`
          );
        }
        if (
          typeof h.radiusMeters !== 'number' ||
          !Number.isFinite(h.radiusMeters) ||
          h.radiusMeters <= 0
        ) {
          errors.push(
            `Hazard ${h.hazardId || 'unknown'} has non-positive radiusMeters: ${h.radiusMeters}`
          );
        }
      }
    }

    // Validate Blocked Roads
    if (Array.isArray(blockedRoads)) {
      for (const b of blockedRoads) {
        if (!b.blockedRoadId) {
          errors.push('Blocked road missing blockedRoadId');
        }
        if (!b.edgeId || !edgeIds.has(b.edgeId)) {
          errors.push(
            `Blocked road ${b.blockedRoadId || 'unknown'} references nonexistent edgeId: ${b.edgeId}`
          );
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      statistics: {
        nodeCount: nodeIds.size,
        edgeCount: edgeIds.size,
        oneWayCount,
        hazardCount: hazards?.length || 0,
        blockedRoadCount: blockedRoads?.length || 0
      }
    };
  }

  public getDiagnostics(
    dbHazards?: Hazard[],
    dbBlockedRoads?: BlockedRoad[],
    incidents?: any[],
    resources?: any[],
    responders?: any[]
  ): MapDiagnostics {
    const status = this.getMapStatus();
    const meta = this.getMapMetadata();
    const hazards = this.getHazardZones(dbHazards);
    const blockedRoads = this.getBlockedRoads(dbBlockedRoads);
    const validation = this.validateDataset(this.getNodes(), this.getEdges(), hazards, blockedRoads);

    const validIncidentsCount = (incidents || []).filter(
      i =>
        i &&
        i.location &&
        typeof i.location.latitude === 'number' &&
        typeof i.location.longitude === 'number' &&
        Number.isFinite(i.location.latitude) &&
        Number.isFinite(i.location.longitude) &&
        (i.location.latitude !== 0 || i.location.longitude !== 0)
    ).length;

    const validResourcesCount = (resources || []).filter(
      r =>
        r &&
        ((r.location &&
          typeof r.location.latitude === 'number' &&
          typeof r.location.longitude === 'number' &&
          Number.isFinite(r.location.latitude) &&
          Number.isFinite(r.location.longitude) &&
          (r.location.latitude !== 0 || r.location.longitude !== 0)) ||
          (typeof r.latitude === 'number' &&
            typeof r.longitude === 'number' &&
            Number.isFinite(r.latitude) &&
            Number.isFinite(r.longitude) &&
            (r.latitude !== 0 || r.longitude !== 0)))
    ).length;

    return {
      status,
      provider: 'OfflineOperationalMapProvider (SentinelGrid Local GIS Engine)',
      datasetName: meta.datasetName,
      version: meta.version,
      nodeCount: this.getNodes().length,
      roadCount: this.getEdges().length,
      hazardCount: hazards.length,
      blockedRoadCount: blockedRoads.length,
      incidentOverlayCount: validIncidentsCount,
      resourceOverlayCount: validResourcesCount,
      responderOverlayCount: responders?.length || 0,
      lastLocalLoadTime: this.lastLoadTime,
      internetDependency: 'NONE',
      coordinateSystem: this.getCoordinateReferenceInfo(),
      boundingBox: { ...meta.boundingBox },
      validationStatus: {
        valid: validation.valid,
        errors: validation.errors,
        warnings: validation.warnings
      },
      offlineNotice: 'OFFLINE MAP — NO EXTERNAL MAP SERVICE'
    };
  }

  public getOperationalOverlays(data: {
    incidents?: any[];
    resources?: any[];
    responders?: any[];
    hazards?: Hazard[];
    blockedRoads?: BlockedRoad[];
    activeRoute?: RouteResult | null;
  }): OperationalOverlays {
    const bounds = this.getMapBounds();

    // Map Incidents
    const incidents: IncidentOverlay[] = (data.incidents || []).map(inc => {
      let lat: number | null = null;
      let lng: number | null = null;
      let isLocationUnavailable = true;

      if (inc && inc.location) {
        if (
          typeof inc.location.latitude === 'number' &&
          typeof inc.location.longitude === 'number' &&
          Number.isFinite(inc.location.latitude) &&
          Number.isFinite(inc.location.longitude) &&
          // Guard against 0,0 fallback
          (inc.location.latitude !== 0 || inc.location.longitude !== 0)
        ) {
          lat = inc.location.latitude;
          lng = inc.location.longitude;
          isLocationUnavailable = false;
        }
      }

      let nearestNodeId: string | null = null;
      let nearestDistanceMeters: number | null = null;

      if (!isLocationUnavailable && lat !== null && lng !== null) {
        const match = this.getNearestNode(lat, lng, MAX_SNAP_DISTANCE_METERS);
        if (match) {
          nearestNodeId = match.node.nodeId;
          nearestDistanceMeters = match.distanceMeters;
        }
      }

      return {
        incidentId: inc.id || inc.incidentId || 'INC-UNKNOWN',
        category: inc.category || inc.type || 'EMERGENCY',
        severity: inc.severity || 'MEDIUM',
        verificationStatus: inc.verificationStatus || 'UNVERIFIED',
        status: inc.status || 'REPORTED',
        victimCount: inc.victimCount || (inc.triage ? inc.triage.victimCount : 0),
        hazardType: inc.hazardType,
        latitude: lat,
        longitude: lng,
        isLocationUnavailable,
        nearestNodeId,
        nearestDistanceMeters
      };
    });

    // Map Resources
    const resources: ResourceOverlay[] = (data.resources || []).map(res => {
      let lat: number | null = null;
      let lng: number | null = null;
      let isLocationUnavailable = true;

      const rawLat = res.location?.latitude ?? res.latitude;
      const rawLng = res.location?.longitude ?? res.longitude;

      if (
        typeof rawLat === 'number' &&
        typeof rawLng === 'number' &&
        Number.isFinite(rawLat) &&
        Number.isFinite(rawLng) &&
        (rawLat !== 0 || rawLng !== 0)
      ) {
        lat = rawLat;
        lng = rawLng;
        isLocationUnavailable = false;
      }

      let nearestNodeId: string | null = null;
      let nearestDistanceMeters: number | null = null;

      if (!isLocationUnavailable && lat !== null && lng !== null) {
        const match = this.getNearestNode(lat, lng, MAX_SNAP_DISTANCE_METERS);
        if (match) {
          nearestNodeId = match.node.nodeId;
          nearestDistanceMeters = match.distanceMeters;
        }
      }

      return {
        resourceId: res.id || res.resourceId || 'RES-UNKNOWN',
        name: res.name || 'Emergency Resource',
        type: res.type || 'GENERIC',
        status: res.status || 'AVAILABLE',
        capabilities: Array.isArray(res.capabilities) ? res.capabilities : [],
        capacity: typeof res.capacity === 'number' ? res.capacity : 1,
        latitude: lat,
        longitude: lng,
        isLocationUnavailable,
        nearestNodeId,
        nearestDistanceMeters
      };
    });

    // Map Responders
    const responders: ResponderOverlay[] = (data.responders || []).map((resp, idx) => {
      // Deterministically locate simulated offline responder position near a station/node
      // or near their assigned resource if available
      let lat = 10.0000;
      let lng = 10.0000;

      if (resp.assignedResourceId) {
        const matchingRes = resources.find(r => r.resourceId === resp.assignedResourceId);
        if (matchingRes && matchingRes.latitude && matchingRes.longitude) {
          lat = matchingRes.latitude + 0.0005;
          lng = matchingRes.longitude + 0.0005;
        }
      } else {
        // Deterministic offset based on responder index around Sector HQ
        const offsetLat = ((idx % 5) - 2) * 0.004;
        const offsetLng = ((idx % 4) - 1.5) * 0.004;
        lat = 10.0050 + offsetLat;
        lng = 10.0050 + offsetLng;
      }

      return {
        responderId: resp.id || resp.responderId || `RESP-${idx + 1}`,
        name: resp.name || `Field Responder ${idx + 1}`,
        callsign: resp.callsign || `UNIT-${idx + 1}`,
        role: resp.role || 'FIELD_RESPONDER',
        status: resp.status || 'ACTIVE',
        latitude: lat,
        longitude: lng,
        locationStatus: 'SIMULATED_OFFLINE_POSITION',
        assignedResourceId: resp.assignedResourceId
      };
    });

    return {
      incidents,
      resources,
      responders,
      hazards: this.getHazardZones(data.hazards),
      blockedRoads: this.getBlockedRoads(data.blockedRoads),
      activeRoute: data.activeRoute || null
    };
  }
}

export const offlineOperationalMapProvider = new OfflineOperationalMapProvider();
