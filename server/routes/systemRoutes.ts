import { Router, Request, Response } from 'express';
import { systemStatusService } from '../services/systemStatusService.ts';
import { meshCommunicationService } from '../services/meshCommunicationService.ts';
import { aiRegistry } from '../ai/index.ts';

const router = Router();

// Full system status overview
router.get('/status', async (_req: Request, res: Response) => {
  try {
    const status = await systemStatusService.getComprehensiveStatus();
    return res.json(status);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to check system status' });
  }
});

// Mesh network metrics (reports non-configured / simulation state)
router.get('/mesh-metrics', (_req: Request, res: Response) => {
  const metrics = meshCommunicationService.getMeshMetrics();
  return res.json(metrics);
});

// AI providers list & status
router.get('/ai-providers', async (_req: Request, res: Response) => {
  try {
    const providers = await aiRegistry.getAllStatuses();
    return res.json({ providers });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
