import { Router, Request, Response } from 'express';
import { requireAuth, requireRole } from '../middleware/authMiddleware.ts';
import { verificationService } from '../services/verificationService.ts';

const router = Router();

/**
 * GET /api/corroboration/:incidentId
 * Retrieve corroboration result & scoring analysis for an incident.
 * Requires Authentication.
 */
router.get('/:incidentId', requireAuth, (req: Request, res: Response) => {
  try {
    const { incidentId } = req.params;
    const result = verificationService.getCorroborationResult(incidentId);
    return res.json(result);
  } catch (err: any) {
    if (err.message && err.message.includes('not found')) {
      return res.status(404).json({ error: err.message });
    }
    return res.status(500).json({ error: err.message || 'Failed to retrieve corroboration result' });
  }
});

/**
 * GET /api/corroboration/:incidentId/evidence
 * Retrieve all evidence items for an incident.
 * Requires Authentication.
 */
router.get('/:incidentId/evidence', requireAuth, (req: Request, res: Response) => {
  try {
    const { incidentId } = req.params;
    const evidence = verificationService.getEvidenceForIncident(incidentId);
    return res.json(evidence);
  } catch (err: any) {
    if (err.message && err.message.includes('not found')) {
      return res.status(404).json({ error: err.message });
    }
    return res.status(500).json({ error: err.message || 'Failed to retrieve evidence items' });
  }
});

/**
 * POST /api/corroboration/:incidentId/evidence
 * Submit new evidence item for an incident.
 * Requires Auth: ADMIN, DISPATCHER, OPERATOR, RESPONDER.
 */
router.post(
  '/:incidentId/evidence',
  requireAuth,
  requireRole('ADMIN', 'DISPATCHER', 'OPERATOR', 'RESPONDER'),
  (req: Request, res: Response) => {
    try {
      const { incidentId } = req.params;
      const user = req.user!;
      const actor = {
        userId: user.userId,
        role: user.role,
        name: user.name
      };

      const { evidence, result } = verificationService.addEvidence(incidentId, req.body, actor);
      return res.status(201).json({ evidence, corroborationResult: result });
    } catch (err: any) {
      if (err.message && err.message.includes('not found')) {
        return res.status(404).json({ error: err.message });
      }
      if (err.message && err.message.includes('Invalid evidence payload')) {
        return res.status(400).json({ error: err.message });
      }
      return res.status(500).json({ error: err.message || 'Failed to submit evidence' });
    }
  }
);

/**
 * POST /api/corroboration/:incidentId/recalculate
 * Force recalculation of evidence corroboration and scoring.
 * Requires Authentication.
 */
router.post('/:incidentId/recalculate', requireAuth, (req: Request, res: Response) => {
  try {
    const { incidentId } = req.params;
    const result = verificationService.recalculate(incidentId);
    return res.json(result);
  } catch (err: any) {
    if (err.message && err.message.includes('not found')) {
      return res.status(404).json({ error: err.message });
    }
    return res.status(500).json({ error: err.message || 'Failed to recalculate corroboration' });
  }
});

/**
 * POST /api/corroboration/:incidentId/verify
 * Manually set verification state (CONFIRMED / DISPUTED / UNVERIFIED).
 * Requires Auth: ADMIN or DISPATCHER.
 */
router.post(
  '/:incidentId/verify',
  requireAuth,
  requireRole('ADMIN', 'DISPATCHER'),
  (req: Request, res: Response) => {
    try {
      const { incidentId } = req.params;
      const { targetStatus, notes } = req.body;
      const user = req.user!;
      const actor = {
        userId: user.userId,
        role: user.role,
        name: user.name
      };

      if (!targetStatus) {
        return res.status(400).json({ error: 'targetStatus is required' });
      }

      const result = verificationService.manuallyVerify(incidentId, targetStatus, notes || '', actor);
      return res.json(result);
    } catch (err: any) {
      if (err.message && err.message.includes('not found')) {
        return res.status(404).json({ error: err.message });
      }
      if (err.message && err.message.includes('Manual verification status must be')) {
        return res.status(400).json({ error: err.message });
      }
      return res.status(500).json({ error: err.message || 'Failed to update verification status' });
    }
  }
);

/**
 * POST /api/corroboration/:incidentId/respond-confirm
 * Submit direct scene confirmation by an authorized responder on scene.
 * Requires Auth: RESPONDER, ADMIN, DISPATCHER.
 */
router.post(
  '/:incidentId/respond-confirm',
  requireAuth,
  requireRole('RESPONDER', 'ADMIN', 'DISPATCHER'),
  (req: Request, res: Response) => {
    try {
      const { incidentId } = req.params;
      const user = req.user!;
      const actor = {
        userId: user.userId,
        role: user.role,
        name: user.name
      };

      const { evidence, result } = verificationService.responderConfirm(incidentId, req.body, actor);
      return res.status(200).json({ evidence, corroborationResult: result });
    } catch (err: any) {
      if (err.message && err.message.includes('not found')) {
        return res.status(404).json({ error: err.message });
      }
      return res.status(500).json({ error: err.message || 'Failed to process responder confirmation' });
    }
  }
);

/**
 * GET /api/corroboration/:incidentId/conflicts
 * Get list of active evidence conflicts for an incident.
 * Requires Authentication.
 */
router.get('/:incidentId/conflicts', requireAuth, (req: Request, res: Response) => {
  try {
    const { incidentId } = req.params;
    const conflicts = verificationService.getConflicts(incidentId);
    return res.json(conflicts);
  } catch (err: any) {
    if (err.message && err.message.includes('not found')) {
      return res.status(404).json({ error: err.message });
    }
    return res.status(500).json({ error: err.message || 'Failed to retrieve evidence conflicts' });
  }
});

export default router;
