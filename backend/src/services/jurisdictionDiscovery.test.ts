/**
 * Unit tests for JurisdictionDiscoveryService.
 *
 * Uses an in-memory SQLite database and mocks the AI agent loop
 * to avoid real API calls.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import Database from 'better-sqlite3';
import { runMigrations } from '../db/migrations.js';
import { createJurisdictionDiscoveryService } from './jurisdictionDiscovery.js';
import type { IJurisdictionDiscoveryService } from './jurisdictionDiscovery.js';
import { createProfile } from '../db/profileRepository.js';
import type { StructuredDiscoveryResult } from './aiAgent.js';

// ─── Mock the AI agent ───────────────────────────────────────────────────────

vi.mock('./aiAgent.js', () => ({
  processAgentLoop: vi.fn(),
}));

import { processAgentLoop } from './aiAgent.js';
const mockProcessAgentLoop = vi.mocked(processAgentLoop);

// ─── Test Helpers ────────────────────────────────────────────────────────────

function createTestDb(): Database.Database {
  const db = new Database(':memory:');
  db.pragma('foreign_keys = ON');
  runMigrations(db);
  return db;
}

function makeDutchDiscoveryResult(overrides?: Partial<StructuredDiscoveryResult>): StructuredDiscoveryResult {
  return {
    municipality: 'Amsterdam',
    province: 'Noord-Holland',
    country: 'Netherlands',
    resources: [
      {
        name: 'Local Support Center',
        description: 'A local support center for bullying victims',
        url: 'https://www.localsupport.nl',
        targetAudience: ['student', 'parent'],
        category: 'support_organization',
      },
    ],
    legalObligations: [
      {
        title: 'Wet veiligheid op school',
        description: 'Schools must have an anti-bullying policy',
        authority: 'Inspectie van het Onderwijs',
        deadline: 'within 5 school days',
        applicableLaw: 'Wet veiligheid op school (2015)',
      },
    ],
    reportingProcedures: [
      {
        title: 'Report to school board',
        steps: ['Document incident', 'Notify coordinator', 'File report'],
        targetAuthority: 'School Board',
        requiredDocuments: ['Incident form'],
      },
    ],
    overallConfidence: 0.82,
    ...overrides,
  };
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('JurisdictionDiscoveryService', () => {
  let db: Database.Database;
  let service: IJurisdictionDiscoveryService;

  beforeEach(() => {
    db = createTestDb();
    service = createJurisdictionDiscoveryService(db);
    vi.clearAllMocks();
  });

  describe('discoverJurisdiction', () => {
    it('should create a profile and store discovery results', async () => {
      mockProcessAgentLoop.mockResolvedValue(makeDutchDiscoveryResult());

      const profile = await service.discoverJurisdiction('Basisschool De Regenboog');

      expect(profile.schoolName).toBe('Basisschool De Regenboog');
      expect(profile.municipality).toBe('Amsterdam');
      expect(profile.province).toBe('Noord-Holland');
      expect(profile.country).toBe('Netherlands');
      expect(profile.status).toBe('pending_review');
      expect(profile.confidenceScore).toBe(0.82);
    });

    it('should include known Dutch resources when country is Netherlands', async () => {
      mockProcessAgentLoop.mockResolvedValue(makeDutchDiscoveryResult());

      const profile = await service.discoverJurisdiction('Basisschool De Regenboog');

      // Should have the AI-discovered resource + known Dutch resources
      const knownNames = profile.resources
        .filter((r) => r.isKnownResource)
        .map((r) => r.name);

      expect(knownNames).toContain('Kindertelefoon');
      expect(knownNames).toContain('Meldknop.nl');
      expect(knownNames).toContain('Stichting School & Veiligheid');
    });

    it('should preserve AI-discovered resources after merge', async () => {
      mockProcessAgentLoop.mockResolvedValue(makeDutchDiscoveryResult());

      const profile = await service.discoverJurisdiction('Test School');

      const aiDiscovered = profile.resources.find(
        (r) => r.name === 'Local Support Center'
      );
      expect(aiDiscovered).toBeDefined();
      expect(aiDiscovered!.source).toBe('ai-discovered');
    });

    it('should store legal obligations', async () => {
      mockProcessAgentLoop.mockResolvedValue(makeDutchDiscoveryResult());

      const profile = await service.discoverJurisdiction('Test School');

      expect(profile.legalObligations).toHaveLength(1);
      expect(profile.legalObligations[0]!.title).toBe('Wet veiligheid op school');
      expect(profile.legalObligations[0]!.authority).toBe('Inspectie van het Onderwijs');
    });

    it('should store reporting procedures', async () => {
      mockProcessAgentLoop.mockResolvedValue(makeDutchDiscoveryResult());

      const profile = await service.discoverJurisdiction('Test School');

      expect(profile.reportingProcedures).toHaveLength(1);
      expect(profile.reportingProcedures[0]!.title).toBe('Report to school board');
      expect(profile.reportingProcedures[0]!.steps).toEqual([
        'Document incident',
        'Notify coordinator',
        'File report',
      ]);
    });

    it('should return cached approved profile without calling AI', async () => {
      // Create an approved, non-stale profile
      createProfile(db, {
        schoolName: 'Cached School',
        municipality: 'Rotterdam',
        country: 'Netherlands',
        status: 'approved',
        confidenceScore: 0.9,
      });

      const profile = await service.discoverJurisdiction('Cached School');

      expect(profile.status).toBe('approved');
      expect(profile.municipality).toBe('Rotterdam');
      expect(mockProcessAgentLoop).not.toHaveBeenCalled();
    });

    it('should handle AI failure gracefully with confidence 0.1', async () => {
      mockProcessAgentLoop.mockRejectedValue(new Error('API key invalid'));

      const profile = await service.discoverJurisdiction('Unknown School');

      expect(profile.status).toBe('pending_review');
      expect(profile.confidenceScore).toBe(0.1);
      expect(profile.municipality).toBe('');
    });

    it('should handle AI returning empty municipality with low confidence', async () => {
      mockProcessAgentLoop.mockResolvedValue(
        makeDutchDiscoveryResult({
          municipality: '',
          country: 'Netherlands',
          overallConfidence: 0.1,
          resources: [],
          legalObligations: [],
          reportingProcedures: [],
        })
      );

      const profile = await service.discoverJurisdiction('Nonexistent School');

      expect(profile.status).toBe('pending_review');
      expect(profile.confidenceScore).toBe(0.1);
      expect(profile.municipality).toBe('');
      // Should still seed known Dutch resources
      const knownNames = profile.resources
        .filter((r) => r.isKnownResource)
        .map((r) => r.name);
      expect(knownNames).toContain('Kindertelefoon');
    });

    it('should not return stale cached profile', async () => {
      // Create an approved but expired profile
      const pastDate = new Date(Date.now() - 1000).toISOString();
      createProfile(db, {
        schoolName: 'Stale School',
        municipality: 'Utrecht',
        country: 'Netherlands',
        status: 'approved',
        expiresAt: pastDate,
        confidenceScore: 0.9,
      });

      mockProcessAgentLoop.mockResolvedValue(makeDutchDiscoveryResult());

      const profile = await service.discoverJurisdiction('Stale School');

      // Should have triggered a new discovery
      expect(mockProcessAgentLoop).toHaveBeenCalled();
      expect(profile.status).toBe('pending_review');
    });
  });

  describe('approveProfile', () => {
    it('should approve a pending_review profile', async () => {
      mockProcessAgentLoop.mockResolvedValue(makeDutchDiscoveryResult());
      const discovered = await service.discoverJurisdiction('Test School');

      const approved = await service.approveProfile(discovered.id, 'teacher-123');

      expect(approved.status).toBe('approved');
      expect(approved.approvedBy).toBe('teacher-123');
      expect(approved.approvedAt).toBeDefined();
    });

    it('should mark all resources as verified when approving', async () => {
      mockProcessAgentLoop.mockResolvedValue(makeDutchDiscoveryResult());
      const discovered = await service.discoverJurisdiction('Test School');

      const approved = await service.approveProfile(discovered.id, 'teacher-123');

      // All resources should be verified
      for (const resource of approved.resources) {
        expect(resource.verifiedByTeacher).toBe(true);
      }
    });

    it('should throw when approving a non-pending_review profile', async () => {
      const profileRow = createProfile(db, {
        schoolName: 'Test',
        status: 'discovering',
      });

      await expect(
        service.approveProfile(profileRow.id, 'teacher-123')
      ).rejects.toThrow('Invalid status transition');
    });

    it('should throw when profile does not exist', async () => {
      await expect(
        service.approveProfile('non-existent-id', 'teacher-123')
      ).rejects.toThrow('Profile not found');
    });
  });

  describe('rejectProfile', () => {
    it('should reject a pending_review profile', async () => {
      mockProcessAgentLoop.mockResolvedValue(makeDutchDiscoveryResult());
      const discovered = await service.discoverJurisdiction('Test School');

      await service.rejectProfile(discovered.id, 'teacher-123', 'Inaccurate data');

      // Verify the profile is now rejected
      const approved = await service.getApprovedProfile('Test School');
      expect(approved).toBeNull();
    });

    it('should throw when rejecting a non-pending_review profile', async () => {
      const profileRow = createProfile(db, {
        schoolName: 'Test',
        status: 'approved',
      });

      await expect(
        service.rejectProfile(profileRow.id, 'teacher-123', 'reason')
      ).rejects.toThrow('Invalid status transition');
    });

    it('should throw when profile does not exist', async () => {
      await expect(
        service.rejectProfile('non-existent-id', 'teacher-123', 'reason')
      ).rejects.toThrow('Profile not found');
    });
  });

  describe('getApprovedProfile', () => {
    it('should return null when no profile exists', async () => {
      const result = await service.getApprovedProfile('Nonexistent School');
      expect(result).toBeNull();
    });

    it('should return null when profile is not approved', async () => {
      createProfile(db, {
        schoolName: 'Pending School',
        status: 'pending_review',
      });

      const result = await service.getApprovedProfile('Pending School');
      expect(result).toBeNull();
    });

    it('should return null when profile is stale', async () => {
      const pastDate = new Date(Date.now() - 1000).toISOString();
      createProfile(db, {
        schoolName: 'Stale School',
        status: 'approved',
        expiresAt: pastDate,
      });

      const result = await service.getApprovedProfile('Stale School');
      expect(result).toBeNull();
    });

    it('should return approved non-stale profile', async () => {
      createProfile(db, {
        schoolName: 'Good School',
        municipality: 'Amsterdam',
        country: 'Netherlands',
        status: 'approved',
        confidenceScore: 0.9,
      });

      const result = await service.getApprovedProfile('Good School');
      expect(result).not.toBeNull();
      expect(result!.status).toBe('approved');
      expect(result!.municipality).toBe('Amsterdam');
    });
  });

  describe('refreshProfile', () => {
    it('should trigger a new discovery for the same school', async () => {
      mockProcessAgentLoop.mockResolvedValue(makeDutchDiscoveryResult());

      const original = await service.discoverJurisdiction('Test School');
      mockProcessAgentLoop.mockResolvedValue(
        makeDutchDiscoveryResult({ municipality: 'Rotterdam' })
      );

      const refreshed = await service.refreshProfile(original.id);

      expect(refreshed.status).toBe('pending_review');
      expect(refreshed.municipality).toBe('Rotterdam');
      // Should be a different profile
      expect(refreshed.id).not.toBe(original.id);
    });

    it('should throw when profile does not exist', async () => {
      await expect(service.refreshProfile('non-existent-id')).rejects.toThrow(
        'Profile not found'
      );
    });
  });

  describe('status transition validation', () => {
    it('should not allow discovering → approved', async () => {
      const profileRow = createProfile(db, {
        schoolName: 'Test',
        status: 'discovering',
      });

      await expect(
        service.approveProfile(profileRow.id, 'teacher-123')
      ).rejects.toThrow('Invalid status transition: discovering → approved');
    });

    it('should not allow approved → rejected', async () => {
      const profileRow = createProfile(db, {
        schoolName: 'Test',
        status: 'approved',
      });

      await expect(
        service.rejectProfile(profileRow.id, 'teacher-123', 'reason')
      ).rejects.toThrow('Invalid status transition: approved → rejected');
    });

    it('should not allow rejected → approved', async () => {
      const profileRow = createProfile(db, {
        schoolName: 'Test',
        status: 'rejected',
      });

      await expect(
        service.approveProfile(profileRow.id, 'teacher-123')
      ).rejects.toThrow('Invalid status transition: rejected → approved');
    });
  });
});
