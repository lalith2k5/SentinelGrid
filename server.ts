import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { db } from './server/db/database.ts';
import authRoutes from './server/routes/authRoutes.ts';
import incidentRoutes from './server/routes/incidentRoutes.ts';
import resourceRoutes from './server/routes/resourceRoutes.ts';
import systemRoutes from './server/routes/systemRoutes.ts';
import meshRoutes from './server/routes/meshRoutes.ts';
import routingRoutes from './server/routes/routingRoutes.ts';
import dispatchRoutes from './server/routes/dispatchRoutes.ts';
import mapRoutes from './server/routes/mapRoutes.ts';

const PORT = 3000;

async function startServer() {
  // Initialize local persistence
  await db.init();

  const app = express();

  // Basic middleware
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // API Health Check
  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      platform: 'SentinelGrid Foundation',
      mode: 'OFFLINE-FIRST',
      time: new Date().toISOString()
    });
  });

  // Mount API routers
  app.use('/api/auth', authRoutes);
  app.use('/api/incidents', incidentRoutes);
  app.use('/api/resources', resourceRoutes);
  app.use('/api/system', systemRoutes);
  app.use('/api/mesh', meshRoutes);
  app.use('/api/routing', routingRoutes);
  app.use('/api/dispatches', dispatchRoutes);
  app.use('/api/map', mapRoutes);

  // Vite integration
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[SentinelGrid Core] Running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('[SentinelGrid Core] Failed to launch server:', err);
  process.exit(1);
});
