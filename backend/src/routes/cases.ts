/**
 * Case Management API Routes
 *
 * POST /api/cases — create case linked to jurisdiction profile
 * GET /api/cases/:id — get case with checklist
 * GET /api/cases?teacherId={id} — list cases for teacher
 * PATCH /api/cases/:id/stage — update case stage
 * GET /api/cases/:id/legal-guidance — get jurisdiction-specific legal guidance
 */

import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import type Database from 'better-sqlite3';
import { createCaseManagementService } from '../services/caseManagement.js';
import {
  CreateCaseRequestSchema,
  UpdateCaseStageRequestSchema,
} from '../types/schemas.js';
import { z } from 'zod';

/** Zod schema for GET /api/cases query params */
const GetCasesQuerySchema = z.object({
  teacherId: z.string().min(1, 'Teacher ID is required'),
});

/**
 * Creates the cases router with all case management endpoints.
 *
 * @param db - The SQLite database instance (dependency injection)
 * @returns Express Router with case management routes
 */
export function createCasesRouter(db: Database.Database): Router {
  const router = Router();
  const service = createCaseManagementService(db);

  /**
   * POST /api/cases
   * Create a new case linked to a jurisdiction profile.
   * Validates: Requirements 6.1, 6.2, 11.1
   */
  router.post(
    '/',
    async (req: Request, res: Response, _next: NextFunction) => {
      try {
        const parsed = CreateCaseRequestSchema.safeParse(req.body);
        if (!parsed.success) {
          res.status(400).json({
            error: 'Validation failed',
            details: parsed.error.issues,
          });
          return;
        }

        const newCase = await service.createCase(parsed.data);
        res.status(201).json(newCase);
      } catch (err) {
        if (err instanceof Error) {
          if (err.message.includes('not found')) {
            res.status(404).json({ error: err.message });
            return;
          }
          if (err.message.includes('must be approved')) {
            res.status(400).json({ error: err.message });
            return;
          }
        }
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  );

  /**
   * GET /api/cases/:id
   * Get case with checklist.
   * Validates: Requirements 6.3, 6.4
   */
  router.get(
    '/:id',
    async (req: Request, res: Response, _next: NextFunction) => {
      try {
        const id = req.params.id as string;
        const caseData = await service.getCase(id);
        res.json(caseData);
      } catch (err) {
        if (err instanceof Error && err.message.includes('not found')) {
          res.status(404).json({ error: err.message });
          return;
        }
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  );

  /**
   * GET /api/cases?teacherId={id}
   * List cases for a teacher.
   * Validates: Requirements 6.4, 11.3
   */
  router.get(
    '/',
    async (req: Request, res: Response, _next: NextFunction) => {
      try {
        const parsed = GetCasesQuerySchema.safeParse(req.query);
        if (!parsed.success) {
          res.status(400).json({
            error: 'Validation failed',
            details: parsed.error.issues,
          });
          return;
        }

        const cases = await service.getCasesForTeacher(parsed.data.teacherId);
        res.json(cases);
      } catch (err) {
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  );

  /**
   * PATCH /api/cases/:id/stage
   * Update case stage.
   * Validates: Requirements 6.4, 6.5
   */
  router.patch(
    '/:id/stage',
    async (req: Request, res: Response, _next: NextFunction) => {
      try {
        const parsed = UpdateCaseStageRequestSchema.safeParse(req.body);
        if (!parsed.success) {
          res.status(400).json({
            error: 'Validation failed',
            details: parsed.error.issues,
          });
          return;
        }

        const id = req.params.id as string;
        const updatedCase = await service.updateStage(
          id,
          parsed.data.stage,
          parsed.data.teacherId
        );
        res.json(updatedCase);
      } catch (err) {
        if (err instanceof Error) {
          if (err.message.includes('not found')) {
            res.status(404).json({ error: err.message });
            return;
          }
          if (err.message.includes('Invalid stage transition')) {
            res.status(400).json({ error: err.message });
            return;
          }
        }
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  );

  /**
   * GET /api/cases/:id/legal-guidance
   * Get jurisdiction-specific legal guidance for a case.
   * Validates: Requirements 6.3
   */
  router.get(
    '/:id/legal-guidance',
    async (req: Request, res: Response, _next: NextFunction) => {
      try {
        const id = req.params.id as string;
        const guidance = await service.getLegalGuidance(id);
        res.json(guidance);
      } catch (err) {
        if (err instanceof Error && err.message.includes('not found')) {
          res.status(404).json({ error: err.message });
          return;
        }
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  );

  return router;
}
