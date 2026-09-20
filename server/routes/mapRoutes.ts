import { Router, Request, Response } from 'express';
import { requireAuth, requireRole } from '../middleware/authMiddleware.ts';
import { routingService } from '../services/routingService.ts';
import { offlineOperationalMapProvider } from '../gis/OfflineOperationalMapProvider.ts';
import { HazardType, HazardSeverity } from '../gis/types.ts';

const router = Router();

// ==========================================
// Phase 7: Operational GIS / Map Endpoints
// ==========================================

// GET /api/map/status — Offline map status & operational health
router.get('/status', requireAuth, (_req: Request, res: Response) => {
  try {
    const status = offlineOperationalMapProvider.getMapStatus();
    const meta = offlineOperationalMapProvider.getMapMetadata();
    const coordInfo = offlineOperationalMapProvider.getCoordinateReferenceInfo();

    return res.status(200).json({
      status,
      offlineNotice: 'OFFLINE MAP — NO EXTERNAL MAP SERVICE',
      isOffline: true,
      internetDependency: 'NONE',
      provider: 'OfflineOperationalMapProvider',
      datasetName: meta.datasetName,
      version: meta.version,
      coordinateSystem: coordInfo,
      nodeCount: offlineOperationalMapProvider.getNodes().length,
      edgeCount: offlineOperationalMapProvider.getEdges().length,
      boundingBox: meta.boundingBox
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to determine map status' });
  }
});

// GET /api/map/data — Complete operational map package
router.get('/data', requireAuth, (_req: Request, res: Response) => {
  try {
    const data = routingService.getOperationalData();
    return res.status(200).json(data);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to retrieve operational map data' });
  }
});

// GET /api/map/layers — Layer definitions and visibility
router.get('/layers', requireAuth, (_req: Request, res: Response) => {
  try {
    const data = routingService.getOperationalData();
    return res.status(200).json({ layers: data.layers });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to fetch map layers' });
  }
});

// PUT /api/map/layers/:layerId/visibility — Toggle layer visibility
router.put('/layers/:layerId/visibility', requireAuth, (req: Request, res: Response) => {
  try {
    const { layerId } = req.params;
    const { visible } = req.body;
    if (typeof visible !== 'boolean') {
      return res.status(400).json({ error: 'Visible flag must be a boolean' });
    }
    offlineOperationalMapProvider.setLayerVisibility(layerId, visible);
    const data = routingService.getOperationalData();
    return res.status(200).json({ layers: data.layers });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to update layer visibility' });
  }
});

// GET /api/map/roads — Authoritative road edges with classifications
router.get('/roads', requireAuth, (_req: Request, res: Response) => {
  try {
    const edges = routingService.getEdges();
    return res.status(200).json({
      roads: edges,
      count: edges.length,
      datasetName: offlineOperationalMapProvider.getMapMetadata().datasetName
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to fetch roads' });
  }
});

// GET /api/map/hazards — Operational hazard zones
router.get('/hazards', requireAuth, (_req: Request, res: Response) => {
  try {
    const hazards = routingService.getHazards();
    return res.status(200).json({
      hazards,
      count: hazards.length
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to fetch map hazards' });
  }
});

// GET /api/map/operational-objects — Incidents, resources, responders, hazards, blockages
router.get('/operational-objects', requireAuth, (_req: Request, res: Response) => {
  try {
    const data = routingService.getOperationalData();
    return res.status(200).json({
      overlays: data.overlays,
      counts: {
        incidents: data.overlays.incidents.length,
        resources: data.overlays.resources.length,
        responders: data.overlays.responders.length,
        hazards: data.overlays.hazards.length,
        blockedRoads: data.overlays.blockedRoads.length
      }
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to fetch operational objects' });
  }
});

// GET /api/map/diagnostics — Offline diagnostics and validation report
router.get('/diagnostics', requireAuth, (_req: Request, res: Response) => {
  try {
    const data = routingService.getOperationalData();
    return res.status(200).json(data.diagnostics);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to fetch map diagnostics' });
  }
});

// POST /api/map/validate — Validate dataset integrity
router.post('/validate', requireAuth, (_req: Request, res: Response) => {
  try {
    const validation = offlineOperationalMapProvider.validateDataset();
    return res.status(200).json(validation);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Map dataset validation error' });
  }
});

// POST /api/map/compare-routes — Multi-mode route comparison (FASTEST vs SAFEST vs BALANCED)
router.post('/compare-routes', requireAuth, (req: Request, res: Response) => {
  try {
    const {
      incidentId,
      originNodeId,
      originCoords,
      destinationNodeId,
      destinationCoords
    } = req.body || {};

    if (originCoords) {
      if (
        typeof originCoords.latitude !== 'number' ||
        isNaN(originCoords.latitude) ||
        originCoords.latitude < -90 ||
        originCoords.latitude > 90 ||
        typeof originCoords.longitude !== 'number' ||
        isNaN(originCoords.longitude) ||
        originCoords.longitude < -180 ||
        originCoords.longitude > 180
      ) {
        return res.status(400).json({
          error: 'Invalid originCoords coordinates.'
        });
      }
    }

    if (destinationCoords) {
      if (
        typeof destinationCoords.latitude !== 'number' ||
        isNaN(destinationCoords.latitude) ||
        destinationCoords.latitude < -90 ||
        destinationCoords.latitude > 90 ||
        typeof destinationCoords.longitude !== 'number' ||
        isNaN(destinationCoords.longitude) ||
        destinationCoords.longitude < -180 ||
        destinationCoords.longitude > 180
      ) {
        return res.status(400).json({
          error: 'Invalid destinationCoords coordinates.'
        });
      }
    }

    const comparison = routingService.compareRoutes(
      {
        incidentId,
        originNodeId,
        originCoords,
        destinationNodeId,
        destinationCoords
      },
      (req as any).user
    );

    return res.status(200).json(comparison);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to compare routes' });
  }
});

// POST /api/map/hazards — Create hazard (RBAC: ADMIN, DISPATCHER, OPERATOR)
router.post(
  '/hazards',
  requireAuth,
  requireRole('ADMIN', 'DISPATCHER', 'OPERATOR'),
  (req: Request, res: Response) => {
    try {
      const hazard = routingService.createHazard(req.body, (req as any).user);
      return res.status(201).json(hazard);
    } catch (err: any) {
      return res.status(400).json({ error: err.message || 'Failed to create hazard' });
    }
  }
);

// DELETE /api/map/hazards/:hazardId — Delete hazard (RBAC: ADMIN, DISPATCHER, OPERATOR)
router.delete(
  '/hazards/:hazardId',
  requireAuth,
  requireRole('ADMIN', 'DISPATCHER', 'OPERATOR'),
  (req: Request, res: Response) => {
    try {
      const { hazardId } = req.params;
      const success = routingService.deleteHazard(hazardId, (req as any).user);
      if (!success) {
        return res.status(404).json({ error: `Hazard ${hazardId} not found` });
      }
      return res.status(200).json({ message: 'Hazard deleted successfully', hazardId });
    } catch (err: any) {
      return res.status(400).json({ error: err.message || 'Failed to delete hazard' });
    }
  }
);

// POST /api/map/blocked-roads — Create blocked road (RBAC: ADMIN, DISPATCHER, OPERATOR)
router.post(
  '/blocked-roads',
  requireAuth,
  requireRole('ADMIN', 'DISPATCHER', 'OPERATOR'),
  (req: Request, res: Response) => {
    try {
      const blockedRoad = routingService.createBlockedRoad(req.body, (req as any).user);
      return res.status(201).json(blockedRoad);
    } catch (err: any) {
      return res.status(400).json({ error: err.message || 'Failed to create blocked road' });
    }
  }
);

// DELETE /api/map/blocked-roads/:blockedRoadId — Delete blocked road (RBAC: ADMIN, DISPATCHER, OPERATOR)
router.delete(
  '/blocked-roads/:blockedRoadId',
  requireAuth,
  requireRole('ADMIN', 'DISPATCHER', 'OPERATOR'),
  (req: Request, res: Response) => {
    try {
      const { blockedRoadId } = req.params;
      const success = routingService.deleteBlockedRoad(blockedRoadId, (req as any).user);
      if (!success) {
        return res.status(404).json({ error: `Blocked road ${blockedRoadId} not found` });
      }
      return res.status(200).json({ message: 'Blocked road removed successfully', blockedRoadId });
    } catch (err: any) {
      return res.status(400).json({ error: err.message || 'Failed to delete blocked road' });
    }
  }
);

export default router;
