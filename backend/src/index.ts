/**
 * SchoolGuard Backend — Express app entry point.
 *
 * Sets up environment loading, database initialization, CORS,
 * JSON body parsing, route mounting, error handling, and graceful shutdown.
 */

import 'dotenv/config';
import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { getDatabase, closeDatabase } from './db/index.js';
import { createJurisdictionRouter } from './routes/jurisdiction.js';
import { createResourcesRouter } from './routes/resources.js';
import { createCasesRouter } from './routes/cases.js';

// ─── Environment ─────────────────────────────────────────────────────────────

const PORT = parseInt(process.env.PORT || '3001', 10);

// ─── Database Initialization ─────────────────────────────────────────────────

// Initialize the database (runs migrations on first call)
const db = getDatabase();

// ─── App Setup ───────────────────────────────────────────────────────────────

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// ─── Routes ──────────────────────────────────────────────────────────────────

// Health check
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Mount route modules
app.use('/api/jurisdiction', createJurisdictionRouter(db));
app.use('/api/resources', createResourcesRouter(db));
app.use('/api/cases', createCasesRouter(db));

// ─── Global Error Handler ────────────────────────────────────────────────────

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Unhandled error:', err.message);

  // Handle known error patterns
  if (err.message.includes('not found')) {
    res.status(404).json({ error: err.message });
    return;
  }

  if (err.message.includes('Invalid status transition') || err.message.includes('Invalid stage transition')) {
    res.status(400).json({ error: err.message });
    return;
  }

  if (err.message.includes('must be approved')) {
    res.status(400).json({ error: err.message });
    return;
  }

  // Default: 500 Internal Server Error
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

// ─── Start Server ────────────────────────────────────────────────────────────

if (process.env.NODE_ENV !== 'test') {
  const server = app.listen(PORT, () => {
    console.log(`SchoolGuard backend running on port ${PORT}`);
  });

  // ─── Graceful Shutdown ───────────────────────────────────────────────────────

  function shutdown() {
    console.log('\nShutting down gracefully...');
    server.close(() => {
      closeDatabase();
      console.log('Database closed. Goodbye.');
      process.exit(0);
    });
  }

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

export { db };
export default app;
