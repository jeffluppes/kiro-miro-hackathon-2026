/**
 * Jurisdiction Discovery API Routes
 *
 * POST /api/jurisdiction/discover — discover jurisdiction for a school
 * GET /api/jurisdiction/:profileId — get profile by ID
 * POST /api/jurisdiction/:profileId/approve — teacher approves profile
 * POST /api/jurisdiction/:profileId/reject — teacher rejects profile
 * POST /api/jurisdiction/:profileId/refresh — re-discover stale profile
 * PATCH /api/jurisdiction/:profileId/resources/:resourceId — edit resource
 */

import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import type Database from 'better-sqlite3';
import { getProfile } from '../db/profileRepository.js';
import {
  getResource,
  updateResource,
  getResourcesByProfileId,
  getLegalObligationsByProfileId,
  getReportingProceduresByProfileId,
} from '../db/resourceRepository.js';
import { createJurisdictionDiscoveryService } from '../services/jurisdictionDiscovery.js';
import {
  DiscoverJurisdictionRequestSchema,
  ApproveProfileRequestSchema,
  RejectProfileRequestSchema,
  EditResourceRequestSchema,
} from '../types/schemas.js';

/**
 * Creates the jurisdiction router with dependency-injected database instance.
 */
export function createJurisdictionRouter(db: Database.Database): Router {
  const router = Router();
  const service = createJurisdictionDiscoveryService(db);

  /**
   * POST /api/jurisdiction/discover
   * Accepts { schoolName }, returns JurisdictionProfile (status: pending_review or cached approved)
   */
  router.post(
    '/discover',
    async (req: Request, res: Response, _next: NextFunction) => {
      try {
        const parsed = DiscoverJurisdictionRequestSchema.safeParse(req.body);
        if (!parsed.success) {
          res.status(400).json({
            error: 'Validation failed',
            details: parsed.error.issues,
          });
          return;
        }

        const profile = await service.discoverJurisdiction(parsed.data.schoolName);
        res.status(201).json(profile);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        console.error('POST /discover error:', message);
        res.status(500).json({ error: 'Internal server error', message });
      }
    }
  );

  /**
   * GET /api/jurisdiction/:profileId
   * Returns profile by ID
   */
  router.get(
    '/:profileId',
    async (req: Request<{ profileId: string }>, res: Response, _next: NextFunction) => {
      try {
        const { profileId } = req.params;
        const profileRow = getProfile(db, profileId);

        if (!profileRow) {
          res.status(404).json({ error: 'Profile not found' });
          return;
        }

        const resourceRows = getResourcesByProfileId(db, profileId);
        const obligationRows = getLegalObligationsByProfileId(db, profileId);
        const procedureRows = getReportingProceduresByProfileId(db, profileId);

        const profile = {
          id: profileRow.id,
          schoolName: profileRow.school_name,
          schoolAddress: profileRow.school_address ?? undefined,
          municipality: profileRow.municipality,
          province: profileRow.province ?? undefined,
          country: profileRow.country,
          status: profileRow.status,
          discoveredAt: profileRow.discovered_at,
          approvedAt: profileRow.approved_at ?? undefined,
          approvedBy: profileRow.approved_by ?? undefined,
          expiresAt: profileRow.expires_at,
          resources: resourceRows.map((r) => ({
            id: r.id,
            profileId: r.profile_id,
            name: r.name,
            description: r.description,
            url: r.url ?? undefined,
            phone: r.phone ?? undefined,
            email: r.email ?? undefined,
            targetAudience: JSON.parse(r.target_audience),
            category: r.category,
            source: r.source,
            confidence: r.confidence,
            isKnownResource: r.is_known_resource === 1,
            verifiedByTeacher: r.verified_by_teacher === 1,
          })),
          legalObligations: obligationRows.map((o) => ({
            id: o.id,
            profileId: o.profile_id,
            title: o.title,
            description: o.description,
            authority: o.authority,
            deadline: o.deadline ?? undefined,
            sourceUrl: o.source_url ?? undefined,
            applicableLaw: o.applicable_law ?? undefined,
            confidence: o.confidence,
          })),
          reportingProcedures: procedureRows.map((p) => ({
            id: p.id,
            profileId: p.profile_id,
            title: p.title,
            steps: JSON.parse(p.steps),
            targetAuthority: p.target_authority,
            requiredDocuments: p.required_documents
              ? JSON.parse(p.required_documents)
              : undefined,
            templateAvailable: p.template_available === 1,
            sourceUrl: p.source_url ?? undefined,
            confidence: p.confidence,
          })),
          confidenceScore: profileRow.confidence_score,
        };

        res.json(profile);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        console.error('GET /:profileId error:', message);
        res.status(500).json({ error: 'Internal server error', message });
      }
    }
  );

  /**
   * POST /api/jurisdiction/:profileId/approve
   * Teacher approves profile
   */
  router.post(
    '/:profileId/approve',
    async (req: Request<{ profileId: string }>, res: Response, _next: NextFunction) => {
      try {
        const parsed = ApproveProfileRequestSchema.safeParse(req.body);
        if (!parsed.success) {
          res.status(400).json({
            error: 'Validation failed',
            details: parsed.error.issues,
          });
          return;
        }

        const { profileId } = req.params;
        const profile = await service.approveProfile(profileId, parsed.data.teacherId);
        res.json(profile);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        if (message.includes('not found')) {
          res.status(404).json({ error: message });
          return;
        }
        if (message.includes('Invalid status transition')) {
          res.status(400).json({ error: message });
          return;
        }
        console.error('POST /:profileId/approve error:', message);
        res.status(500).json({ error: 'Internal server error', message });
      }
    }
  );

  /**
   * POST /api/jurisdiction/:profileId/reject
   * Teacher rejects profile with reason
   */
  router.post(
    '/:profileId/reject',
    async (req: Request<{ profileId: string }>, res: Response, _next: NextFunction) => {
      try {
        const parsed = RejectProfileRequestSchema.safeParse(req.body);
        if (!parsed.success) {
          res.status(400).json({
            error: 'Validation failed',
            details: parsed.error.issues,
          });
          return;
        }

        const { profileId } = req.params;
        await service.rejectProfile(profileId, parsed.data.teacherId, parsed.data.reason);
        res.json({ success: true });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        if (message.includes('not found')) {
          res.status(404).json({ error: message });
          return;
        }
        if (message.includes('Invalid status transition')) {
          res.status(400).json({ error: message });
          return;
        }
        console.error('POST /:profileId/reject error:', message);
        res.status(500).json({ error: 'Internal server error', message });
      }
    }
  );

  /**
   * POST /api/jurisdiction/:profileId/refresh
   * Trigger re-discovery for stale profile
   */
  router.post(
    '/:profileId/refresh',
    async (req: Request<{ profileId: string }>, res: Response, _next: NextFunction) => {
      try {
        const { profileId } = req.params;

        // Verify profile exists before refreshing
        const profileRow = getProfile(db, profileId);
        if (!profileRow) {
          res.status(404).json({ error: 'Profile not found' });
          return;
        }

        const profile = await service.refreshProfile(profileId);
        res.json(profile);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        if (message.includes('not found')) {
          res.status(404).json({ error: message });
          return;
        }
        console.error('POST /:profileId/refresh error:', message);
        res.status(500).json({ error: 'Internal server error', message });
      }
    }
  );

  /**
   * PATCH /api/jurisdiction/:profileId/resources/:resourceId
   * Edit individual resource during review
   */
  router.patch(
    '/:profileId/resources/:resourceId',
    async (
      req: Request<{ profileId: string; resourceId: string }>,
      res: Response,
      _next: NextFunction
    ) => {
      try {
        const parsed = EditResourceRequestSchema.safeParse(req.body);
        if (!parsed.success) {
          res.status(400).json({
            error: 'Validation failed',
            details: parsed.error.issues,
          });
          return;
        }

        const { profileId, resourceId } = req.params;

        // Verify profile exists
        const profileRow = getProfile(db, profileId);
        if (!profileRow) {
          res.status(404).json({ error: 'Profile not found' });
          return;
        }

        // Verify resource exists and belongs to this profile
        const resourceRow = getResource(db, resourceId);
        if (!resourceRow || resourceRow.profile_id !== profileId) {
          res.status(404).json({ error: 'Resource not found' });
          return;
        }

        // Update the resource directly in the discovered_resources table
        const updated = updateResource(db, resourceId, {
          profileId,
          name: parsed.data.name,
          description: parsed.data.description,
          url: parsed.data.url,
          phone: parsed.data.phone,
          email: parsed.data.email,
          targetAudience: parsed.data.targetAudience,
          category: parsed.data.category,
        });

        if (!updated) {
          res.status(404).json({ error: 'Resource not found' });
          return;
        }

        res.json({
          id: updated.id,
          profileId: updated.profile_id,
          name: updated.name,
          description: updated.description,
          url: updated.url ?? undefined,
          phone: updated.phone ?? undefined,
          email: updated.email ?? undefined,
          targetAudience: JSON.parse(updated.target_audience),
          category: updated.category,
          source: updated.source,
          confidence: updated.confidence,
          isKnownResource: updated.is_known_resource === 1,
          verifiedByTeacher: updated.verified_by_teacher === 1,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        console.error('PATCH /:profileId/resources/:resourceId error:', message);
        res.status(500).json({ error: 'Internal server error', message });
      }
    }
  );

  return router;
}
