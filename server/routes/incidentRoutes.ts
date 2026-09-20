import { Router, Request, Response } from 'express';
import { incidentService } from '../services/incidentService.ts';
import { triageService } from '../services/triageService.ts';
import { requireAuth, requireRole } from '../middleware/authMiddleware.ts';
import { IncidentSeverity, IncidentStatus, IncidentVerification } from '../db/schema.ts';

const router = Router();

// List incidents with filters - all authenticated roles can view incidents
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

// Get incident by ID - all authenticated roles can view incident details
router.get('/:id', requireAuth, (req: Request, res: Response) => {
  const incident = incidentService.getIncidentById(req.params.id);
  if (!incident) {
    return res.status(404).json({ error: 'Incident not found' });
  }
  return res.json({ incident });
});

// Create new incident - ADMIN, DISPATCHER, OPERATOR can report/create incidents
router.post('/', requireAuth, requireRole('ADMIN', 'DISPATCHER', 'OPERATOR'), (req: Request, res: Response) => {
  try {
    const { title, description, severity, locationAddress, zone, gridSquare, latitude, longitude } = req.body;

    if (!title || typeof title !== 'string' || !title.trim()) {
      return res.status(400).json({ error: 'Incident title is required.' });
    }

    if (!description || typeof description !== 'string' || !description.trim()) {
      return res.status(400).json({ error: 'Incident description is required.' });
    }

    const validSeverities: IncidentSeverity[] = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFORMATIONAL'];
    if (severity && !validSeverities.includes(severity)) {
      return res.status(400).json({ error: `Invalid severity. Must be one of: ${validSeverities.join(', ')}` });
    }

    const incident = incidentService.createIncident({
      title,
      description,
      severity: severity as IncidentSeverity,
      locationAddress,
      zone,
      gridSquare,
      latitude: latitude !== undefined && latitude !== null && latitude !== '' ? Number(latitude) : null,
      longitude: longitude !== undefined && longitude !== null && longitude !== '' ? Number(longitude) : null,
      reportedByUserId: req.user?.userId,
      reportedByName: req.user?.name,
      isDemoData: false
    });

    return res.status(201).json({ incident });
  } catch (err: any) {
    return res.status(400).json({ error: err.message || 'Failed to create incident' });
  }
});

// Update incident status - ADMIN, DISPATCHER, RESPONDER can update operational status (OPERATOR cannot)
router.patch('/:id/status', requireAuth, requireRole('ADMIN', 'DISPATCHER', 'RESPONDER'), (req: Request, res: Response) => {
  try {
    const { status } = req.body;
    if (!status) {
      return res.status(400).json({ error: 'Status is required.' });
    }

    const validStatuses: IncidentStatus[] = ['OPEN', 'INVESTIGATING', 'DISPATCHED', 'CONTAINED', 'RESOLVED'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
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

// Populate demo incidents - Admin only
router.post('/demo/populate', requireAuth, requireRole('ADMIN'), (req: Request, res: Response) => {
  try {
    const created = incidentService.populateDemoData();
    return res.json({ message: 'Loaded clearly marked demo incidents', count: created.length });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Clear demo incidents - Admin only
router.post('/demo/clear', requireAuth, requireRole('ADMIN'), (req: Request, res: Response) => {
  try {
    incidentService.clearDemoData();
    return res.json({ message: 'Removed demo incidents' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Phase 3: AI-Assisted Incident Triage Endpoints

// POST /api/incidents/:id/triage — Run / Re-run AI triage on an incident
// Roles: ADMIN, DISPATCHER, OPERATOR
router.post('/:id/triage', requireAuth, requireRole('ADMIN', 'DISPATCHER', 'OPERATOR'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!id || typeof id !== 'string' || !id.trim()) {
      return res.status(400).json({ error: 'Valid incident ID is required.' });
    }

    const triageRecord = await triageService.runTriage(id, {
      userId: req.user?.userId,
      name: req.user?.name,
      role: req.user?.role
    });

    return res.status(200).json({
      triage: triageRecord,
      message: 'AI-assisted triage completed successfully (Advisory only).'
    });
  } catch (err: any) {
    if (err.message && err.message.includes('not found')) {
      return res.status(404).json({ error: err.message });
    }
    return res.status(500).json({ error: err.message || 'Failed to execute AI triage.' });
  }
});

// GET /api/incidents/:id/triage — Get latest AI triage record for an incident
// Roles: All authenticated roles
router.get('/:id/triage', requireAuth, (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!id || typeof id !== 'string' || !id.trim()) {
      return res.status(400).json({ error: 'Valid incident ID is required.' });
    }

    const latest = triageService.getLatestTriage(id);
    return res.status(200).json({ triage: latest });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to retrieve triage record.' });
  }
});

// GET /api/incidents/:id/triage/history — Get full historical triage records for an incident
// Roles: All authenticated roles
router.get('/:id/triage/history', requireAuth, (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!id || typeof id !== 'string' || !id.trim()) {
      return res.status(400).json({ error: 'Valid incident ID is required.' });
    }

    const history = triageService.getTriageHistory(id);
    return res.status(200).json({ history, total: history.length });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to retrieve triage history.' });
  }
});

export default router;
