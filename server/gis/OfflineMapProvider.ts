import {
  MapNode,
  MapEdge,
  MapMetadata,
  Hazard,
  BlockedRoad
} from './types.ts';
import {
  SYNTHETIC_MAP_METADATA,
  SYNTHETIC_MAP_NODES,
  SYNTHETIC_MAP_EDGES
} from './syntheticDataset.ts';

export const MAX_SNAP_DISTANCE_METERS = 5000;

export interface OfflineMapProvider {
  getMapMetadata(): MapMetadata;
  getNodes(): MapNode[];
  getEdges(): MapEdge[];
  getNode(nodeId: string): MapNode | null;
  getEdge(edgeId: string): MapEdge | null;
  getNearestNode(
    latitude: number | null | undefined,
    longitude: number | null | undefined,
    maxSnapDistanceMeters?: number
  ): { node: MapNode; distanceMeters: number } | null;
  getNearbyNodes(
    latitude: number,
    longitude: number,
    maxDistanceMeters: number
  ): { node: MapNode; distanceMeters: number }[];
  addNode(node: MapNode): void;
  addEdge(edge: MapEdge): void;
  resetToSyntheticDemo(): void;
}

export function calculateHaversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  if (lat1 === lat2 && lon1 === lon2) return 0;
  const R = 6371000; // Earth radius in meters
  const rad = Math.PI / 180;
  const dLat = (lat2 - lat1) * rad;
  const dLon = (lon2 - lon1) * rad;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * rad) *
      Math.cos(lat2 * rad) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

export class LocalGraphMapProvider implements OfflineMapProvider {
  private metadata: MapMetadata;
  private nodesMap: Map<string, MapNode> = new Map();
  private edgesMap: Map<string, MapEdge> = new Map();

  constructor() {
    this.metadata = { ...SYNTHETIC_MAP_METADATA };
    this.loadSyntheticDataset();
  }

  public loadSyntheticDataset(): void {
    this.nodesMap.clear();
    this.edgesMap.clear();

    for (const node of SYNTHETIC_MAP_NODES) {
      this.addNodeInternal(node);
    }

    for (const edge of SYNTHETIC_MAP_EDGES) {
      this.addEdgeInternal(edge);
    }

    this.updateMetadata();
  }

  public resetToSyntheticDemo(): void {
    this.loadSyntheticDataset();
  }

  public getMapMetadata(): MapMetadata {
    this.updateMetadata();
    return { ...this.metadata };
  }

  public getNodes(): MapNode[] {
    return Array.from(this.nodesMap.values());
  }

  public getEdges(): MapEdge[] {
    return Array.from(this.edgesMap.values());
  }

  public getNode(nodeId: string): MapNode | null {
    if (!nodeId || typeof nodeId !== 'string') return null;
    return this.nodesMap.get(nodeId) || null;
  }

  public getEdge(edgeId: string): MapEdge | null {
    if (!edgeId || typeof edgeId !== 'string') return null;
    return this.edgesMap.get(edgeId) || null;
  }

  public validateNode(node: MapNode): void {
    if (!node || typeof node !== 'object') {
      throw new Error('Node must be a valid object');
    }
    if (!node.nodeId || typeof node.nodeId !== 'string' || !node.nodeId.trim()) {
      throw new Error('Node ID is required and must be a non-empty string');
    }
    if (!node.name || typeof node.name !== 'string' || !node.name.trim()) {
      throw new Error('Node name is required');
    }
    if (
      typeof node.latitude !== 'number' ||
      isNaN(node.latitude) ||
      node.latitude < -90 ||
      node.latitude > 90
    ) {
      throw new Error(`Invalid node latitude: ${node.latitude}. Must be between -90 and 90.`);
    }
    if (
      typeof node.longitude !== 'number' ||
      isNaN(node.longitude) ||
      node.longitude < -180 ||
      node.longitude > 180
    ) {
      throw new Error(`Invalid node longitude: ${node.longitude}. Must be between -180 and 180.`);
    }
  }

  public validateEdge(edge: MapEdge): void {
    if (!edge || typeof edge !== 'object') {
      throw new Error('Edge must be a valid object');
    }
    if (!edge.edgeId || typeof edge.edgeId !== 'string' || !edge.edgeId.trim()) {
      throw new Error('Edge ID is required and must be a non-empty string');
    }
    if (!edge.fromNodeId || !this.nodesMap.has(edge.fromNodeId)) {
      throw new Error(`Edge references invalid fromNodeId: ${edge.fromNodeId}`);
    }
    if (!edge.toNodeId || !this.nodesMap.has(edge.toNodeId)) {
      throw new Error(`Edge references invalid toNodeId: ${edge.toNodeId}`);
    }
    if (edge.fromNodeId === edge.toNodeId) {
      throw new Error(`Self-loop edge from ${edge.fromNodeId} to ${edge.toNodeId} is not allowed`);
    }
    if (typeof edge.distanceMeters !== 'number' || isNaN(edge.distanceMeters) || edge.distanceMeters < 0) {
      throw new Error(`Invalid edge distanceMeters: ${edge.distanceMeters}. Must be >= 0.`);
    }
    if (
      typeof edge.estimatedTravelSeconds !== 'number' ||
      isNaN(edge.estimatedTravelSeconds) ||
      edge.estimatedTravelSeconds < 0
    ) {
      throw new Error(
        `Invalid edge estimatedTravelSeconds: ${edge.estimatedTravelSeconds}. Must be >= 0.`
      );
    }
  }

  public addNode(node: MapNode): void {
    this.validateNode(node);
    if (this.nodesMap.has(node.nodeId)) {
      throw new Error(`Duplicate node ID rejected: ${node.nodeId}`);
    }
    this.addNodeInternal(node);
    this.updateMetadata();
  }

  public addEdge(edge: MapEdge): void {
    this.validateEdge(edge);
    if (this.edgesMap.has(edge.edgeId)) {
      throw new Error(`Duplicate edge ID rejected: ${edge.edgeId}`);
    }
    this.addEdgeInternal(edge);
    this.updateMetadata();
  }

  private addNodeInternal(node: MapNode): void {
    this.validateNode(node);
    this.nodesMap.set(node.nodeId, { ...node });
  }

  private addEdgeInternal(edge: MapEdge): void {
    this.validateEdge(edge);
    this.edgesMap.set(edge.edgeId, { ...edge });
  }

  public getNearestNode(
    latitude: number | null | undefined,
    longitude: number | null | undefined,
    maxSnapDistanceMeters: number = MAX_SNAP_DISTANCE_METERS
  ): { node: MapNode; distanceMeters: number } | null {
    if (
      latitude === null ||
      latitude === undefined ||
      longitude === null ||
      longitude === undefined ||
      typeof latitude !== 'number' ||
      typeof longitude !== 'number' ||
      isNaN(latitude) ||
      isNaN(longitude) ||
      latitude < -90 ||
      latitude > 90 ||
      longitude < -180 ||
      longitude > 180
    ) {
      return null;
    }

    let nearest: MapNode | null = null;
    let minDistance = Infinity;

    for (const node of this.nodesMap.values()) {
      const dist = calculateHaversineDistance(
        latitude,
        longitude,
        node.latitude,
        node.longitude
      );
      if (dist < minDistance) {
        minDistance = dist;
        nearest = node;
      }
    }

    if (!nearest) return null;

    // Enforce maximum snap distance to prevent arbitrary/far coordinates from snapping to graph
    if (minDistance > maxSnapDistanceMeters) {
      return null;
    }

    return {
      node: { ...nearest },
      distanceMeters: minDistance
    };
  }

  public getNearbyNodes(
    latitude: number,
    longitude: number,
    maxDistanceMeters: number
  ): { node: MapNode; distanceMeters: number }[] {
    if (
      typeof latitude !== 'number' ||
      typeof longitude !== 'number' ||
      isNaN(latitude) ||
      isNaN(longitude) ||
      latitude < -90 ||
      latitude > 90 ||
      longitude < -180 ||
      longitude > 180 ||
      typeof maxDistanceMeters !== 'number' ||
      maxDistanceMeters < 0
    ) {
      return [];
    }

    const results: { node: MapNode; distanceMeters: number }[] = [];

    for (const node of this.nodesMap.values()) {
      const dist = calculateHaversineDistance(
        latitude,
        longitude,
        node.latitude,
        node.longitude
      );
      if (dist <= maxDistanceMeters) {
        results.push({ node: { ...node }, distanceMeters: dist });
      }
    }

    results.sort((a, b) => a.distanceMeters - b.distanceMeters);
    return results;
  }

  private updateMetadata(): void {
    let minLat = 90;
    let maxLat = -90;
    let minLng = 180;
    let maxLng = -180;

    for (const node of this.nodesMap.values()) {
      if (node.latitude < minLat) minLat = node.latitude;
      if (node.latitude > maxLat) maxLat = node.latitude;
      if (node.longitude < minLng) minLng = node.longitude;
      if (node.longitude > maxLng) maxLng = node.longitude;
    }

    if (this.nodesMap.size === 0) {
      minLat = -90;
      maxLat = 90;
      minLng = -180;
      maxLng = 180;
    }

    this.metadata = {
      datasetName: 'SYNTHETIC OFFLINE TRAINING / DEMONSTRATION MAP',
      version: '2.0.0',
      nodeCount: this.nodesMap.size,
      edgeCount: this.edgesMap.size,
      isSyntheticDemo: true,
      boundingBox: { minLat, maxLat, minLng, maxLng },
      lastUpdated: new Date().toISOString()
    };
  }
}

export const offlineMapProvider = new LocalGraphMapProvider();
