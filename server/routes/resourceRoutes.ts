import { Router, Request, Response } from 'express';
import { resourceService } from '../services/resourceService.ts';
import { requireAuth } from '../middleware/authMiddleware.ts';
import { ResourceAvailability, ResourceType } from '../db/schema.ts';

const router = Router();

// List resources with filters
router.get('/', requireAuth, (req: Request, res: Response) => {
  try {
    const { type, availability, search } = req.query;

    const resources = resourceService.getAllResources({
      type: type as ResourceType | undefined,
      availability: availability as ResourceAvailability | undefined,
      search: search as string | undefined
    });

    return res.json({ resources, total: resources.length });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to retrieve resources' });
  }
});

// Create new resource
router.post('/', requireAuth, (req: Request, res: Response) => {
  try {
    const { name, type, location, capacity, statusDetails, availability } = req.body;

    if (!name || !type || !location) {
      return res.status(400).json({ error: 'Name, type, and location are required.' });
    }

    const resource = resourceService.createResource({
      name,
      type,
      location,
      capacity,
      statusDetails,
      availability: availability || 'AVAILABLE',
      isDemoData: false,
      actorName: req.user?.name,
      actorId: req.user?.userId
    });

    return res.status(201).json({ resource });
  } catch (err: any) {
    return res.status(400).json({ error: err.message || 'Failed to create resource' });
  }
});

// Update resource status/availability
router.patch('/:id/status', requireAuth, (req: Request, res: Response) => {
  try {
    const { availability, statusDetails } = req.body;

    if (!availability) {
      return res.status(400).json({ error: 'Availability status is required' });
    }

    const updated = resourceService.updateResourceStatus(
      req.params.id,
      availability as ResourceAvailability,
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

// Populate demo resources
router.post('/demo/populate', requireAuth, (req: Request, res: Response) => {
  try {
    const created = resourceService.populateDemoData();
    return res.json({ message: 'Loaded clearly marked demo resources', count: created.length });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Clear demo resources
router.post('/demo/clear', requireAuth, (req: Request, res: Response) => {
  try {
    resourceService.clearDemoData();
    return res.json({ message: 'Removed demo resources' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
