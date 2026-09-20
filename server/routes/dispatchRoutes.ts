import { Router, Request, Response } from 'express';
import { requireAuth, requireRole } from '../middleware/authMiddleware.ts';
import { dispatchService } from '../services/dispatchService.ts';
import { db } from '../db/database.ts';
import { DispatchStatus } from '../db/schema.ts';

const router = Router();

// GET /api/dispatches - List all dispatches (filtered for responders, or unfiltered for admin/dispatcher)
router.get('/', requireAuth, (req: Request, res: Response) => {
  try {
    const { incidentId, resourceId, status } = req.query;
    let dispatches = db.getDispatches();

    // Enforce role-based access
    if (req.user?.role === 'RESPONDER') {
      const responder = db.getResponderByUserId(req.user.userId);
      const assignedResId = responder?.assignedResourceId;
      if (!assignedResId) {
        dispatches = [];
      } else {
        dispatches = dispatches.filter(d => d.resourceId === assignedResId);
      }
    }

    // Apply queries
    if (incidentId && typeof incidentId === 'string') {
      dispatches = dispatches.filter(d => d.incidentId === incidentId);
    }
    if (resourceId && typeof resourceId === 'string') {
      dispatches = dispatches.filter(d => d.resourceId === resourceId);
    }
    if (status && typeof status === 'string') {
      dispatches = dispatches.filter(d => d.status === status);
    }

    return res.json({ dispatches, total: dispatches.length });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to retrieve dispatches' });
  }
});

// GET /api/dispatches/:id - Retrieve a single dispatch
router.get('/:id', requireAuth, (req: Request, res: Response) => {
  try {
    const dispatch = db.getDispatchById(req.params.id);
    if (!dispatch) {
      return res.status(404).json({ error: `Dispatch with ID "${req.params.id}" not found` });
    }

    // Enforce responder isolation
    if (req.user?.role === 'RESPONDER') {
      const responder = db.getResponderByUserId(req.user.userId);
      const assignedResId = responder?.assignedResourceId;
      const isAssigned = !!(assignedResId && dispatch.resourceId === assignedResId);
      if (!isAssigned) {
        return res.status(403).json({ error: 'Forbidden. Responders may only view their own assignments.' });
      }
    }

    return res.json({ dispatch });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to retrieve dispatch' });
  }
});

// POST /api/dispatches - Create a dispatch
router.post('/', requireAuth, requireRole('ADMIN', 'DISPATCHER'), (req: Request, res: Response) => {
  try {
    const { incidentId, resourceId, dispatchNotes, priority } = req.body;

    if (!incidentId || typeof incidentId !== 'string' || !incidentId.trim()) {
      return res.status(400).json({ error: 'Incident ID is required and must be a string.' });
    }
    if (!resourceId || typeof resourceId !== 'string' || !resourceId.trim()) {
      return res.status(400).json({ error: 'Resource ID is required and must be a string.' });
    }
    if (dispatchNotes !== undefined && typeof dispatchNotes !== 'string') {
      return res.status(400).json({ error: 'Dispatch notes must be a string.' });
    }
    if (priority !== undefined && typeof priority !== 'string') {
      return res.status(400).json({ error: 'Priority must be a string.' });
    }

    const dispatch = dispatchService.createDispatch({
      incidentId: incidentId.trim(),
      resourceId: resourceId.trim(),
      dispatchNotes,
      priority,
      createdBy: req.user!.name,
      actorRole: req.user!.role,
      actorId: req.user!.userId
    });

    return res.status(201).json({ dispatch });
  } catch (err: any) {
    const msg = err.message;

    // Map specific eligibility error codes to appropriate HTTP statuses
    if (msg === 'RESOURCE_UNAVAILABLE' || msg === 'INCOMPATIBLE_RESOURCE') {
      return res.status(400).json({ error: msg });
    }
    if (msg === 'RESOURCE_ALREADY_DISPATCHED') {
      return res.status(409).json({ error: msg });
    }
    if (
      msg === 'NO_SAFE_ROUTE' ||
      msg === 'OUTSIDE_OFFLINE_MAP' ||
      msg === 'LOCATION_UNAVAILABLE' ||
      msg === 'ROUTE_UNREACHABLE'
    ) {
      return res.status(422).json({ error: msg });
    }

    return res.status(500).json({ error: msg || 'Failed to create dispatch' });
  }
});

// POST /api/dispatches/:id/transition - Update a dispatch status
router.post('/:id/transition', requireAuth, (req: Request, res: Response) => {
  try {
    const { status, reason, notes, verifiedVictimCount } = req.body;
    if (!status || typeof status !== 'string') {
      return res.status(400).json({ error: 'Status is required and must be a valid string.' });
    }
    if (reason !== undefined && typeof reason !== 'string') {
      return res.status(400).json({ error: 'Reason must be a string.' });
    }
    if (notes !== undefined && typeof notes !== 'string') {
      return res.status(400).json({ error: 'Notes must be a string.' });
    }
    if (verifiedVictimCount !== undefined && typeof verifiedVictimCount !== 'number') {
      return res.status(400).json({ error: 'Verified victim count must be a number.' });
    }

    const dispatchId = req.params.id;
    const existingDispatch = db.getDispatchById(dispatchId);
    if (!existingDispatch) {
      return res.status(404).json({ error: `Dispatch with ID "${dispatchId}" not found` });
    }

    // Enforce server-side Responder ownership check
    if (req.user!.role === 'RESPONDER') {
      const responder = db.getResponderByUserId(req.user!.userId);
      const assignedResId = responder?.assignedResourceId;
      if (!responder || !assignedResId || assignedResId !== existingDispatch.resourceId) {
        return res.status(403).json({ error: 'Forbidden. Responders may only update their own assigned dispatches.' });
      }
    }

    const dispatch = dispatchService.transitionDispatch(dispatchId, status as DispatchStatus, {
      userId: req.user!.userId,
      name: req.user!.name,
      role: req.user!.role,
      reason,
      notes,
      verifiedVictimCount
    });

    return res.json({ dispatch });
  } catch (err: any) {
    const msg = err.message;
    if (msg.includes('not found')) {
      return res.status(404).json({ error: msg });
    }
    if (msg.includes('not authorized') || msg.includes('Operators are not') || msg.includes('Forbidden')) {
      return res.status(403).json({ error: msg });
    }
    if (msg.includes('reason') || msg.includes('Invalid status transition') || msg.includes('required') || msg.includes('must not exceed') || msg.includes('victim count')) {
      return res.status(400).json({ error: msg });
    }
    return res.status(500).json({ error: msg || 'Failed to transition dispatch status' });
  }
});

// POST /api/dispatches/:id/reassign - Reassign dispatch to another resource
router.post('/:id/reassign', requireAuth, requireRole('ADMIN', 'DISPATCHER'), (req: Request, res: Response) => {
  try {
    const { newResourceId, reason } = req.body;
    if (!newResourceId || typeof newResourceId !== 'string') {
      return res.status(400).json({ error: 'New Resource ID is required and must be a string.' });
    }
    if (reason !== undefined && typeof reason !== 'string') {
      return res.status(400).json({ error: 'Reason must be a string.' });
    }

    const dispatch = dispatchService.reassignDispatch(req.params.id, newResourceId, {
      userId: req.user!.userId,
      name: req.user!.name,
      role: req.user!.role,
      reason: reason || ''
    });

    return res.json({ dispatch });
  } catch (err: any) {
    const msg = err.message;
    if (msg.includes('not found')) {
      return res.status(404).json({ error: msg });
    }
    if (msg.includes('reason') || msg.includes('compatibility') || msg.includes('UNAVAILABLE') || msg.includes('INCOMPATIBLE')) {
      return res.status(400).json({ error: msg });
    }
    if (msg === 'RESOURCE_ALREADY_DISPATCHED') {
      return res.status(409).json({ error: msg });
    }
    return res.status(500).json({ error: msg || 'Failed to reassign dispatch' });
  }
});

export default router;
