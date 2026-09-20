import { Router, Request, Response } from 'express';
import { db } from '../db/database.ts';
import { meshSimulationService, validatePacketId } from '../services/meshSimulationService.ts';
import { requireAuth, requireRole } from '../middleware/authMiddleware.ts';
import { SimulatedMeshNode, NodeType, NodeOperationalStatus, MeshPacketType } from '../db/schema.ts';

const router = Router();

// ==========================================
// MESH SIMULATION NODES
// ==========================================

// List all simulated mesh nodes
router.get('/nodes', requireAuth, (_req: Request, res: Response) => {
  try {
    const nodes = db.getSimulatedNodes();
    return res.json({ nodes, count: nodes.length });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to fetch simulated mesh nodes' });
  }
});

// Create new simulated mesh node (ADMIN, DISPATCHER)
router.post('/nodes', requireAuth, requireRole('ADMIN', 'DISPATCHER'), (req: Request, res: Response) => {
  try {
    const { nodeId, nodeName, nodeType, status, latitude, longitude, batteryLevel, signalQuality, neighbors } = req.body;

    if (!nodeId || typeof nodeId !== 'string' || !nodeId.trim()) {
      return res.status(400).json({ error: 'Node ID is required (e.g., "RELAY-03")' });
    }
    const cleanNodeId = nodeId.trim().toUpperCase();
    if (!/^[A-Za-z0-9_-]{2,32}$/.test(cleanNodeId)) {
      return res.status(400).json({ error: 'Node ID must be 2-32 alphanumeric characters, hyphens, or underscores' });
    }

    if (!nodeName || typeof nodeName !== 'string' || !nodeName.trim()) {
      return res.status(400).json({ error: 'Node name is required' });
    }

    const validTypes: NodeType[] = ['COMMAND', 'RELAY', 'RESPONDER', 'FIELD'];
    if (nodeType && !validTypes.includes(nodeType)) {
      return res.status(400).json({ error: `Invalid nodeType. Must be one of: ${validTypes.join(', ')}` });
    }
    const chosenType: NodeType = nodeType || 'FIELD';

    if (status !== undefined && status !== 'ONLINE' && status !== 'OFFLINE') {
      return res.status(400).json({ error: 'Invalid status. Must be "ONLINE" or "OFFLINE"' });
    }
    const chosenStatus: NodeOperationalStatus = status === 'OFFLINE' ? 'OFFLINE' : 'ONLINE';

    if (latitude !== undefined && latitude !== null && (typeof latitude !== 'number' || isNaN(latitude) || latitude < -90 || latitude > 90)) {
      return res.status(400).json({ error: 'Latitude must be a valid number between -90 and 90' });
    }
    if (longitude !== undefined && longitude !== null && (typeof longitude !== 'number' || isNaN(longitude) || longitude < -180 || longitude > 180)) {
      return res.status(400).json({ error: 'Longitude must be a valid number between -180 and 180' });
    }
    if (batteryLevel !== undefined && (typeof batteryLevel !== 'number' || isNaN(batteryLevel) || batteryLevel < 0 || batteryLevel > 100)) {
      return res.status(400).json({ error: 'Battery level must be a number between 0 and 100' });
    }
    if (signalQuality !== undefined && (typeof signalQuality !== 'number' || isNaN(signalQuality) || signalQuality < 0 || signalQuality > 100)) {
      return res.status(400).json({ error: 'Signal quality must be a number between 0 and 100' });
    }
    if (neighbors !== undefined && !Array.isArray(neighbors)) {
      return res.status(400).json({ error: 'Neighbors must be an array of node ID strings' });
    }

    const existing = db.findSimulatedNodeById(cleanNodeId);
    if (existing) {
      return res.status(409).json({ error: `A node with ID "${cleanNodeId}" already exists.` });
    }

    const now = new Date().toISOString();
    const newNode: SimulatedMeshNode = {
      id: cleanNodeId,
      nodeId: cleanNodeId,
      nodeName: nodeName.trim(),
      nodeType: chosenType,
      status: chosenStatus,
      latitude: typeof latitude === 'number' ? latitude : null,
      longitude: typeof longitude === 'number' ? longitude : null,
      batteryLevel: typeof batteryLevel === 'number' ? batteryLevel : 100,
      signalQuality: typeof signalQuality === 'number' ? signalQuality : 90,
      lastSeen: now,
      neighbors: Array.isArray(neighbors) ? neighbors.map(n => String(n).trim().toUpperCase()) : [],
      createdAt: now,
      updatedAt: now
    };

    const created = db.insertSimulatedNode(newNode);

    db.logAudit({
      actorId: (req as any).user?.id,
      actorEmail: (req as any).user?.email,
      actorRole: (req as any).user?.role,
      action: 'CREATE_SIMULATED_MESH_NODE',
      entityType: 'SimulatedMeshNode',
      entityId: created.nodeId,
      details: `Created simulated node ${created.nodeId} (${created.nodeType})`
    });

    return res.status(201).json({ node: created });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to create simulated node' });
  }
});

// Update simulated mesh node (e.g. toggle ONLINE/OFFLINE, battery, neighbors)
router.patch('/nodes/:id', requireAuth, requireRole('ADMIN', 'DISPATCHER'), (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { nodeName, nodeType, status, latitude, longitude, batteryLevel, signalQuality, neighbors } = req.body;

    const existing = db.findSimulatedNodeById(id);
    if (!existing) {
      return res.status(404).json({ error: `Simulated node "${id}" not found.` });
    }

    const updates: Partial<SimulatedMeshNode> = {};
    if (nodeName !== undefined) {
      if (typeof nodeName !== 'string' || !nodeName.trim()) {
        return res.status(400).json({ error: 'Node name cannot be empty' });
      }
      updates.nodeName = String(nodeName).trim();
    }
    if (nodeType !== undefined) {
      const validTypes: NodeType[] = ['COMMAND', 'RELAY', 'RESPONDER', 'FIELD'];
      if (!validTypes.includes(nodeType)) {
        return res.status(400).json({ error: `Invalid nodeType. Must be one of: ${validTypes.join(', ')}` });
      }
      updates.nodeType = nodeType;
    }
    if (status !== undefined) {
      if (status !== 'ONLINE' && status !== 'OFFLINE') {
        return res.status(400).json({ error: 'Invalid status. Must be "ONLINE" or "OFFLINE"' });
      }
      updates.status = status;
    }
    if (latitude !== undefined) {
      if (latitude !== null && (typeof latitude !== 'number' || isNaN(latitude) || latitude < -90 || latitude > 90)) {
        return res.status(400).json({ error: 'Latitude must be a valid number between -90 and 90' });
      }
      updates.latitude = latitude;
    }
    if (longitude !== undefined) {
      if (longitude !== null && (typeof longitude !== 'number' || isNaN(longitude) || longitude < -180 || longitude > 180)) {
        return res.status(400).json({ error: 'Longitude must be a valid number between -180 and 180' });
      }
      updates.longitude = longitude;
    }
    if (batteryLevel !== undefined) {
      if (typeof batteryLevel !== 'number' || isNaN(batteryLevel) || batteryLevel < 0 || batteryLevel > 100) {
        return res.status(400).json({ error: 'Battery level must be a number between 0 and 100' });
      }
      updates.batteryLevel = batteryLevel;
    }
    if (signalQuality !== undefined) {
      if (typeof signalQuality !== 'number' || isNaN(signalQuality) || signalQuality < 0 || signalQuality > 100) {
        return res.status(400).json({ error: 'Signal quality must be a number between 0 and 100' });
      }
      updates.signalQuality = signalQuality;
    }
    if (neighbors !== undefined) {
      if (!Array.isArray(neighbors)) {
        return res.status(400).json({ error: 'Neighbors must be an array of node ID strings' });
      }
      updates.neighbors = neighbors.map(n => String(n).trim().toUpperCase());
    }

    const updated = db.updateSimulatedNode(existing.nodeId, updates);

    return res.json({ node: updated });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to update simulated node' });
  }
});

// Delete simulated mesh node (ADMIN only)
router.delete('/nodes/:id', requireAuth, requireRole('ADMIN'), (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const existing = db.findSimulatedNodeById(id);
    if (!existing) {
      return res.status(404).json({ error: `Simulated node "${id}" not found.` });
    }

    const deleted = db.deleteSimulatedNode(existing.nodeId);
    if (!deleted) {
      return res.status(404).json({ error: 'Node could not be removed' });
    }

    db.logAudit({
      actorId: (req as any).user?.id,
      actorEmail: (req as any).user?.email,
      actorRole: (req as any).user?.role,
      action: 'DELETE_SIMULATED_MESH_NODE',
      entityType: 'SimulatedMeshNode',
      entityId: existing.nodeId,
      details: `Deleted simulated node ${existing.nodeId}`
    });

    return res.json({ success: true, message: `Node ${existing.nodeId} deleted.` });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to delete simulated node' });
  }
});

// Reset simulated topology to defaults (ADMIN only)
router.post('/nodes/reset', requireAuth, requireRole('ADMIN'), (_req: Request, res: Response) => {
  try {
    const nodes = db.resetSimulatedNodes();
    return res.json({ success: true, nodes, message: 'Topology reset to default mesh configuration' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to reset topology' });
  }
});

// ==========================================
// MESH SIMULATION PACKETS & EXECUTION
// ==========================================

// List simulated packets
router.get('/packets', requireAuth, (req: Request, res: Response) => {
  try {
    const { status, incidentId, limit } = req.query;
    let packets = db.getMeshPackets();

    if (status && typeof status === 'string') {
      packets = packets.filter(p => p.status === status.toUpperCase());
    }
    if (incidentId && typeof incidentId === 'string') {
      packets = packets.filter(p => p.incidentId === incidentId || p.incidentNumber === incidentId);
    }
    if (limit && !isNaN(Number(limit))) {
      packets = packets.slice(0, Number(limit));
    }

    return res.json({ packets, count: packets.length });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to fetch simulated packets' });
  }
});

// Get single simulated packet
router.get('/packets/:id', requireAuth, (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const packet = db.findMeshPacketById(id);
    if (!packet) {
      return res.status(404).json({ error: `Simulated packet "${id}" not found.` });
    }
    return res.json({ packet });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to get packet' });
  }
});

// Run packet simulation (ADMIN, DISPATCHER)
router.post('/simulate', requireAuth, requireRole('ADMIN', 'DISPATCHER'), (req: Request, res: Response) => {
  try {
    const {
      sourceNodeId,
      destinationNodeId,
      packetId,
      messageType,
      payload,
      incidentId,
      incidentNumber,
      initialTtl,
      maxHops,
      ackRequested,
      forcedLoss,
      forcedAckLoss,
      forcedDelayMs
    } = req.body;

    if (!sourceNodeId || typeof sourceNodeId !== 'string' || !sourceNodeId.trim()) {
      return res.status(400).json({ error: 'sourceNodeId is required and must be a non-empty string' });
    }
    if (!destinationNodeId || typeof destinationNodeId !== 'string' || !destinationNodeId.trim()) {
      return res.status(400).json({ error: 'destinationNodeId is required and must be a non-empty string' });
    }

    if (packetId !== undefined && packetId !== null) {
      if (!validatePacketId(String(packetId))) {
        return res.status(400).json({
          error: 'Invalid packetId. Must be 3-64 alphanumeric characters, hyphens, or underscores.'
        });
      }
    }

    if (initialTtl !== undefined) {
      if (typeof initialTtl !== 'number' || isNaN(initialTtl) || !Number.isInteger(initialTtl) || initialTtl < 1 || initialTtl > 30) {
        return res.status(400).json({ error: 'initialTtl must be an integer between 1 and 30' });
      }
    }

    if (maxHops !== undefined) {
      if (typeof maxHops !== 'number' || isNaN(maxHops) || !Number.isInteger(maxHops) || maxHops < 1 || maxHops > 50) {
        return res.status(400).json({ error: 'maxHops must be an integer between 1 and 50' });
      }
    }

    if (messageType !== undefined) {
      const validMsgTypes: MeshPacketType[] = ['INCIDENT_REPORT', 'RESOURCE_REQUEST', 'STATUS_UPDATE', 'EMERGENCY_ALERT', 'TELEMETRY_PING', 'ACK'];
      if (!validMsgTypes.includes(messageType)) {
        return res.status(400).json({ error: `Invalid messageType. Must be one of: ${validMsgTypes.join(', ')}` });
      }
    }

    if (payload !== undefined && (typeof payload !== 'object' || payload === null || Array.isArray(payload))) {
      return res.status(400).json({ error: 'payload must be a valid JSON object' });
    }

    if (forcedDelayMs !== undefined && (typeof forcedDelayMs !== 'number' || isNaN(forcedDelayMs) || forcedDelayMs < 0 || forcedDelayMs > 10000)) {
      return res.status(400).json({ error: 'forcedDelayMs must be a number between 0 and 10000' });
    }

    const packet = meshSimulationService.simulatePacketTransmission({
      sourceNodeId: sourceNodeId.trim().toUpperCase(),
      destinationNodeId: destinationNodeId.trim().toUpperCase(),
      packetId: packetId ? String(packetId).trim() : undefined,
      messageType,
      payload: payload || { rawText: 'Standard Simulated Telemetry Ping' },
      incidentId,
      incidentNumber,
      initialTtl,
      maxHops,
      ackRequested: ackRequested !== undefined ? Boolean(ackRequested) : true,
      forcedLoss: forcedLoss !== undefined ? Boolean(forcedLoss) : undefined,
      forcedAckLoss: forcedAckLoss !== undefined ? Boolean(forcedAckLoss) : undefined,
      forcedDelayMs
    });

    return res.status(201).json({ packet });
  } catch (err: any) {
    return res.status(400).json({ error: err.message || 'Simulation execution failed' });
  }
});

// Broadcast real incident through simulated mesh (ADMIN, DISPATCHER)
router.post('/simulate/incident/:incidentId', requireAuth, requireRole('ADMIN', 'DISPATCHER'), (req: Request, res: Response) => {
  try {
    const { incidentId } = req.params;
    const { sourceNodeId, destinationNodeId } = req.body;

    const result = meshSimulationService.simulateIncidentBroadcast(
      incidentId,
      sourceNodeId ? String(sourceNodeId).trim().toUpperCase() : undefined,
      destinationNodeId ? String(destinationNodeId).trim().toUpperCase() : undefined
    );

    return res.status(201).json(result);
  } catch (err: any) {
    return res.status(400).json({ error: err.message || 'Failed to simulate incident mesh broadcast' });
  }
});

// ==========================================
// MESH SIMULATION EVENTS & METRICS
// ==========================================

// Get simulated mesh event log
router.get('/events', requireAuth, (req: Request, res: Response) => {
  try {
    const { limit } = req.query;
    let events = db.getMeshEvents();
    if (limit && !isNaN(Number(limit))) {
      events = events.slice(0, Number(limit));
    }
    return res.json({ events, count: events.length });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to fetch mesh events' });
  }
});

// Get real calculated simulation metrics
router.get('/metrics', requireAuth, (_req: Request, res: Response) => {
  try {
    const metrics = meshSimulationService.getSimulationMetrics();
    return res.json(metrics);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to compute mesh metrics' });
  }
});

// ==========================================
// MESH SIMULATION CONFIG & RESET
// ==========================================

// Get simulation configuration
router.get('/config', requireAuth, (_req: Request, res: Response) => {
  try {
    const config = db.getMeshConfig();
    return res.json({ config });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to fetch simulation config' });
  }
});

// Update simulation configuration (ADMIN only)
router.patch('/config', requireAuth, requireRole('ADMIN'), (req: Request, res: Response) => {
  try {
    const {
      packetLossRate,
      ackPacketLossRate,
      minimumLatencyMs,
      maximumLatencyMs,
      initialTtl,
      maxHops,
      autoAck,
      deterministicMode
    } = req.body;

    const updates: any = {};
    if (packetLossRate !== undefined) {
      if (typeof packetLossRate !== 'number' || isNaN(packetLossRate) || packetLossRate < 0 || packetLossRate > 1.0) {
        return res.status(400).json({ error: 'packetLossRate must be a number between 0.0 and 1.0' });
      }
      updates.packetLossRate = packetLossRate;
    }

    if (ackPacketLossRate !== undefined) {
      if (typeof ackPacketLossRate !== 'number' || isNaN(ackPacketLossRate) || ackPacketLossRate < 0 || ackPacketLossRate > 1.0) {
        return res.status(400).json({ error: 'ackPacketLossRate must be a number between 0.0 and 1.0' });
      }
      updates.ackPacketLossRate = ackPacketLossRate;
    }

    if (minimumLatencyMs !== undefined) {
      if (typeof minimumLatencyMs !== 'number' || isNaN(minimumLatencyMs) || minimumLatencyMs < 0 || minimumLatencyMs > 10000) {
        return res.status(400).json({ error: 'minimumLatencyMs must be a number between 0 and 10000' });
      }
      updates.minimumLatencyMs = minimumLatencyMs;
    }

    if (maximumLatencyMs !== undefined) {
      if (typeof maximumLatencyMs !== 'number' || isNaN(maximumLatencyMs) || maximumLatencyMs < 0 || maximumLatencyMs > 10000) {
        return res.status(400).json({ error: 'maximumLatencyMs must be a number between 0 and 10000' });
      }
      updates.maximumLatencyMs = maximumLatencyMs;
    }

    if (updates.minimumLatencyMs !== undefined && updates.maximumLatencyMs !== undefined) {
      if (updates.minimumLatencyMs > updates.maximumLatencyMs) {
        return res.status(400).json({ error: 'minimumLatencyMs cannot exceed maximumLatencyMs' });
      }
    }

    if (initialTtl !== undefined) {
      if (typeof initialTtl !== 'number' || isNaN(initialTtl) || !Number.isInteger(initialTtl) || initialTtl < 1 || initialTtl > 30) {
        return res.status(400).json({ error: 'initialTtl must be an integer between 1 and 30' });
      }
      updates.initialTtl = initialTtl;
    }

    if (maxHops !== undefined) {
      if (typeof maxHops !== 'number' || isNaN(maxHops) || !Number.isInteger(maxHops) || maxHops < 1 || maxHops > 50) {
        return res.status(400).json({ error: 'maxHops must be an integer between 1 and 50' });
      }
      updates.maxHops = maxHops;
    }

    if (autoAck !== undefined) updates.autoAck = Boolean(autoAck);
    if (deterministicMode !== undefined) updates.deterministicMode = Boolean(deterministicMode);

    const updated = db.updateMeshConfig(updates);
    return res.json({ config: updated });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to update simulation config' });
  }
});

// Reset simulation history (clears packets and events, keeps users, incidents, and resources) - ADMIN only
router.post('/reset', requireAuth, requireRole('ADMIN'), (req: Request, res: Response) => {
  try {
    db.resetMeshSimulation();

    db.logAudit({
      actorId: (req as any).user?.id,
      actorEmail: (req as any).user?.email,
      actorRole: (req as any).user?.role,
      action: 'RESET_MESH_SIMULATION_HISTORY',
      entityType: 'MeshSimulation',
      details: 'Cleared simulated mesh packets and event log'
    });

    const metrics = meshSimulationService.getSimulationMetrics();
    return res.json({
      success: true,
      message: 'Simulated mesh packets and events have been reset.',
      metrics
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to reset simulation history' });
  }
});

export default router;

