import {
  MapNode,
  MapEdge,
  Hazard,
  BlockedRoad,
  RouteMode,
  RouteStatus,
  RouteResult,
  RoutePoint,
  ROUTE_MODE_WEIGHTS
} from './types.ts';
import {
  OfflineMapProvider,
  calculateHaversineDistance,
  MAX_SNAP_DISTANCE_METERS
} from './OfflineMapProvider.ts';

export const MAX_GRAPH_ITERATIONS = 5000;

export function calculatePointToSegmentDistanceMeters(
  pointLat: number,
  pointLng: number,
  segLat1: number,
  segLng1: number,
  segLat2: number,
  segLng2: number
): number {
  const midLat = (segLat1 + segLat2 + pointLat) / 3;
  const latToMeters = 111000;
  const lngToMeters = 111000 * Math.cos(midLat * (Math.PI / 180));

  const px = pointLng * lngToMeters;
  const py = pointLat * latToMeters;
  const ax = segLng1 * lngToMeters;
  const ay = segLat1 * latToMeters;
  const bx = segLng2 * lngToMeters;
  const by = segLat2 * latToMeters;

  const dx = bx - ax;
  const dy = by - ay;

  if (dx === 0 && dy === 0) {
    return Math.sqrt((px - ax) ** 2 + (py - ay) ** 2);
  }

  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)));
  const projX = ax + t * dx;
  const projY = ay + t * dy;

  return Math.sqrt((px - projX) ** 2 + (py - projY) ** 2);
}

export function computeEdgeHazardPenalty(
  edge: MapEdge,
  fromNode: MapNode,
  toNode: MapNode,
  hazards: Hazard[]
): { hazardPenalty: number; isCriticalBlocked: boolean; intersectingHazardIds: string[] } {
  let totalPenalty = 0;
  let isCriticalBlocked = false;
  const intersectingHazardIds: string[] = [];

  const now = new Date();

  for (const hazard of hazards) {
    if (!hazard.active) continue;
    if (hazard.expiresAt && new Date(hazard.expiresAt) < now) continue;

    const distMeters = calculatePointToSegmentDistanceMeters(
      hazard.latitude,
      hazard.longitude,
      fromNode.latitude,
      fromNode.longitude,
      toNode.latitude,
      toNode.longitude
    );

    if (distMeters <= hazard.radiusMeters) {
      intersectingHazardIds.push(hazard.hazardId);

      if (hazard.severity === 'CRITICAL') {
        isCriticalBlocked = true;
      } else {
        const overlapFactor = Math.max(0.1, 1 - distMeters / (hazard.radiusMeters || 1));
        let basePenalty = 100;
        if (hazard.severity === 'HIGH') basePenalty = 2000;
        else if (hazard.severity === 'MEDIUM') basePenalty = 500;
        else if (hazard.severity === 'LOW') basePenalty = 100;

        totalPenalty += Math.round(basePenalty * overlapFactor);
      }
    }
  }

  return {
    hazardPenalty: totalPenalty,
    isCriticalBlocked,
    intersectingHazardIds
  };
}

export class RoutingEngine {
  constructor(private mapProvider: OfflineMapProvider) {}

  public calculateRoute(options: {
    originNodeId?: string;
    originCoords?: { latitude: number; longitude: number };
    destinationNodeId?: string;
    destinationCoords?: { latitude: number; longitude: number };
    incidentId?: string | null;
    mode?: RouteMode;
    activeHazards?: Hazard[];
    activeBlockedRoads?: BlockedRoad[];
  }): RouteResult {
    const mode = options.mode || 'BALANCED';
    const mapMetadata = this.mapProvider.getMapMetadata();
    const allNodes = this.mapProvider.getNodes();
    const allEdges = this.mapProvider.getEdges();

    const calculatedAt = new Date().toISOString();
    const algorithm = 'Dijkstra-Offline-v1';
    const datasetVersion = mapMetadata.version;

    if (!allNodes || allNodes.length === 0 || !allEdges || allEdges.length === 0) {
      return this.buildErrorResult({
        status: 'MAP_UNAVAILABLE',
        explanation: 'Offline map dataset is empty or unavailable.',
        mode,
        calculatedAt,
        algorithm,
        datasetVersion
      });
    }

    // Resolve origin node
    let originNode: MapNode | null = null;
    let originPoint: RoutePoint | null = null;

    if (options.originNodeId) {
      originNode = this.mapProvider.getNode(options.originNodeId);
      if (originNode) {
        originPoint = {
          nodeId: originNode.nodeId,
          latitude: originNode.latitude,
          longitude: originNode.longitude,
          name: originNode.name
        };
      }
    }

    if (!originNode && options.originCoords) {
      const nearest = this.mapProvider.getNearestNode(
        options.originCoords.latitude,
        options.originCoords.longitude
      );
      if (nearest) {
        originNode = nearest.node;
        originPoint = {
          nodeId: originNode.nodeId,
          latitude: options.originCoords.latitude,
          longitude: options.originCoords.longitude,
          name: `${originNode.name} (Matched ${Math.round(nearest.distanceMeters)}m)`
        };
      } else {
        return this.buildErrorResult({
          status: 'LOCATION_OUTSIDE_MAP',
          explanation: `Origin coordinates (${options.originCoords.latitude}, ${options.originCoords.longitude}) exceed maximum snapping distance (${MAX_SNAP_DISTANCE_METERS}m) from offline road network.`,
          mode,
          calculatedAt,
          algorithm,
          datasetVersion,
          originPoint: {
            latitude: options.originCoords.latitude,
            longitude: options.originCoords.longitude,
            name: 'Location Outside Offline Map'
          }
        });
      }
    }

    if (!originNode || !originPoint) {
      return this.buildErrorResult({
        status: options.originCoords ? 'INVALID_ORIGIN' : 'LOCATION_UNAVAILABLE',
        explanation: 'Origin location could not be matched to the local road network.',
        mode,
        calculatedAt,
        algorithm,
        datasetVersion
      });
    }

    // Resolve destination node
    let destinationNode: MapNode | null = null;
    let destinationPoint: RoutePoint | null = null;

    if (options.destinationNodeId) {
      destinationNode = this.mapProvider.getNode(options.destinationNodeId);
      if (destinationNode) {
        destinationPoint = {
          nodeId: destinationNode.nodeId,
          latitude: destinationNode.latitude,
          longitude: destinationNode.longitude,
          name: destinationNode.name
        };
      }
    }

    if (!destinationNode && options.destinationCoords) {
      const nearest = this.mapProvider.getNearestNode(
        options.destinationCoords.latitude,
        options.destinationCoords.longitude
      );
      if (nearest) {
        destinationNode = nearest.node;
        destinationPoint = {
          nodeId: destinationNode.nodeId,
          latitude: options.destinationCoords.latitude,
          longitude: options.destinationCoords.longitude,
          name: `${destinationNode.name} (Matched ${Math.round(nearest.distanceMeters)}m)`
        };
      } else {
        return this.buildErrorResult({
          status: 'LOCATION_OUTSIDE_MAP',
          explanation: `Destination coordinates (${options.destinationCoords.latitude}, ${options.destinationCoords.longitude}) exceed maximum snapping distance (${MAX_SNAP_DISTANCE_METERS}m) from offline road network.`,
          mode,
          calculatedAt,
          algorithm,
          datasetVersion,
          originPoint,
          destinationPoint: {
            latitude: options.destinationCoords.latitude,
            longitude: options.destinationCoords.longitude,
            name: 'Location Outside Offline Map'
          }
        });
      }
    }

    if (!destinationNode || !destinationPoint) {
      return this.buildErrorResult({
        status: options.destinationCoords ? 'INVALID_DESTINATION' : 'LOCATION_UNAVAILABLE',
        explanation: 'Destination location could not be matched to the local road network.',
        mode,
        calculatedAt,
        algorithm,
        datasetVersion,
        originPoint
      });
    }

    if (originNode.nodeId === destinationNode.nodeId) {
      return {
        routeId: `route-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        incidentId: options.incidentId || null,
        origin: originPoint,
        destination: destinationPoint,
        nodePath: [originNode.nodeId],
        edgePath: [],
        distanceMeters: 0,
        estimatedTravelSeconds: 0,
        hazardPenalty: 0,
        totalCost: 0,
        avoidedHazards: 0,
        blockedEdgesAvoided: 0,
        activeBlockedEdgesInNetwork: 0,
        calculatedAt,
        algorithm,
        mapDatasetVersion: datasetVersion,
        mode,
        routeStatus: 'FOUND',
        explanation: 'Origin and destination match the same road node.'
      };
    }

    // Prepare active blocked roads set
    const blockedEdgeIds = new Set<string>();
    const now = new Date();

    if (options.activeBlockedRoads) {
      for (const br of options.activeBlockedRoads) {
        if (!br.active) continue;
        if (br.expiresAt && new Date(br.expiresAt) < now) continue;
        blockedEdgeIds.add(br.edgeId);
      }
    }

    // Prepare active hazards list
    const hazardsList: Hazard[] = [];
    if (options.activeHazards) {
      for (const h of options.activeHazards) {
        if (!h.active) continue;
        if (h.expiresAt && new Date(h.expiresAt) < now) continue;
        hazardsList.push(h);
      }
    }

    // Build adjacency list for Dijkstra
    // Map: nodeId -> Array<{ toNodeId: string; edge: MapEdge; computedPenalty: number; isCriticalBlocked: boolean }>
    const nodeMap = new Map<string, MapNode>();
    for (const n of allNodes) {
      nodeMap.set(n.nodeId, n);
    }

    interface GraphAdj {
      toNodeId: string;
      edge: MapEdge;
      hazardPenalty: number;
      isCriticalBlocked: boolean;
      isBlocked: boolean;
    }

    const graph = new Map<string, GraphAdj[]>();
    for (const n of allNodes) {
      graph.set(n.nodeId, []);
    }

    let totalBlockedInGraph = 0;

    for (const edge of allEdges) {
      const fromN = nodeMap.get(edge.fromNodeId);
      const toN = nodeMap.get(edge.toNodeId);
      if (!fromN || !toN) continue;

      const isExplicitBlocked = edge.isBlocked || blockedEdgeIds.has(edge.edgeId);
      if (isExplicitBlocked) totalBlockedInGraph++;

      const { hazardPenalty, isCriticalBlocked } = computeEdgeHazardPenalty(
        edge,
        fromN,
        toN,
        hazardsList
      );

      const itemForward: GraphAdj = {
        toNodeId: edge.toNodeId,
        edge,
        hazardPenalty,
        isCriticalBlocked,
        isBlocked: isExplicitBlocked
      };

      graph.get(edge.fromNodeId)?.push(itemForward);

      if (edge.direction === 'BIDIRECTIONAL') {
        const itemReverse: GraphAdj = {
          toNodeId: edge.fromNodeId,
          edge,
          hazardPenalty,
          isCriticalBlocked,
          isBlocked: isExplicitBlocked
        };
        graph.get(edge.toNodeId)?.push(itemReverse);
      }
    }

    // Dijkstra Algorithm
    const weights = ROUTE_MODE_WEIGHTS[mode] || ROUTE_MODE_WEIGHTS.BALANCED;

    const distances = new Map<string, number>();
    const previous = new Map<string, { nodeId: string; edge: MapEdge; penalty: number }>();
    const visited = new Set<string>();

    for (const n of allNodes) {
      distances.set(n.nodeId, Infinity);
    }

    distances.set(originNode.nodeId, 0);

    let iterations = 0;

    while (visited.size < allNodes.length && iterations < MAX_GRAPH_ITERATIONS) {
      iterations++;

      // Find unvisited node with smallest distance
      let currentMinNodeId: string | null = null;
      let minDistance = Infinity;

      for (const [nodeId, dist] of distances.entries()) {
        if (!visited.has(nodeId) && dist < minDistance) {
          minDistance = dist;
          currentMinNodeId = nodeId;
        }
      }

      if (!currentMinNodeId || minDistance === Infinity) {
        break; // No reachable unvisited nodes left
      }

      if (currentMinNodeId === destinationNode.nodeId) {
        break; // Reached destination
      }

      visited.add(currentMinNodeId);

      const neighbors = graph.get(currentMinNodeId) || [];
      for (const neighbor of neighbors) {
        if (visited.has(neighbor.toNodeId)) continue;
        if (neighbor.isBlocked || neighbor.isCriticalBlocked) continue;

        // Calculate weighted edge cost
        const edgeCost =
          neighbor.edge.estimatedTravelSeconds * weights.timeWeight +
          neighbor.edge.distanceMeters * weights.distanceWeight +
          neighbor.hazardPenalty * weights.hazardWeight;

        const newDist = minDistance + edgeCost;
        if (newDist < (distances.get(neighbor.toNodeId) ?? Infinity)) {
          distances.set(neighbor.toNodeId, newDist);
          previous.set(neighbor.toNodeId, {
            nodeId: currentMinNodeId,
            edge: neighbor.edge,
            penalty: neighbor.hazardPenalty
          });
        }
      }
    }

    if (!visited.has(destinationNode.nodeId) && distances.get(destinationNode.nodeId) === Infinity) {
      return this.buildErrorResult({
        status: 'NO_ROUTE',
        explanation: `No safe route exists between ${originPoint.name || originNode.nodeId} and ${destinationPoint.name || destinationNode.nodeId} under current hazard and road conditions.`,
        mode,
        calculatedAt,
        algorithm,
        datasetVersion,
        originPoint,
        destinationPoint
      });
    }

    // Reconstruct path
    const nodePath: string[] = [];
    const edgePath: string[] = [];
    let currNodeId = destinationNode.nodeId;
    let totalDistMeters = 0;
    let totalTimeSeconds = 0;
    let totalHazardPenalty = 0;

    while (currNodeId) {
      nodePath.unshift(currNodeId);
      const prevInfo = previous.get(currNodeId);
      if (!prevInfo) break;

      edgePath.unshift(prevInfo.edge.edgeId);
      totalDistMeters += prevInfo.edge.distanceMeters;
      totalTimeSeconds += prevInfo.edge.estimatedTravelSeconds;
      totalHazardPenalty += prevInfo.penalty;

      currNodeId = prevInfo.nodeId;
    }

    const totalCost = Math.round(
      totalTimeSeconds * weights.timeWeight +
        totalDistMeters * weights.distanceWeight +
        totalHazardPenalty * weights.hazardWeight
    );

    // Calculate avoided hazards & blocked roads
    const activeBlockedEdgesSet = new Set<string>();
    for (const edge of allEdges) {
      if (edge.isBlocked) {
        activeBlockedEdgesSet.add(edge.edgeId);
      }
    }
    if (options.activeBlockedRoads) {
      for (const br of options.activeBlockedRoads) {
        if (!br.active) continue;
        if (br.expiresAt && new Date(br.expiresAt) < now) continue;
        activeBlockedEdgesSet.add(br.edgeId);
      }
    }
    const activeBlockedEdgesInNetworkCount = activeBlockedEdgesSet.size;

    let blockedEdgesAvoidedCount = 0;
    if (activeBlockedEdgesInNetworkCount > 0) {
      const baselineEdgePath = this.computeBaselineUnblockedPath(
        originNode.nodeId,
        destinationNode.nodeId,
        allNodes,
        allEdges,
        hazardsList,
        weights
      );

      for (const eId of baselineEdgePath) {
        if (activeBlockedEdgesSet.has(eId)) {
          blockedEdgesAvoidedCount++;
        }
      }
    }

    let avoidedHazardsCount = 0;

    for (const h of hazardsList) {
      let intersectsAnyUsed = false;
      for (const eId of edgePath) {
        const e = this.mapProvider.getEdge(eId);
        if (!e) continue;
        const fromN = nodeMap.get(e.fromNodeId);
        const toN = nodeMap.get(e.toNodeId);
        if (!fromN || !toN) continue;

        const dist = calculatePointToSegmentDistanceMeters(
          h.latitude,
          h.longitude,
          fromN.latitude,
          fromN.longitude,
          toN.latitude,
          toN.longitude
        );
        if (dist <= h.radiusMeters) {
          intersectsAnyUsed = true;
          break;
        }
      }
      if (!intersectsAnyUsed) {
        avoidedHazardsCount++;
      }
    }

    const explanation = this.generateRouteExplanation({
      mode,
      distanceMeters: totalDistMeters,
      travelTimeSeconds: totalTimeSeconds,
      hazardPenalty: totalHazardPenalty,
      avoidedHazards: avoidedHazardsCount,
      blockedEdgesAvoided: blockedEdgesAvoidedCount,
      activeBlockedEdgesInNetwork: activeBlockedEdgesInNetworkCount,
      nodeCount: nodePath.length
    });

    return {
      routeId: `route-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      incidentId: options.incidentId || null,
      origin: originPoint,
      destination: destinationPoint,
      nodePath,
      edgePath,
      distanceMeters: totalDistMeters,
      estimatedTravelSeconds: totalTimeSeconds,
      hazardPenalty: totalHazardPenalty,
      totalCost,
      avoidedHazards: avoidedHazardsCount,
      blockedEdgesAvoided: blockedEdgesAvoidedCount,
      activeBlockedEdgesInNetwork: activeBlockedEdgesInNetworkCount,
      calculatedAt,
      algorithm,
      mapDatasetVersion: datasetVersion,
      mode,
      routeStatus: 'FOUND',
      explanation
    };
  }

  private buildErrorResult(params: {
    status: RouteStatus;
    explanation: string;
    mode: RouteMode;
    calculatedAt: string;
    algorithm: string;
    datasetVersion: string;
    originPoint?: RoutePoint | null;
    destinationPoint?: RoutePoint | null;
  }): RouteResult {
    return {
      routeId: `route-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      incidentId: null,
      origin: params.originPoint || null,
      destination: params.destinationPoint || null,
      nodePath: [],
      edgePath: [],
      distanceMeters: 0,
      estimatedTravelSeconds: 0,
      hazardPenalty: 0,
      totalCost: 0,
      avoidedHazards: 0,
      blockedEdgesAvoided: 0,
      activeBlockedEdgesInNetwork: 0,
      calculatedAt: params.calculatedAt,
      algorithm: params.algorithm,
      mapDatasetVersion: params.datasetVersion,
      mode: params.mode,
      routeStatus: params.status,
      explanation: params.explanation
    };
  }

  private generateRouteExplanation(params: {
    mode: RouteMode;
    distanceMeters: number;
    travelTimeSeconds: number;
    hazardPenalty: number;
    avoidedHazards: number;
    blockedEdgesAvoided: number;
    activeBlockedEdgesInNetwork: number;
    nodeCount: number;
  }): string {
    const minTime = Math.floor(params.travelTimeSeconds / 60);
    const secTime = params.travelTimeSeconds % 60;
    const timeStr = minTime > 0 ? `${minTime}m ${secTime}s` : `${secTime}s`;
    const distStr =
      params.distanceMeters >= 1000
        ? `${(params.distanceMeters / 1000).toFixed(2)} km`
        : `${params.distanceMeters} m`;

    let hazardDesc = 'NONE';
    if (params.hazardPenalty > 1000) hazardDesc = 'HIGH EXPOSURE';
    else if (params.hazardPenalty > 300) hazardDesc = 'MODERATE EXPOSURE';
    else if (params.hazardPenalty > 0) hazardDesc = 'LOW EXPOSURE';

    const blockedPart = `Active blocked roads in network: ${params.activeBlockedEdgesInNetwork}${
      params.blockedEdgesAvoided > 0 ? `, Blocked roads bypassed: ${params.blockedEdgesAvoided}` : ''
    }`;

    if (params.mode === 'SAFEST') {
      return `Selected route (${distStr}, ${timeStr}) prioritizes hazard avoidance and maximum safety (Hazard Penalty: ${params.hazardPenalty}, Avoided Hazards: ${params.avoidedHazards}, ${blockedPart}).`;
    } else if (params.mode === 'FASTEST') {
      return `Selected route (${distStr}, ${timeStr}) minimizes total estimated travel time under the local road graph (Hazard Penalty: ${params.hazardPenalty}, ${blockedPart}).`;
    } else {
      return `Selected route (${distStr}, ${timeStr}) balances travel time, distance, and hazard exposure (Hazard Exposure: ${hazardDesc}, Avoided Hazards: ${params.avoidedHazards}, ${blockedPart}).`;
    }
  }

  private computeBaselineUnblockedPath(
    originNodeId: string,
    destinationNodeId: string,
    allNodes: MapNode[],
    allEdges: MapEdge[],
    hazardsList: Hazard[],
    weights: { timeWeight: number; distanceWeight: number; hazardWeight: number }
  ): string[] {
    const nodeMap = new Map<string, MapNode>();
    for (const n of allNodes) {
      nodeMap.set(n.nodeId, n);
    }

    const graph = new Map<string, Array<{ toNodeId: string; edge: MapEdge; hazardPenalty: number; isCriticalBlocked: boolean }>>();
    for (const n of allNodes) {
      graph.set(n.nodeId, []);
    }

    for (const edge of allEdges) {
      const fromN = nodeMap.get(edge.fromNodeId);
      const toN = nodeMap.get(edge.toNodeId);
      if (!fromN || !toN) continue;

      const { hazardPenalty, isCriticalBlocked } = computeEdgeHazardPenalty(edge, fromN, toN, hazardsList);

      graph.get(edge.fromNodeId)?.push({
        toNodeId: edge.toNodeId,
        edge,
        hazardPenalty,
        isCriticalBlocked
      });

      if (edge.direction === 'BIDIRECTIONAL') {
        graph.get(edge.toNodeId)?.push({
          toNodeId: edge.fromNodeId,
          edge,
          hazardPenalty,
          isCriticalBlocked
        });
      }
    }

    const distances = new Map<string, number>();
    const previous = new Map<string, { nodeId: string; edge: MapEdge }>();
    const visited = new Set<string>();

    for (const n of allNodes) {
      distances.set(n.nodeId, Infinity);
    }
    distances.set(originNodeId, 0);

    let iterations = 0;
    while (visited.size < allNodes.length && iterations < MAX_GRAPH_ITERATIONS) {
      iterations++;
      let currentMinNodeId: string | null = null;
      let minDistance = Infinity;

      for (const [nodeId, dist] of distances.entries()) {
        if (!visited.has(nodeId) && dist < minDistance) {
          minDistance = dist;
          currentMinNodeId = nodeId;
        }
      }

      if (!currentMinNodeId || minDistance === Infinity) break;
      if (currentMinNodeId === destinationNodeId) break;

      visited.add(currentMinNodeId);

      const neighbors = graph.get(currentMinNodeId) || [];
      for (const neighbor of neighbors) {
        if (visited.has(neighbor.toNodeId)) continue;
        if (neighbor.isCriticalBlocked) continue; // Critical hazard zones block traversal regardless

        const edgeCost =
          neighbor.edge.estimatedTravelSeconds * weights.timeWeight +
          neighbor.edge.distanceMeters * weights.distanceWeight +
          neighbor.hazardPenalty * weights.hazardWeight;

        const newDist = minDistance + edgeCost;
        if (newDist < (distances.get(neighbor.toNodeId) ?? Infinity)) {
          distances.set(neighbor.toNodeId, newDist);
          previous.set(neighbor.toNodeId, {
            nodeId: currentMinNodeId,
            edge: neighbor.edge
          });
        }
      }
    }

    if (!visited.has(destinationNodeId) && distances.get(destinationNodeId) === Infinity) {
      return [];
    }

    const edgePath: string[] = [];
    let currId = destinationNodeId;
    while (currId) {
      const prevInfo = previous.get(currId);
      if (!prevInfo) break;
      edgePath.unshift(prevInfo.edge.edgeId);
      currId = prevInfo.nodeId;
    }

    return edgePath;
  }
}
