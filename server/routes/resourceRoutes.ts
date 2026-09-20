import { Router, Request, Response } from 'express';
import { resourceService } from '../services/resourceService.ts';
import { resourceMatchingService } from '../services/resourceMatchingService.ts';
import { requireAuth, requireRole } from '../middleware/authMiddleware.ts';
import { ResourceAvailability, ResourceCapability, ResourceStatus, ResourceType } from '../db/schema.ts';

const router = Router();

// List resources with filters - all authenticated roles can view resources
router.get('/', requireAuth, (req: Request, res: Response) => {
  try {
    const { type, availability, status, search } = req.query;

    const resources = resourceService.getAllResources({
      type: type as ResourceType | undefined,
      availability: availability as ResourceAvailability | undefined,
      status: status as ResourceStatus | undefined,
      search: search as string | undefined
    });

    return res.json({ resources, total: resources.length });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to retrieve resources' });
  }
});

// Resource Matching Engine for Incident - Decision support
router.get('/match/:incidentId', requireAuth, (req: Request, res: Response) => {
  try {
    const { incidentId } = req.params;
    if (!incidentId) {
      return res.status(400).json({ error: 'Incident ID parameter is required' });
    }

    const matchingResult = resourceMatchingService.matchResourcesForIncident(incidentId);
    return res.json(matchingResult);
  } catch (err: any) {
    const statusCode = err.message?.includes('not found') ? 404 : 500;
    return res.status(statusCode).json({ error: err.message || 'Failed to calculate resource matches' });
  }
});

// Create new resource - ADMIN, DISPATCHER
router.post('/', requireAuth, requireRole('ADMIN', 'DISPATCHER'), (req: Request, res: Response) => {
  try {
    const {
      resourceCode,
      name,
      type,
      capabilities,
      status,
      availability,
      latitude,
      longitude,
      location,
      capacity,
      patientCapacity,
      criticalCareCapacity,
      teamSize,
      occupantCapacity,
      supplyCapacity,
      statusDetails
    } = req.body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ error: 'Resource name is required.' });
    }

    if (!location || typeof location !== 'string' || !location.trim()) {
      return res.status(400).json({ error: 'Resource location is required.' });
    }

    const validTypes: ResourceType[] = [
      'AMBULANCE',
      'MEDICAL_TEAM',
      'FIRE_UNIT',
      'RESCUE_TEAM',
      'HAZMAT_UNIT',
      'SEARCH_TEAM',
      'EVACUATION_UNIT',
      'SHELTER',
      'SUPPLY_UNIT',
      'EMERGENCY_EQUIPMENT',
      'OTHER'
    ];
    if (!type || !validTypes.includes(type)) {
      return res.status(400).json({ error: `Invalid resource type. Must be one of: ${validTypes.join(', ')}` });
    }

    const resource = resourceService.createResource({
      resourceCode,
      name,
      type,
      capabilities: Array.isArray(capabilities) ? capabilities : undefined,
      status: status || availability,
      latitude: latitude !== undefined ? Number(latitude) : undefined,
      longitude: longitude !== undefined ? Number(longitude) : undefined,
      location,
      capacity,
      patientCapacity: patientCapacity !== undefined ? Number(patientCapacity) : undefined,
      criticalCareCapacity: criticalCareCapacity !== undefined ? Number(criticalCareCapacity) : undefined,
      teamSize: teamSize !== undefined ? Number(teamSize) : undefined,
      occupantCapacity: occupantCapacity !== undefined ? Number(occupantCapacity) : undefined,
      supplyCapacity: supplyCapacity !== undefined ? Number(supplyCapacity) : undefined,
      statusDetails,
      isDemoData: false,
      actorName: req.user?.name,
      actorId: req.user?.userId
    });

    return res.status(201).json({ resource });
  } catch (err: any) {
    return res.status(400).json({ error: err.message || 'Failed to create resource' });
  }
});

// Allocate resource to incident - ADMIN, DISPATCHER, OPERATOR
router.post('/:resourceId/allocate', requireAuth, requireRole('ADMIN', 'DISPATCHER', 'OPERATOR'), (req: Request, res: Response) => {
  try {
    const { resourceId } = req.params;
    const { incidentId } = req.body;

    if (!incidentId || typeof incidentId !== 'string' || !incidentId.trim()) {
      return res.status(400).json({ error: 'incidentId parameter is required in request body' });
    }

    const allocatedResource = resourceService.allocateResource(resourceId, incidentId.trim(), {
      userId: req.user?.userId,
      role: req.user?.role,
      name: req.user?.name
    });

    return res.json({
      message: `Resource ${allocatedResource.name} (${allocatedResource.resourceCode}) allocated to incident successfully`,
      resource: allocatedResource
    });
  } catch (err: any) {
    const status = err.message?.includes('not found') ? 404 : 400;
    return res.status(status).json({ error: err.message || 'Failed to allocate resource' });
  }
});

// Release resource - ADMIN, DISPATCHER, OPERATOR
router.post('/:resourceId/release', requireAuth, requireRole('ADMIN', 'DISPATCHER', 'OPERATOR'), (req: Request, res: Response) => {
  try {
    const { resourceId } = req.params;

    const releasedResource = resourceService.releaseResource(resourceId, {
      userId: req.user?.userId,
      role: req.user?.role,
      name: req.user?.name
    });

    return res.json({
      message: `Resource ${releasedResource.name} (${releasedResource.resourceCode}) released successfully`,
      resource: releasedResource
    });
  } catch (err: any) {
    const status = err.message?.includes('not found') ? 404 : 400;
    return res.status(status).json({ error: err.message || 'Failed to release resource' });
  }
});

// Update resource status/availability - ADMIN, DISPATCHER
router.patch('/:id/status', requireAuth, requireRole('ADMIN', 'DISPATCHER'), (req: Request, res: Response) => {
  try {
    const { status, availability, statusDetails } = req.body;
    const targetStatus = status || availability;

    if (!targetStatus) {
      return res.status(400).json({ error: 'Status or availability field is required.' });
    }

    const updated = resourceService.updateResourceStatus(
      req.params.id,
      targetStatus,
      statusDetails,
      req.user?.name,
      req.user?.userId
    );

    if (!updated) {
      return res.status(404).json({ error: 'Resource not found' });
    }

    return res.json({ resource: updated });
  } catch (err: any) {
    return res.status(400).json({ error: err.message || 'Failed to update resource' });
  }
});

// Populate demo resources - ADMIN only
router.post('/demo/populate', requireAuth, requireRole('ADMIN'), (req: Request, res: Response) => {
  try {
    const created = resourceService.populateDemoData();
    return res.json({ message: 'Loaded clearly marked demo resources', count: created.length });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Clear demo resources - ADMIN only
router.post('/demo/clear', requireAuth, requireRole('ADMIN'), (req: Request, res: Response) => {
  try {
    resourceService.clearDemoData();
    return res.json({ message: 'Removed demo resources' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
