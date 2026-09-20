import { Router, Request, Response } from 'express';
import { requireAuth, requireRole } from '../middleware/authMiddleware.ts';
import { routingService } from '../services/routingService.ts';
import { HazardType, HazardSeverity, RouteMode } from '../gis/types.ts';

const router = Router();

// GET /api/routing/map — Get full offline map dataset & layers
router.get('/map', requireAuth, (_req: Request, res: Response) => {
  try {
    const data = routingService.getMapData();
    return res.status(200).json(data);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to fetch map data' });
  }
});

// GET /api/routing/nodes — Get road graph nodes
router.get('/nodes', requireAuth, (_req: Request, res: Response) => {
  try {
    const nodes = routingService.getNodes();
    return res.status(200).json({ nodes });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to fetch road nodes' });
  }
});

// GET /api/routing/hazards — Get active GIS hazards
router.get('/hazards', requireAuth, (_req: Request, res: Response) => {
  try {
    const hazards = routingService.getHazards();
    return res.status(200).json({ hazards });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to fetch hazards' });
  }
});

// GET /api/routing/blocked-roads — Get active blocked roads
router.get('/blocked-roads', requireAuth, (_req: Request, res: Response) => {
  try {
    const blockedRoads = routingService.getBlockedRoads();
    return res.status(200).json({ blockedRoads });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to fetch blocked roads' });
  }
});

// POST /api/routing/calculate — Calculate safe offline route
router.post('/calculate', requireAuth, (req: Request, res: Response) => {
  try {
    const {
      incidentId,
      originNodeId,
      originCoords,
      destinationNodeId,
      destinationCoords,
      mode
    } = req.body || {};

    const validModes: RouteMode[] = ['FASTEST', 'SAFEST', 'BALANCED'];
    if (mode && !validModes.includes(mode)) {
      return res.status(400).json({
        error: `Invalid route mode: ${mode}. Must be one of: FASTEST, SAFEST, BALANCED`
      });
    }

    // Validate origin coordinates if provided
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
          error: 'Invalid originCoords. Latitude must be in [-90, 90] and Longitude in [-180, 180].'
        });
      }
    }

    // Validate destination coordinates if provided
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
          error: 'Invalid destinationCoords. Latitude must be in [-90, 90] and Longitude in [-180, 180].'
        });
      }
    }

    const result = routingService.calculateRoute(
      {
        incidentId,
        originNodeId,
        originCoords,
        destinationNodeId,
        destinationCoords,
        mode
      },
      {
        userId: req.user?.userId,
        name: req.user?.name,
        role: req.user?.role
      }
    );

    return res.status(200).json(result);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Route calculation failed' });
  }
});

// GET /api/routing/routes/:id — Retrieve calculated route history
router.get('/routes/:id', requireAuth, (req: Request, res: Response) => {
  try {
    const routeId = req.params.id;
    const route = routingService.getRouteById(routeId);
    if (!route) {
      return res.status(404).json({ error: `Route not found for ID: ${routeId}` });
    }
    return res.status(200).json(route);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to fetch route history' });
  }
});

// POST /api/routing/hazards — Create hazard (ADMIN, DISPATCHER, OPERATOR)
router.post(
  '/hazards',
  requireAuth,
  requireRole('ADMIN', 'DISPATCHER', 'OPERATOR'),
  (req: Request, res: Response) => {
    try {
      const { type, severity, latitude, longitude, radiusMeters, description, expiresAt } = req.body || {};

      const hazard = routingService.createHazard(
        {
          type,
          severity,
          latitude,
          longitude,
          radiusMeters,
          description,
          expiresAt
        },
        {
          userId: req.user?.userId,
          name: req.user?.name,
          role: req.user?.role
        }
      );

      return res.status(201).json(hazard);
    } catch (err: any) {
      return res.status(400).json({ error: err.message || 'Failed to create hazard' });
    }
  }
);

// DELETE /api/routing/hazards/:id — Delete hazard (ADMIN, DISPATCHER)
router.delete(
  '/hazards/:id',
  requireAuth,
  requireRole('ADMIN', 'DISPATCHER'),
  (req: Request, res: Response) => {
    try {
      const hazardId = req.params.id;
      const deleted = routingService.deleteHazard(hazardId, {
        userId: req.user?.userId,
        name: req.user?.name,
        role: req.user?.role
      });

      if (!deleted) {
        return res.status(404).json({ error: `Hazard not found for ID: ${hazardId}` });
      }

      return res.status(200).json({ success: true, message: `Hazard ${hazardId} deleted.` });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Failed to delete hazard' });
    }
  }
);

// POST /api/routing/blocked-roads — Create blocked road (ADMIN, DISPATCHER)
router.post(
  '/blocked-roads',
  requireAuth,
  requireRole('ADMIN', 'DISPATCHER'),
  (req: Request, res: Response) => {
    try {
      const { edgeId, reason, severity, expiresAt } = req.body || {};

      const blockedRoad = routingService.createBlockedRoad(
        {
          edgeId,
          reason,
          severity,
          expiresAt
        },
        {
          userId: req.user?.userId,
          name: req.user?.name,
          role: req.user?.role
        }
      );

      return res.status(201).json(blockedRoad);
    } catch (err: any) {
      return res.status(400).json({ error: err.message || 'Failed to create blocked road' });
    }
  }
);

// DELETE /api/routing/blocked-roads/:id — Delete blocked road (ADMIN, DISPATCHER)
router.delete(
  '/blocked-roads/:id',
  requireAuth,
  requireRole('ADMIN', 'DISPATCHER'),
  (req: Request, res: Response) => {
    try {
      const blockedRoadId = req.params.id;
      const deleted = routingService.deleteBlockedRoad(blockedRoadId, {
        userId: req.user?.userId,
        name: req.user?.name,
        role: req.user?.role
      });

      if (!deleted) {
        return res.status(404).json({ error: `Blocked road record not found for ID: ${blockedRoadId}` });
      }

      return res.status(200).json({ success: true, message: `Blocked road ${blockedRoadId} deleted.` });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Failed to delete blocked road' });
    }
  }
);

export default router;
