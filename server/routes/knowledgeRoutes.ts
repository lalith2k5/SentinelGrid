import { Router, Request, Response } from 'express';
import { ragKnowledgeService } from '../services/ragKnowledgeService.ts';
import { requireAuth, requireRole } from '../middleware/authMiddleware.ts';
import { KnowledgeStatus } from '../knowledge/types.ts';

const router = Router();

/**
 * GET /api/knowledge/status
 * Get knowledge subsystem operational status and corpus metadata.
 */
router.get('/status', (_req: Request, res: Response) => {
  try {
    const info = ragKnowledgeService.getInfo();
    const metadata = ragKnowledgeService.getCorpusMetadata();
    res.json({
      success: true,
      status: 'OPERATIONAL',
      info,
      metadata,
      offlineGuaranteed: true,
      zeroCloudCompliance: true
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to retrieve knowledge status' });
  }
});

/**
 * GET /api/knowledge/categories
 * Get all categories with counts.
 */
router.get('/categories', (_req: Request, res: Response) => {
  try {
    const categories = ragKnowledgeService.getCategoriesWithCounts();
    res.json({ success: true, categories });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to retrieve categories' });
  }
});

/**
 * GET /api/knowledge/versions
 * Get corpus version metadata and version history across documents.
 */
router.get('/versions', (_req: Request, res: Response) => {
  try {
    const metadata = ragKnowledgeService.getCorpusMetadata();
    const docs = ragKnowledgeService.getDocuments();
    const versions = docs.map(d => ({
      documentId: d.id,
      title: d.title,
      version: d.version,
      lastReviewed: d.lastReviewed,
      isOutdated: d.isOutdated,
      versionHistory: d.versionHistory || []
    }));
    res.json({
      success: true,
      corpus: metadata,
      documents: versions
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to retrieve versions' });
  }
});

/**
 * GET /api/knowledge/search
 * Search knowledge documents with query string and optional filters.
 */
router.get('/search', (req: Request, res: Response) => {
  try {
    const { q, category, hazard, status } = req.query;
    const documents = ragKnowledgeService.getDocuments({
      search: typeof q === 'string' ? q : undefined,
      category: typeof category === 'string' ? category : undefined,
      hazard: typeof hazard === 'string' ? hazard : undefined,
      status: typeof status === 'string' ? status : undefined
    });
    res.json({
      success: true,
      count: documents.length,
      documents
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to search knowledge base' });
  }
});

/**
 * GET /api/knowledge
 * List all knowledge documents with optional filters.
 */
router.get('/', (req: Request, res: Response) => {
  try {
    const { category, hazard, status, search } = req.query;
    const documents = ragKnowledgeService.getDocuments({
      category: typeof category === 'string' ? category : undefined,
      hazard: typeof hazard === 'string' ? hazard : undefined,
      status: typeof status === 'string' ? status : undefined,
      search: typeof search === 'string' ? search : undefined
    });

    res.json({
      success: true,
      count: documents.length,
      corpusVersion: ragKnowledgeService.getCorpusMetadata().version,
      documents
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to retrieve knowledge documents' });
  }
});

/**
 * GET /api/knowledge/:id
 * Get single knowledge document by ID.
 */
router.get('/:id', (req: Request, res: Response) => {
  try {
    const doc = ragKnowledgeService.getDocumentById(req.params.id);
    if (!doc) {
      return res.status(404).json({ error: `Knowledge document "${req.params.id}" not found.` });
    }
    res.json({ success: true, document: doc });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to retrieve knowledge document' });
  }
});

/**
 * POST /api/knowledge/retrieve
 * POST /api/knowledge/query
 * Deterministic RAG query endpoint.
 */
const handleRAGQuery = (req: Request, res: Response) => {
  try {
    const input = req.body || {};
    const actor = (req as any).user ? {
      userId: (req as any).user.id,
      role: (req as any).user.role,
      name: (req as any).user.name
    } : undefined;

    const result = ragKnowledgeService.queryRAG(input, actor);
    res.json({ success: true, ...result });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to execute RAG query' });
  }
};

router.post('/retrieve', handleRAGQuery);
router.post('/query', handleRAGQuery);

/**
 * POST /api/knowledge
 * Create new knowledge document (ADMIN only).
 */
router.post('/', requireAuth, requireRole('ADMIN'), (req: Request, res: Response) => {
  try {
    const body = req.body;
    if (!body || !body.id || !body.title || !body.content || !body.category) {
      return res.status(400).json({ error: 'id, title, category, and content are required fields.' });
    }

    const actor = (req as any).user ? {
      userId: (req as any).user.id,
      role: (req as any).user.role,
      name: (req as any).user.name
    } : undefined;

    const newDoc = ragKnowledgeService.createDocument(body, actor);
    res.status(201).json({ success: true, document: newDoc });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to create knowledge document' });
  }
});

/**
 * PUT /api/knowledge/:id
 * Update knowledge document (ADMIN only).
 */
router.put('/:id', requireAuth, requireRole('ADMIN'), (req: Request, res: Response) => {
  try {
    const actor = (req as any).user ? {
      userId: (req as any).user.id,
      role: (req as any).user.role,
      name: (req as any).user.name
    } : undefined;

    const updated = ragKnowledgeService.updateDocument(req.params.id, req.body, actor);
    res.json({ success: true, document: updated });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to update knowledge document' });
  }
});

/**
 * POST /api/knowledge/:id/version
 * Publish new version of a knowledge document (ADMIN only).
 */
router.post('/:id/version', requireAuth, requireRole('ADMIN'), (req: Request, res: Response) => {
  try {
    const { version, changeLog, updatedContent } = req.body;
    if (!version || !changeLog) {
      return res.status(400).json({ error: 'version and changeLog are required to publish a new version.' });
    }

    const actor = (req as any).user ? {
      userId: (req as any).user.id,
      role: (req as any).user.role,
      name: (req as any).user.name
    } : undefined;

    const updated = ragKnowledgeService.publishNewVersion(
      req.params.id,
      version,
      changeLog,
      updatedContent,
      actor
    );

    res.json({ success: true, document: updated });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to publish new version' });
  }
});

/**
 * PATCH /api/knowledge/:id/status
 * Update document status (ADMIN only).
 */
router.patch('/:id/status', requireAuth, requireRole('ADMIN'), (req: Request, res: Response) => {
  try {
    const { status } = req.body;
    if (!status || !['ACTIVE', 'INACTIVE', 'ARCHIVED', 'DRAFT'].includes(status)) {
      return res.status(400).json({ error: 'Valid status is required (ACTIVE, INACTIVE, ARCHIVED, DRAFT).' });
    }

    const actor = (req as any).user ? {
      userId: (req as any).user.id,
      role: (req as any).user.role,
      name: (req as any).user.name
    } : undefined;

    const updated = ragKnowledgeService.setDocumentStatus(req.params.id, status as KnowledgeStatus, actor);
    res.json({ success: true, document: updated });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to update document status' });
  }
});

export default router;
