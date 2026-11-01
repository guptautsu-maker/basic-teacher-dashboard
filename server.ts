import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import * as dotenv from 'dotenv';
import { requireAuth, AuthRequest } from './src/middleware/auth.ts';
import {
  getLatestCloudSyncForUser,
  upsertCloudSyncForUser,
} from './src/db/users.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json({ limit: '5mb' }));

  app.get('/api/sync', requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.user?.uid;
      if (!uid) {
        return res.status(401).json({ error: 'Unauthorized user context' });
      }
      const snapshot = await getLatestCloudSyncForUser(uid);
      res.json({ snapshot });
    } catch (error: any) {
      console.error('Failed to fetch cloud sync state:', error);
      res.status(500).json({
        error: error.message || 'Failed to fetch cloud sync state',
      });
    }
  });

  app.post('/api/sync', requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.user?.uid;
      const email = req.user?.email || 'teacher@basicshiksha.up.gov.in';
      if (!uid) {
        return res.status(401).json({ error: 'Unauthorized user context' });
      }

      const {
        academicYear = '2026-27',
        schoolName = 'Basic Shiksha School',
        teacherName = 'Teacher',
        deviceId = 'web-device',
        revisionHash = 'rev-0',
        payloadJson = '{}',
      } = req.body || {};

      const saved = await upsertCloudSyncForUser({
        uid,
        email,
        academicYear: String(academicYear),
        schoolName: String(schoolName),
        teacherName: String(teacherName),
        deviceId: String(deviceId),
        revisionHash: String(revisionHash),
        payloadJson:
          typeof payloadJson === 'string'
            ? payloadJson
            : JSON.stringify(payloadJson),
      });

      res.json({
        ok: true,
        snapshot: saved,
      });
    } catch (error: any) {
      console.error('Failed to save cloud sync state:', error);
      res.status(500).json({
        error: error.message || 'Failed to save cloud sync state',
      });
    }
  });

  if (process.env.NODE_ENV === 'production') {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});
