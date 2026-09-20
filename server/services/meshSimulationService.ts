import crypto from 'crypto';
import { db } from '../db/database.ts';
import {
  SimulatedMeshNode,
  SimulatedMeshPacket,
  SimulatedMeshEvent,
  MeshSimulationConfig,
  MeshMetricsData,
  MeshPacketType,
  MeshPacketPayload,
  Incident
} from '../db/schema.ts';

/**
 * Generate a unique collision-resistant packet ID.
 * Format: PKT-YYYYMMDD-HEX6 (e.g., PKT-20260920-A4B7C9)
 */
export function generatePacketId(): string {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
  const randomHex = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `PKT-${dateStr}-${randomHex}`;
}

/**
 * Validate a user-provided or client-controlled packet ID.
 * Must be 3-64 alphanumeric characters, underscores, or hyphens.
 */
export function validatePacketId(packetId: string): boolean {
  if (typeof packetId !== 'string') return false;
  const trimmed = packetId.trim();
  if (trimmed.length < 3 || trimmed.length > 64) return false;
  return /^[A-Za-z0-9_-]+$/.test(trimmed);
}

export interface SimulateTransmissionParams {
  sourceNodeId: string;
  destinationNodeId: string;
  packetId?: string;
  messageType?: MeshPacketType;
  payload: MeshPacketPayload;
  incidentId?: string;
  incidentNumber?: string;
  initialTtl?: number;
  maxHops?: number;
  ackRequested?: boolean;
  forcedLoss?: boolean;
  forcedAckLoss?: boolean;
  forcedDelayMs?: number;
}

export class MeshSimulationService {
  /**
   * Find shortest path between online nodes in the simulated mesh network using BFS.
   * Includes loop prevention by tracking visited nodes during path exploration.
   */
  public findRoute(sourceId: string, destId: string, nodes: SimulatedMeshNode[]): string[] | null {
    if (sourceId === destId) return [sourceId];

    const nodeMap = new Map<string, SimulatedMeshNode>();
    for (const n of nodes) {
      nodeMap.set(n.nodeId.toUpperCase(), n);
    }

    const sourceNode = nodeMap.get(sourceId.toUpperCase());
    const destNode = nodeMap.get(destId.toUpperCase());

    if (!sourceNode || !destNode) return null;
    if (sourceNode.status !== 'ONLINE' || destNode.status !== 'ONLINE') return null;

    const queue: string[][] = [[sourceNode.nodeId]];
    const visited = new Set<string>([sourceNode.nodeId.toUpperCase()]);

    while (queue.length > 0) {
      const path = queue.shift()!;
      const currentId = path[path.length - 1];

      if (currentId.toUpperCase() === destId.toUpperCase()) {
        return path;
      }

      const current = nodeMap.get(currentId.toUpperCase());
      if (!current || current.status !== 'ONLINE') continue;

      for (const neighborId of current.neighbors || []) {
        const neighborUpper = neighborId.toUpperCase();
        const neighborNode = nodeMap.get(neighborUpper);

        if (neighborNode && neighborNode.status === 'ONLINE' && !visited.has(neighborUpper)) {
          visited.add(neighborUpper);
          queue.push([...path, neighborNode.nodeId]);
        }
      }
    }

    return null;
  }

  /**
   * Run full simulated packet lifecycle through the mesh network.
   */
  public simulatePacketTransmission(params: SimulateTransmissionParams): SimulatedMeshPacket {
    const config = db.getMeshConfig();
    const nodes = db.getSimulatedNodes();
    const nodeMap = new Map<string, SimulatedMeshNode>();
    for (const n of nodes) {
      nodeMap.set(n.nodeId.toUpperCase(), n);
    }

    const initialTtl = params.initialTtl !== undefined ? params.initialTtl : config.initialTtl;
    const maxHops = params.maxHops !== undefined ? params.maxHops : config.maxHops;
    const ackRequested = params.ackRequested !== undefined ? params.ackRequested : true;

    // Determine packet ID: use provided ID or generate a new one
    let packetId: string;
    if (params.packetId !== undefined && params.packetId !== null) {
      const cleanId = String(params.packetId).trim();
      if (!validatePacketId(cleanId)) {
        throw new Error(`Invalid packetId "${params.packetId}". Must be 3 to 64 alphanumeric characters, hyphens, or underscores.`);
      }
      packetId = cleanId;
    } else {
      packetId = generatePacketId();
    }

    // 1. GENUINE DUPLICATE PACKET DETECTION (Packet Identity check)
    const existingPacket = db.findMeshPacketById(packetId);
    if (existingPacket) {
      // The same packetId is reaching the network/node again
      const newDuplicateCount = (existingPacket.duplicateCount || 0) + 1;
      existingPacket.duplicateCount = newDuplicateCount;

      db.logMeshEvent({
        packetId: existingPacket.packetId,
        nodeId: params.sourceNodeId,
        eventType: 'DUPLICATE_DROPPED',
        message: `Duplicate packet ${existingPacket.packetId} detected at node ${params.sourceNodeId}. Packet discarded to prevent redundant forwarding (Duplicate count: ${newDuplicateCount}).`,
        details: {
          duplicateCount: newDuplicateCount,
          originalStatus: existingPacket.status,
          sourceNodeId: params.sourceNodeId,
          destinationNodeId: params.destinationNodeId
        }
      });

      db.updateMeshPacket(existingPacket.packetId, {
        duplicateCount: newDuplicateCount
      });

      // Return duplicate event result with status 'DUPLICATE_DROPPED'
      const duplicateResult: SimulatedMeshPacket = {
        ...existingPacket,
        status: 'DUPLICATE_DROPPED',
        duplicateCount: newDuplicateCount,
        dropReason: 'DUPLICATE_DROPPED'
      };
      return duplicateResult;
    }

    const nowIso = new Date().toISOString();
    const sourceNode = nodeMap.get(params.sourceNodeId.toUpperCase());
    const destNode = nodeMap.get(params.destinationNodeId.toUpperCase());

    const packet: SimulatedMeshPacket = {
      packetId,
      messageType: params.messageType || 'INCIDENT_REPORT',
      sourceNodeId: params.sourceNodeId,
      destinationNodeId: params.destinationNodeId,
      incidentId: params.incidentId,
      incidentNumber: params.incidentNumber,
      createdAt: nowIso,
      ttl: initialTtl,
      initialTtl,
      hopCount: 0,
      payload: params.payload,
      status: 'QUEUED',
      path: [params.sourceNodeId],
      duplicateCount: 0,
      ackRequested,
      ackReceived: false,
      firstSentAt: nowIso
    };

    // Log packet creation event
    db.logMeshEvent({
      packetId,
      nodeId: params.sourceNodeId,
      eventType: 'PACKET_CREATED',
      message: `Packet ${packetId} initialized at node ${params.sourceNodeId} (TTL: ${initialTtl}, Max Hops: ${maxHops})`,
      details: { initialTtl, maxHops, ackRequested, destination: params.destinationNodeId }
    });

    // Check source node state
    if (!sourceNode || sourceNode.status !== 'ONLINE') {
      packet.status = 'DROPPED';
      packet.dropReason = 'NODE_OFFLINE';
      db.logMeshEvent({
        packetId,
        nodeId: params.sourceNodeId,
        eventType: 'NODE_OFFLINE',
        message: `Transmission aborted: Source node ${params.sourceNodeId} is OFFLINE`,
        details: { sourceNodeId: params.sourceNodeId }
      });
      db.insertMeshPacket(packet);
      return packet;
    }

    // Check destination node state
    if (!destNode || destNode.status !== 'ONLINE') {
      packet.status = 'DROPPED';
      packet.dropReason = 'NODE_OFFLINE';
      db.logMeshEvent({
        packetId,
        nodeId: params.destinationNodeId,
        eventType: 'NODE_OFFLINE',
        message: `Transmission aborted: Destination node ${params.destinationNodeId} is OFFLINE`,
        details: { destinationNodeId: params.destinationNodeId }
      });
      db.insertMeshPacket(packet);
      return packet;
    }

    // Find route through online mesh nodes
    const route = this.findRoute(params.sourceNodeId, params.destinationNodeId, nodes);
    if (!route || route.length === 0) {
      packet.status = 'DROPPED';
      packet.dropReason = 'NO_ROUTE';
      db.logMeshEvent({
        packetId,
        nodeId: params.sourceNodeId,
        eventType: 'PACKET_DROPPED',
        message: `No active route found between ${params.sourceNodeId} and ${params.destinationNodeId}`,
        details: { reason: 'NO_ONLINE_PATH' }
      });
      db.insertMeshPacket(packet);
      return packet;
    }

    // Process hops along route
    packet.status = 'IN_TRANSIT';
    let currentTtl = initialTtl;
    let currentHops = 0;
    let accumulatedLatencyMs = 0;
    const traversedPath: string[] = [params.sourceNodeId];
    const visitedNodesInRoute = new Set<string>([params.sourceNodeId.toUpperCase()]);

    for (let i = 1; i < route.length; i++) {
      const nextNodeId = route[i];
      const nextNode = nodeMap.get(nextNodeId.toUpperCase());

      // In-route loop prevention
      if (visitedNodesInRoute.has(nextNodeId.toUpperCase())) {
        packet.duplicateCount += 1;
        packet.status = 'DUPLICATE_DROPPED';
        packet.dropReason = 'DUPLICATE_DETECTED';
        db.logMeshEvent({
          packetId,
          nodeId: nextNodeId,
          eventType: 'DUPLICATE_DROPPED',
          message: `In-route duplicate packet ${packetId} dropped at node ${nextNodeId} to prevent routing loop`,
          details: { hop: currentHops + 1, node: nextNodeId }
        });
        break;
      }
      visitedNodesInRoute.add(nextNodeId.toUpperCase());

      // Decrement TTL & Increment Hops
      currentTtl -= 1;
      currentHops += 1;

      // Check TTL expiration
      if (currentTtl <= 0) {
        packet.ttl = 0;
        packet.hopCount = currentHops;
        packet.status = 'TTL_EXPIRED';
        packet.dropReason = 'TTL_EXPIRED';
        packet.path = [...traversedPath, nextNodeId];
        db.logMeshEvent({
          packetId,
          nodeId: nextNodeId,
          eventType: 'TTL_EXPIRED',
          message: `Packet ${packetId} TTL expired at node ${nextNodeId} (Hop ${currentHops})`,
          details: { hop: currentHops, ttl: currentTtl }
        });
        break;
      }

      // Check MAX_HOPS enforcement
      if (currentHops > maxHops) {
        packet.ttl = currentTtl;
        packet.hopCount = currentHops;
        packet.status = 'MAX_HOPS_EXCEEDED';
        packet.dropReason = 'MAX_HOPS_EXCEEDED';
        packet.path = [...traversedPath, nextNodeId];
        db.logMeshEvent({
          packetId,
          nodeId: nextNodeId,
          eventType: 'MAX_HOPS_EXCEEDED',
          message: `Packet ${packetId} dropped: Maximum hop limit (${maxHops}) exceeded at node ${nextNodeId}`,
          details: { maxHops, currentHops, reason: 'MAX_HOPS_EXCEEDED' }
        });
        break;
      }

      // Packet Loss Check (Simulated)
      const lossProbability = params.forcedLoss !== undefined ? (params.forcedLoss ? 1.0 : 0.0) : config.packetLossRate;
      const isLost = !config.deterministicMode && params.forcedLoss === undefined
        ? (Math.random() < lossProbability)
        : (params.forcedLoss === true);

      if (isLost) {
        packet.ttl = currentTtl;
        packet.hopCount = currentHops;
        packet.status = 'DROPPED';
        packet.lossSimulated = true;
        packet.dropReason = 'SIMULATED_PACKET_LOSS';
        packet.path = [...traversedPath, nextNodeId];
        db.logMeshEvent({
          packetId,
          nodeId: nextNodeId,
          eventType: 'PACKET_DROPPED',
          message: `Simulated RF packet loss occurred during relay to node ${nextNodeId}`,
          details: { hop: currentHops, lossRate: lossProbability }
        });
        break;
      }

      // Latency Simulation
      const hopDelay = params.forcedDelayMs !== undefined
        ? params.forcedDelayMs
        : config.deterministicMode
          ? Math.round((config.minimumLatencyMs + config.maximumLatencyMs) / 2)
          : Math.round(config.minimumLatencyMs + Math.random() * (config.maximumLatencyMs - config.minimumLatencyMs));
      accumulatedLatencyMs += hopDelay;

      traversedPath.push(nextNodeId);

      // Node last seen updated
      if (nextNode) {
        db.updateSimulatedNode(nextNodeId, { lastSeen: new Date().toISOString() });
      }

      if (i < route.length - 1) {
        // Relay node forwarded
        db.logMeshEvent({
          packetId,
          nodeId: nextNodeId,
          eventType: 'PACKET_FORWARDED',
          message: `Packet ${packetId} forwarded by ${nextNodeId} -> ${route[i + 1]} (Hop ${currentHops}, Delay ${hopDelay}ms)`,
          details: { hop: currentHops, delayMs: hopDelay, remainingTtl: currentTtl }
        });
      } else {
        // Delivered at destination
        packet.ttl = currentTtl;
        packet.hopCount = currentHops;
        packet.status = 'DELIVERED';
        packet.path = traversedPath;
        packet.deliveredAt = new Date().toISOString();
        packet.latencyMs = accumulatedLatencyMs;

        db.logMeshEvent({
          packetId,
          nodeId: nextNodeId,
          eventType: 'PACKET_DELIVERED',
          message: `Packet ${packetId} delivered to destination ${nextNodeId} in ${currentHops} hops (${accumulatedLatencyMs}ms total latency)`,
          details: { hopCount: currentHops, latencyMs: accumulatedLatencyMs }
        });

        // Automatic ACK generation & propagation if requested
        if (ackRequested && config.autoAck) {
          const ackPacketId = generatePacketId();
          packet.ackPacketId = ackPacketId;

          db.logMeshEvent({
            packetId,
            nodeId: params.destinationNodeId,
            eventType: 'ACK_CREATED',
            message: `ACK packet ${ackPacketId} created for original packet ${packetId}`,
            details: { ackPacketId, originalPacketId: packetId }
          });

          // Simulate ACK return journey (reverse path)
          // ACK path must verify every node in the reverse path is ONLINE
          const reverseRoute = [...route].reverse();
          let ackLatency = 0;
          let ackFailed = false;

          for (let r = 1; r < reverseRoute.length; r++) {
            const reverseNodeId = reverseRoute[r];
            const currentReverseNode = nodeMap.get(reverseNodeId.toUpperCase());

            // 1. Verify node state in reverse path
            if (!currentReverseNode || currentReverseNode.status !== 'ONLINE') {
              ackFailed = true;
              packet.ackReceived = false;
              db.logMeshEvent({
                packetId,
                nodeId: reverseNodeId,
                eventType: 'ACK_FAILED',
                message: `ACK ${ackPacketId} failed: Node ${reverseNodeId} in reverse path is OFFLINE`,
                details: { ackPacketId, originalPacketId: packetId, offlineNodeId: reverseNodeId, hop: r }
              });
              break;
            }

            // 2. Check ACK Packet Loss Simulation
            const ackLossProb = params.forcedAckLoss !== undefined
              ? (params.forcedAckLoss ? 1.0 : 0.0)
              : (config.ackPacketLossRate || 0.0);

            const isAckLost = !config.deterministicMode && params.forcedAckLoss === undefined
              ? (Math.random() < ackLossProb)
              : (params.forcedAckLoss === true);

            if (isAckLost) {
              ackFailed = true;
              packet.ackReceived = false;
              db.logMeshEvent({
                packetId,
                nodeId: reverseNodeId,
                eventType: 'ACK_LOST',
                message: `Simulated RF packet loss occurred during ACK return at node ${reverseNodeId}`,
                details: { ackPacketId, originalPacketId: packetId, hop: r, lossRate: ackLossProb }
              });
              break;
            }

            const ackHopDelay = params.forcedDelayMs !== undefined
              ? params.forcedDelayMs
              : config.deterministicMode
                ? Math.round((config.minimumLatencyMs + config.maximumLatencyMs) / 2)
                : Math.round(config.minimumLatencyMs + Math.random() * (config.maximumLatencyMs - config.minimumLatencyMs));
            ackLatency += ackHopDelay;

            if (r < reverseRoute.length - 1) {
              db.logMeshEvent({
                packetId,
                nodeId: reverseRoute[r],
                eventType: 'ACK_FORWARDED',
                message: `ACK ${ackPacketId} forwarded by ${reverseRoute[r]} -> ${reverseRoute[r + 1]}`,
                details: { ackPacketId, hop: r, delayMs: ackHopDelay }
              });
            }
          }

          if (!ackFailed) {
            packet.status = 'ACKNOWLEDGED';
            packet.ackReceived = true;
            packet.acknowledgedAt = new Date().toISOString();
            packet.totalLatencyMs = accumulatedLatencyMs + ackLatency;

            db.logMeshEvent({
              packetId,
              nodeId: params.sourceNodeId,
              eventType: 'ACK_RECEIVED',
              message: `ACK ${ackPacketId} received at source ${params.sourceNodeId}. Roundtrip latency: ${packet.totalLatencyMs}ms`,
              details: { ackPacketId, originalPacketId: packetId, roundtripLatencyMs: packet.totalLatencyMs }
            });
          }
        }
      }
    }

    packet.path = traversedPath;
    packet.ttl = currentTtl;
    packet.hopCount = currentHops;
    db.insertMeshPacket(packet);
    return packet;
  }

  /**
   * Simulate sending a real incident through the mesh network.
   */
  public simulateIncidentBroadcast(
    incidentIdOrNumber: string,
    sourceNodeId?: string,
    destinationNodeId?: string
  ): { packet: SimulatedMeshPacket; incident: Incident } {
    const incident = db.getIncidents().find(
      i => i.id === incidentIdOrNumber || i.incidentNumber === incidentIdOrNumber
    );

    if (!incident) {
      throw new Error(`Incident "${incidentIdOrNumber}" was not found.`);
    }

    const nodes = db.getSimulatedNodes();
    const defaultSource = sourceNodeId || nodes.find(n => n.nodeType === 'FIELD' && n.status === 'ONLINE')?.nodeId || 'FIELD-01';
    const defaultDest = destinationNodeId || nodes.find(n => n.nodeType === 'COMMAND' && n.status === 'ONLINE')?.nodeId || 'COMMAND-01';

    const payload: MeshPacketPayload = {
      incidentId: incident.id,
      incidentNumber: incident.incidentNumber,
      title: incident.title,
      severity: incident.severity,
      locationText: incident.location?.address || incident.location?.gridSquare || 'Grid Loc Alpha',
      latitude: incident.location?.latitude,
      longitude: incident.location?.longitude,
      summary: incident.description.length > 120 ? `${incident.description.substring(0, 117)}...` : incident.description
    };

    const packet = this.simulatePacketTransmission({
      sourceNodeId: defaultSource,
      destinationNodeId: defaultDest,
      messageType: 'INCIDENT_REPORT',
      incidentId: incident.id,
      incidentNumber: incident.incidentNumber,
      payload,
      ackRequested: true
    });

    return { packet, incident };
  }

  /**
   * Calculate live real-time metrics derived strictly from actual simulation runs.
   * If 0 packets have been simulated, returns "No simulation data" rather than fake values.
   */
  public getSimulationMetrics(): MeshMetricsData {
    const packets = db.getMeshPackets();
    const events = db.getMeshEvents();
    const nodes = db.getSimulatedNodes();

    const activeNodes = nodes.filter(n => n.status === 'ONLINE');
    const totalTransmitted = packets.length;

    if (totalTransmitted === 0) {
      return {
        meshStatus: 'SIMULATION MODE ACTIVE',
        isSimulation: true,
        totalTransmitted: 0,
        totalDelivered: 0,
        totalAcknowledged: 0,
        totalDropped: 0,
        totalDuplicates: 0,
        totalEvents: events.length,
        packetDeliveryRate: 'No simulation data',
        packetLossRate: 'No simulation data',
        averageHopCount: 'No simulation data',
        averageLatencyMs: 'No simulation data',
        duplicateRate: 'No simulation data',
        ackSuccessRate: 'No simulation data',
        activeNodeCount: activeNodes.length,
        totalNodeCount: nodes.length,
        notice: 'SIMULATION MODE — No physical LoRa/Meshtastic transmission is occurring. All packet routing, hop counts, latencies, and signal values are simulated locally.'
      };
    }

    const deliveredPackets = packets.filter(p => p.status === 'DELIVERED' || p.status === 'ACKNOWLEDGED');
    const acknowledgedPackets = packets.filter(p => p.status === 'ACKNOWLEDGED');
    const droppedPackets = packets.filter(p => p.status === 'DROPPED' || p.status === 'TTL_EXPIRED' || p.status === 'DUPLICATE_DROPPED');
    const totalDuplicates = packets.reduce((acc, p) => acc + (p.duplicateCount || 0), 0);

    const deliveryRateNum = (deliveredPackets.length / totalTransmitted) * 100;
    const lossRateNum = (droppedPackets.length / totalTransmitted) * 100;

    let avgHops = '0.0 hops';
    let avgLatency = '0 ms (simulated)';
    if (deliveredPackets.length > 0) {
      const totalHops = deliveredPackets.reduce((acc, p) => acc + (p.hopCount || 0), 0);
      avgHops = `${(totalHops / deliveredPackets.length).toFixed(1)} hops`;

      const validLatencies = deliveredPackets.filter(p => p.latencyMs !== undefined);
      if (validLatencies.length > 0) {
        const sumLatency = validLatencies.reduce((acc, p) => acc + (p.latencyMs || 0), 0);
        avgLatency = `${Math.round(sumLatency / validLatencies.length)} ms (simulated)`;
      }
    }

    // Packet-level duplicate definition: ratio of duplicate packet attempts to total transmission/processing attempts (totalTransmitted + totalDuplicates)
    const totalAttempts = totalTransmitted + totalDuplicates;
    const duplicateRateNum = totalAttempts > 0 ? (totalDuplicates / totalAttempts) * 100 : 0;
    const ackRateNum = deliveredPackets.length > 0 ? (acknowledgedPackets.length / deliveredPackets.length) * 100 : 0;

    return {
      meshStatus: 'SIMULATION MODE ACTIVE',
      isSimulation: true,
      totalTransmitted,
      totalDelivered: deliveredPackets.length,
      totalAcknowledged: acknowledgedPackets.length,
      totalDropped: droppedPackets.length,
      totalDuplicates,
      totalEvents: events.length,
      packetDeliveryRate: `${deliveryRateNum.toFixed(1)}%`,
      packetLossRate: `${lossRateNum.toFixed(1)}%`,
      averageHopCount: avgHops,
      averageLatencyMs: avgLatency,
      duplicateRate: `${duplicateRateNum.toFixed(1)}%`,
      ackSuccessRate: `${ackRateNum.toFixed(1)}%`,
      activeNodeCount: activeNodes.length,
      totalNodeCount: nodes.length,
      notice: 'SIMULATION MODE — No physical LoRa/Meshtastic transmission is occurring. All packet routing, hop counts, latencies, and signal values are simulated locally.'
    };
  }
}

export const meshSimulationService = new MeshSimulationService();

