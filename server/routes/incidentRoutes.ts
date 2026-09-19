import { Router, Request, Response } from 'express';
import { incidentService } from '../services/incidentService.ts';
import { requireAuth } from '../middleware/authMiddleware.ts';
import { IncidentSeverity, IncidentStatus, IncidentVerification } from '../db/schema.ts';

const router = Router();

// List incidents with filters
router.get('/', requireAuth, (req: Request, res: Response) => {
  try {
    const { status, severity, verificationStatus, search } = req.query;

    const incidents = incidentService.getAllIncidents({
      status: status as IncidentStatus | undefined,
      severity: severity as IncidentSeverity | undefined,
      verificationStatus: verificationStatus as IncidentVerification | undefined,
      search: search as string | undefined
    });

    return res.json({ incidents, total: incidents.length });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to retrieve incidents' });
  }
});

// Get incident by ID
router.get('/:id', requireAuth, (req: Request, res: Response) => {
  const incident = incidentService.getIncidentById(req.params.id);
  if (!incident) {
    return res.status(404).json({ error: 'Incident not found' });
  }
  return res.json({ incident });
});

// Create new incident
router.post('/', requireAuth, (req: Request, res: Response) => {
  try {
    const { title, description, severity, locationAddress, zone, gridSquare } = req.body;

    if (!title || !description) {
      return res.status(400).json({ error: 'Incident title and description are required.' });
    }

    const incident = incidentService.createIncident({
      title,
      description,
      severity: severity || 'MEDIUM',
      locationAddress,
      zone,
      gridSquare,
      reportedByUserId: req.user?.userId,
      reportedByName: req.user?.name,
      isDemoData: false
    });

    return res.status(201).json({ incident });
  } catch (err: any) {
    return res.status(400).json({ error: err.message || 'Failed to create incident' });
  }
});

// Update incident status
router.patch('/:id/status', requireAuth, (req: Request, res: Response) => {
  try {
    const { status } = req.body;
    if (!status) {
      return res.status(400).json({ error: 'Status is required' });
    }

    const updated = incidentService.updateIncidentStatus(
      req.params.id,
      status as IncidentStatus,
      req.user?.name,
      req.user?.userId
    );

    if (!updated) {
      return res.status(404).json({ error: 'Incident not found' });
    }

    return res.json({ incident: updated });
  } catch (err: any) {
    return res.status(400).json({ error: err.message || 'Failed to update incident' });
  }
});

// Populate demo incidents (clearly marked for test evaluation)
router.post('/demo/populate', requireAuth, (req: Request, res: Response) => {
  try {
    const created = incidentService.populateDemoData();
    return res.json({ message: 'Loaded clearly marked demo incidents', count: created.length });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Clear demo incidents
router.post('/demo/clear', requireAuth, (req: Request, res: Response) => {
  try {
    incidentService.clearDemoData();
    return res.json({ message: 'Removed demo incidents' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
