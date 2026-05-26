/**
 * Resource Routing API Routes
 *
 * GET /api/resources?role={role}&jurisdictionId={id} — filtered resources for role
 * GET /api/resources/all?jurisdictionId={id} — all verified resources
 */

import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import type Database from 'better-sqlite3';
import { createResourceRoutingService } from '../services/resourceRouting.js';
import { GetResourcesQuerySchema } from '../types/schemas.js';
import { z } from 'zod';

const AllResourcesQuerySchema = z.object({
  jurisdictionId: z.string().min(1, 'Jurisdiction ID is required'),
});

/**
 * Creates the resources router with dependency-injected database.
 *
 * @param db - The SQLite database instance
 */
export function createResourcesRouter(db: Database.Database): Router {
  const router = Router();
  const service = createResourceRoutingService(db);

  /**
   * GET /api/resources
   * Returns filtered resources for a role.
   * Query params: role (StakeholderRole enum), jurisdictionId
   */
  router.get(
    '/',
    (req: Request, res: Response, next: NextFunction) => {
      try {
        const parsed = GetResourcesQuerySchema.safeParse(req.query);
        if (!parsed.success) {
          res.status(400).json({
            error: 'Validation failed',
            details: parsed.error.issues,
          });
          return;
        }

        const resources = service.getResourcesForRole(
          parsed.data.role,
          parsed.data.jurisdictionId
        );
        res.json(resources);
      } catch (err) {
        next(err);
      }
    }
  );

  /**
   * GET /api/resources/all
   * Returns all verified resources for a jurisdiction.
   * Query params: jurisdictionId
   */
  router.get(
    '/all',
    (req: Request, res: Response, next: NextFunction) => {
      try {
        const parsed = AllResourcesQuerySchema.safeParse(req.query);
        if (!parsed.success) {
          res.status(400).json({
            error: 'Validation failed',
            details: parsed.error.issues,
          });
          return;
        }

        const resources = service.getAllResources(parsed.data.jurisdictionId);
        res.json(resources);
      } catch (err) {
        next(err);
      }
    }
  );

  return router;
}
