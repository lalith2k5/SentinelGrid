import { db } from '../db/database.ts';
import {
  Hazard,
  BlockedRoad,
  HazardType,
  HazardSeverity,
  RouteMode,
  RouteResult,
  MapNode,
  MapEdge,
  MapMetadata,
  RouteComparisonResult,
  RouteComparisonMetric
} from '../gis/types.ts';
import { offlineMapProvider, OfflineMapProvider } from '../gis/OfflineMapProvider.ts';
import { offlineOperationalMapProvider, OfflineOperationalMapProvider } from '../gis/OfflineOperationalMapProvider.ts';
import { RoutingEngine } from '../gis/routingEngine.ts';
import { UserRole } from '../db/schema.ts';

export class RoutingService {
  private routingEngine: RoutingEngine;

  constructor(private mapProvider: OfflineMapProvider = offlineOperationalMapProvider) {
    this.routingEngine = new RoutingEngine(this.mapProvider);
  }

  public getOperationalMapProvider(): OfflineOperationalMapProvider {
    return offlineOperationalMapProvider;
  }

  public getMapData(): {
    metadata: MapMetadata;
    nodes: MapNode[];
    edges: MapEdge[];
    hazards: Hazard[];
    blockedRoads: BlockedRoad[];
  } {
    return {
      metadata: this.mapProvider.getMapMetadata(),
      nodes: this.mapProvider.getNodes(),
      edges: this.mapProvider.getEdges(),
      hazards: db.getHazards(),
      blockedRoads: db.getBlockedRoads()
    };
  }

  public getOperationalData() {
    const hazards = db.getHazards();
    const blockedRoads = db.getBlockedRoads();
    const incidents = db.getIncidents();
    const resources = db.getResources();
    const responders = db.getResponders();

    const overlays = offlineOperationalMapProvider.getOperationalOverlays({
      incidents,
      resources,
      responders,
      hazards,
      blockedRoads
    });

    const diagnostics = offlineOperationalMapProvider.getDiagnostics(
      hazards,
      blockedRoads,
      incidents,
      resources,
      responders
    );

    return {
      metadata: offlineOperationalMapProvider.getMapMetadata(),
      bounds: offlineOperationalMapProvider.getMapBounds(),
      coordinateSystem: offlineOperationalMapProvider.getCoordinateReferenceInfo(),
      nodes: offlineOperationalMapProvider.getNodes(),
      edges: offlineOperationalMapProvider.getEdges(),
      hazards,
      blockedRoads,
      overlays,
      diagnostics,
      layers: offlineOperationalMapProvider.getLayers({
        BASE_MAP: 1,
        ROADS: offlineOperationalMapProvider.getEdges().length,
        INCIDENTS: overlays.incidents.length,
        RESOURCES: overlays.resources.length,
        RESPONDERS: overlays.responders.length,
        HAZARDS: hazards.length,
        BLOCKED_ROADS: blockedRoads.length,
        ACTIVE_ROUTE: 0
      })
    };
  }

  public getNodes(): MapNode[] {
    return this.mapProvider.getNodes();
  }

  public getEdges(): MapEdge[] {
    return this.mapProvider.getEdges();
  }

  public getHazards(): Hazard[] {
    return db.getHazards();
  }

  public getBlockedRoads(): BlockedRoad[] {
    return db.getBlockedRoads();
  }

  public createHazard(
    params: {
      type: HazardType;
      severity: HazardSeverity;
      latitude: number;
      longitude: number;
      radiusMeters?: number;
      description?: string;
      source?: string;
      expiresAt?: string | null;
    },
    requestedBy?: { userId?: string; name?: string; role?: UserRole }
  ): Hazard {
    const validTypes: HazardType[] = [
      'FLOOD',
      'FIRE',
      'LANDSLIDE',
      'EARTHQUAKE_DAMAGE',
      'STRUCTURAL_DAMAGE',
      'HAZMAT',
      'CHEMICAL',
      'STRUCTURAL',
      'ELECTRICAL',
      'ROAD_BLOCKAGE',
      'UNKNOWN'
    ];
    const validSeverities: HazardSeverity[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

    if (!params.type || !validTypes.includes(params.type)) {
      throw new Error(`Invalid hazard type: ${params.type}`);
    }
    if (!params.severity || !validSeverities.includes(params.severity)) {
      throw new Error(`Invalid hazard severity: ${params.severity}`);
    }
    if (
      typeof params.latitude !== 'number' ||
      isNaN(params.latitude) ||
      params.latitude < -90 ||
      params.latitude > 90
    ) {
      throw new Error(`Invalid hazard latitude: ${params.latitude}. Must be between -90 and 90.`);
    }
    if (
      typeof params.longitude !== 'number' ||
      isNaN(params.longitude) ||
      params.longitude < -180 ||
      params.longitude > 180
    ) {
      throw new Error(`Invalid hazard longitude: ${params.longitude}. Must be between -180 and 180.`);
    }

    const radiusMeters =
      typeof params.radiusMeters === 'number' && params.radiusMeters > 0
        ? params.radiusMeters
        : 250;

    const hazard: Hazard = {
      hazardId: `haz-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      type: params.type,
      severity: params.severity,
      latitude: params.latitude,
      longitude: params.longitude,
      radiusMeters,
      active: true,
      source: params.source || (requestedBy?.name ? `User (${requestedBy.name})` : 'OPERATOR'),
      createdAt: new Date().toISOString(),
      expiresAt: params.expiresAt || null,
      description: params.description || ''
    };

    db.insertHazard(hazard);

    db.insertAuditLog({
      actorId: requestedBy?.userId,
      actorRole: requestedBy?.role || 'SYSTEM',
      action: 'HAZARD_CREATED',
      entityType: 'GIS_HAZARD',
      entityId: hazard.hazardId,
      details: JSON.stringify({
        type: hazard.type,
        severity: hazard.severity,
        lat: hazard.latitude,
        lng: hazard.longitude,
        radius: hazard.radiusMeters
      })
    });

    return hazard;
  }

  public deleteHazard(
    hazardId: string,
    requestedBy?: { userId?: string; name?: string; role?: UserRole }
  ): boolean {
    if (!hazardId || typeof hazardId !== 'string') {
      throw new Error('Valid hazardId is required');
    }

    const deleted = db.deleteHazard(hazardId);
    if (deleted) {
      db.insertAuditLog({
        actorId: requestedBy?.userId,
        actorRole: requestedBy?.role || 'SYSTEM',
        action: 'HAZARD_DELETED',
        entityType: 'GIS_HAZARD',
        entityId: hazardId,
        details: JSON.stringify({ deletedBy: requestedBy?.name || 'SYSTEM' })
      });
    }
    return deleted;
  }

  public createBlockedRoad(
    params: {
      edgeId: string;
      reason: string;
      severity?: HazardSeverity;
      source?: string;
      expiresAt?: string | null;
    },
    requestedBy?: { userId?: string; name?: string; role?: UserRole }
  ): BlockedRoad {
    if (!params.edgeId || typeof params.edgeId !== 'string') {
      throw new Error('Valid edgeId is required');
    }
    const edge = this.mapProvider.getEdge(params.edgeId);
    if (!edge) {
      throw new Error(`Edge ID not found in road graph: ${params.edgeId}`);
    }
    if (!params.reason || typeof params.reason !== 'string' || !params.reason.trim()) {
      throw new Error('Blockage reason is required');
    }

    const blockedRoad: BlockedRoad = {
      blockedRoadId: `blk-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      edgeId: params.edgeId,
      reason: params.reason.trim(),
      severity: params.severity || 'CRITICAL',
      createdAt: new Date().toISOString(),
      expiresAt: params.expiresAt || null,
      source: params.source || (requestedBy?.name ? `User (${requestedBy.name})` : 'OPERATOR'),
      active: true
    };

    db.insertBlockedRoad(blockedRoad);

    db.insertAuditLog({
      actorId: requestedBy?.userId,
      actorRole: requestedBy?.role || 'SYSTEM',
      action: 'BLOCKED_ROAD_CREATED',
      entityType: 'GIS_BLOCKED_ROAD',
      entityId: blockedRoad.blockedRoadId,
      details: JSON.stringify({
        edgeId: blockedRoad.edgeId,
        reason: blockedRoad.reason
      })
    });

    return blockedRoad;
  }

  public deleteBlockedRoad(
    blockedRoadId: string,
    requestedBy?: { userId?: string; name?: string; role?: UserRole }
  ): boolean {
    if (!blockedRoadId || typeof blockedRoadId !== 'string') {
      throw new Error('Valid blockedRoadId is required');
    }

    const deleted = db.deleteBlockedRoad(blockedRoadId);
    if (deleted) {
      db.insertAuditLog({
        actorId: requestedBy?.userId,
        actorRole: requestedBy?.role || 'SYSTEM',
        action: 'BLOCKED_ROAD_DELETED',
        entityType: 'GIS_BLOCKED_ROAD',
        entityId: blockedRoadId,
        details: JSON.stringify({ deletedBy: requestedBy?.name || 'SYSTEM' })
      });
    }
    return deleted;
  }

  public calculateRoute(
    params: {
      incidentId?: string | null;
      originNodeId?: string;
      originCoords?: { latitude: number; longitude: number };
      destinationNodeId?: string;
      destinationCoords?: { latitude: number; longitude: number };
      mode?: RouteMode;
    },
    requestedBy?: { userId?: string; name?: string; role?: UserRole }
  ): RouteResult {
    let destCoords = params.destinationCoords;
    let destNodeId = params.destinationNodeId;

    // If incidentId is provided, look up incident coordinates
    if (params.incidentId) {
      const incident = db.findIncidentById(params.incidentId);
      if (!incident) {
        return {
          routeId: `route-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          incidentId: params.incidentId,
          origin: null,
          destination: null,
          nodePath: [],
          edgePath: [],
          distanceMeters: 0,
          estimatedTravelSeconds: 0,
          hazardPenalty: 0,
          totalCost: 0,
          avoidedHazards: 0,
          blockedEdgesAvoided: 0,
          activeBlockedEdgesInNetwork: 0,
          calculatedAt: new Date().toISOString(),
          algorithm: 'Dijkstra-Offline-v1',
          mapDatasetVersion: this.mapProvider.getMapMetadata().version,
          mode: params.mode || 'BALANCED',
          routeStatus: 'LOCATION_UNAVAILABLE',
          explanation: `Incident ${params.incidentId} not found in database.`
        };
      }

      if (
        !incident.location ||
        typeof incident.location.latitude !== 'number' ||
        typeof incident.location.longitude !== 'number' ||
        isNaN(incident.location.latitude) ||
        isNaN(incident.location.longitude) ||
        incident.location.latitude < -90 ||
        incident.location.latitude > 90 ||
        incident.location.longitude < -180 ||
        incident.location.longitude > 180
      ) {
        return {
          routeId: `route-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          incidentId: params.incidentId,
          origin: null,
          destination: null,
          nodePath: [],
          edgePath: [],
          distanceMeters: 0,
          estimatedTravelSeconds: 0,
          hazardPenalty: 0,
          totalCost: 0,
          avoidedHazards: 0,
          blockedEdgesAvoided: 0,
          activeBlockedEdgesInNetwork: 0,
          calculatedAt: new Date().toISOString(),
          algorithm: 'Dijkstra-Offline-v1',
          mapDatasetVersion: this.mapProvider.getMapMetadata().version,
          mode: params.mode || 'BALANCED',
          routeStatus: 'LOCATION_UNAVAILABLE',
          explanation: 'Incident location is unavailable or has missing/invalid coordinates.'
        };
      }

      // Found valid incident location
      destCoords = {
        latitude: incident.location.latitude,
        longitude: incident.location.longitude
      };
    }

    const activeHazards = db.getHazards().filter(h => h.active);
    const activeBlockedRoads = db.getBlockedRoads().filter(b => b.active);

    const result = this.routingEngine.calculateRoute({
      originNodeId: params.originNodeId,
      originCoords: params.originCoords,
      destinationNodeId: destNodeId,
      destinationCoords: destCoords,
      incidentId: params.incidentId,
      mode: params.mode || 'BALANCED',
      activeHazards,
      activeBlockedRoads
    });

    // Save result to route history
    db.insertRouteResult(result);

    // Audit log
    db.insertAuditLog({
      actorId: requestedBy?.userId,
      actorRole: requestedBy?.role || 'SYSTEM',
      action: 'GIS_ROUTE_CALCULATED',
      entityType: 'GIS_ROUTE',
      entityId: result.routeId,
      details: JSON.stringify({
        status: result.routeStatus,
        mode: result.mode,
        dist: result.distanceMeters,
        time: result.estimatedTravelSeconds,
        incidentId: params.incidentId || null
      })
    });

    return result;
  }

  public compareRoutes(
    params: {
      incidentId?: string | null;
      originNodeId?: string;
      originCoords?: { latitude: number; longitude: number };
      destinationNodeId?: string;
      destinationCoords?: { latitude: number; longitude: number };
    },
    requestedBy?: { userId?: string; name?: string; role?: UserRole }
  ): RouteComparisonResult {
    const fastest = this.calculateRoute({ ...params, mode: 'FASTEST' }, requestedBy);
    const safest = this.calculateRoute({ ...params, mode: 'SAFEST' }, requestedBy);
    const balanced = this.calculateRoute({ ...params, mode: 'BALANCED' }, requestedBy);

    const metrics: RouteComparisonMetric[] = [
      {
        mode: 'FASTEST',
        distanceMeters: fastest.distanceMeters,
        estimatedTravelSeconds: fastest.estimatedTravelSeconds,
        hazardPenalty: fastest.hazardPenalty,
        avoidedHazards: fastest.avoidedHazards,
        blockedEdgesAvoided: fastest.blockedEdgesAvoided,
        feasible: fastest.routeStatus === 'FOUND',
        routeStatus: fastest.routeStatus,
        explanation: fastest.explanation
      },
      {
        mode: 'SAFEST',
        distanceMeters: safest.distanceMeters,
        estimatedTravelSeconds: safest.estimatedTravelSeconds,
        hazardPenalty: safest.hazardPenalty,
        avoidedHazards: safest.avoidedHazards,
        blockedEdgesAvoided: safest.blockedEdgesAvoided,
        feasible: safest.routeStatus === 'FOUND',
        routeStatus: safest.routeStatus,
        explanation: safest.explanation
      },
      {
        mode: 'BALANCED',
        distanceMeters: balanced.distanceMeters,
        estimatedTravelSeconds: balanced.estimatedTravelSeconds,
        hazardPenalty: balanced.hazardPenalty,
        avoidedHazards: balanced.avoidedHazards,
        blockedEdgesAvoided: balanced.blockedEdgesAvoided,
        feasible: balanced.routeStatus === 'FOUND',
        routeStatus: balanced.routeStatus,
        explanation: balanced.explanation
      }
    ];

    let tradeoffSummary = 'Operational Route Trade-off Analysis: ';
    if (
      fastest.routeStatus !== 'FOUND' &&
      safest.routeStatus !== 'FOUND' &&
      balanced.routeStatus !== 'FOUND'
    ) {
      tradeoffSummary +=
        'No feasible route exists between origin and destination under any navigation mode.';
    } else {
      tradeoffSummary += `FASTEST prioritizes shortest duration (${fastest.estimatedTravelSeconds}s, ${fastest.distanceMeters}m). SAFEST maximizes hazard avoidance (${safest.avoidedHazards} hazards bypassed). BALANCED balances travel time (${balanced.estimatedTravelSeconds}s) with safety buffers.`;
    }

    return {
      origin: fastest.origin,
      destination: fastest.destination,
      routes: {
        FASTEST: fastest,
        SAFEST: safest,
        BALANCED: balanced
      },
      metrics,
      tradeoffSummary
    };
  }

  public getRouteById(routeId: string): RouteResult | null {
    if (!routeId || typeof routeId !== 'string') return null;
    return db.getRouteResult(routeId);
  }

  public resetMap(): void {
    this.mapProvider.resetToSyntheticDemo();
  }

  public getInfo() {
    return {
      service: 'GIS & Routing Engine',
      phase: 4,
      status: 'AVAILABLE',
      statusText: '100% Offline GIS & Hazard-Aware Dijkstra Routing Engine Active',
      implemented: true
    };
  }
}

export const routingService = new RoutingService();
