import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { runMigrations } from '../db/migrations.js';
import { createProfile, updateProfile } from '../db/profileRepository.js';
import { createResource } from '../db/resourceRepository.js';
import { createResourceRoutingService, type IResourceRoutingService } from './resourceRouting.js';

function createTestDb(): Database.Database {
  const db = new Database(':memory:');
  db.pragma('foreign_keys = ON');
  runMigrations(db);
  return db;
}

describe('ResourceRoutingService', () => {
  let db: Database.Database;
  let service: IResourceRoutingService;

  beforeEach(() => {
    db = createTestDb();
    service = createResourceRoutingService(db);
  });

  afterEach(() => {
    db.close();
  });

  // ─── Helper: create an approved profile ──────────────────────────────────

  function createApprovedProfile(): string {
    const profile = createProfile(db, {
      schoolName: 'Test School',
      municipality: 'Amsterdam',
      country: 'Netherlands',
      status: 'approved',
      confidenceScore: 0.85,
    });
    updateProfile(db, profile.id, {
      status: 'approved',
      approvedAt: new Date().toISOString(),
      approvedBy: 'teacher-1',
    });
    return profile.id;
  }

  function createPendingProfile(): string {
    const profile = createProfile(db, {
      schoolName: 'Pending School',
      municipality: 'Rotterdam',
      country: 'Netherlands',
      status: 'pending_review',
      confidenceScore: 0.7,
    });
    return profile.id;
  }

  function createExpiredProfile(): string {
    const pastDate = new Date(Date.now() - 1000).toISOString();
    const profile = createProfile(db, {
      schoolName: 'Expired School',
      municipality: 'Utrecht',
      country: 'Netherlands',
      status: 'approved',
      confidenceScore: 0.8,
      expiresAt: pastDate,
    });
    updateProfile(db, profile.id, {
      status: 'approved',
      approvedAt: new Date().toISOString(),
      approvedBy: 'teacher-1',
    });
    return profile.id;
  }

  // ─── getResourcesForRole ─────────────────────────────────────────────────

  describe('getResourcesForRole', () => {
    it('returns resources matching the given role', () => {
      const profileId = createApprovedProfile();

      createResource(db, {
        profileId,
        name: 'Kindertelefoon',
        description: 'Helpline for children',
        phone: '0800-0432',
        targetAudience: ['student'],
        category: 'helpline',
        confidence: 0.99,
        isKnownResource: true,
        verifiedByTeacher: true,
      });

      createResource(db, {
        profileId,
        name: 'Teacher Portal',
        description: 'For teachers only',
        url: 'https://teacher.example.com',
        targetAudience: ['teacher'],
        category: 'support_organization',
        confidence: 0.9,
        isKnownResource: false,
        verifiedByTeacher: true,
      });

      const studentResources = service.getResourcesForRole('student', profileId);
      expect(studentResources).toHaveLength(1);
      expect(studentResources[0].name).toBe('Kindertelefoon');

      const teacherResources = service.getResourcesForRole('teacher', profileId);
      expect(teacherResources).toHaveLength(1);
      expect(teacherResources[0].name).toBe('Teacher Portal');
    });

    it('returns resources that target multiple roles', () => {
      const profileId = createApprovedProfile();

      createResource(db, {
        profileId,
        name: 'Meldknop.nl',
        description: 'Reporting portal',
        url: 'https://meldknop.nl',
        targetAudience: ['student', 'parent'],
        category: 'reporting_portal',
        confidence: 0.99,
        isKnownResource: true,
        verifiedByTeacher: true,
      });

      const studentResources = service.getResourcesForRole('student', profileId);
      expect(studentResources).toHaveLength(1);
      expect(studentResources[0].name).toBe('Meldknop.nl');

      const parentResources = service.getResourcesForRole('parent', profileId);
      expect(parentResources).toHaveLength(1);
      expect(parentResources[0].name).toBe('Meldknop.nl');
    });

    it('returns empty array when no resources match the role', () => {
      const profileId = createApprovedProfile();

      createResource(db, {
        profileId,
        name: 'Teacher Only',
        description: 'Only for teachers',
        targetAudience: ['teacher'],
        category: 'support_organization',
        confidence: 0.9,
        verifiedByTeacher: true,
      });

      const result = service.getResourcesForRole('student', profileId);
      expect(result).toEqual([]);
    });

    it('excludes resources not verified by teacher', () => {
      const profileId = createApprovedProfile();

      createResource(db, {
        profileId,
        name: 'Unverified Resource',
        description: 'Not yet verified',
        targetAudience: ['student'],
        category: 'helpline',
        confidence: 0.6,
        verifiedByTeacher: false,
      });

      const result = service.getResourcesForRole('student', profileId);
      expect(result).toEqual([]);
    });

    it('sorts known resources before non-known resources', () => {
      const profileId = createApprovedProfile();

      createResource(db, {
        profileId,
        name: 'AI Discovered Resource',
        description: 'Found by AI',
        targetAudience: ['student'],
        category: 'counseling',
        confidence: 0.95,
        isKnownResource: false,
        verifiedByTeacher: true,
      });

      createResource(db, {
        profileId,
        name: 'Kindertelefoon',
        description: 'Known helpline',
        phone: '0800-0432',
        targetAudience: ['student'],
        category: 'helpline',
        confidence: 0.99,
        isKnownResource: true,
        verifiedByTeacher: true,
      });

      const result = service.getResourcesForRole('student', profileId);
      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Kindertelefoon');
      expect(result[0].isKnownResource).toBe(true);
      expect(result[1].name).toBe('AI Discovered Resource');
      expect(result[1].isKnownResource).toBe(false);
    });

    it('sorts by confidence descending within same known-resource group', () => {
      const profileId = createApprovedProfile();

      createResource(db, {
        profileId,
        name: 'Low Confidence',
        description: 'Low',
        targetAudience: ['teacher'],
        category: 'support_organization',
        confidence: 0.5,
        isKnownResource: false,
        verifiedByTeacher: true,
      });

      createResource(db, {
        profileId,
        name: 'High Confidence',
        description: 'High',
        targetAudience: ['teacher'],
        category: 'support_organization',
        confidence: 0.9,
        isKnownResource: false,
        verifiedByTeacher: true,
      });

      const result = service.getResourcesForRole('teacher', profileId);
      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('High Confidence');
      expect(result[1].name).toBe('Low Confidence');
    });

    it('returns empty array when profile is not approved', () => {
      const profileId = createPendingProfile();

      createResource(db, {
        profileId,
        name: 'Some Resource',
        description: 'Should not be returned',
        targetAudience: ['student'],
        category: 'helpline',
        confidence: 0.9,
        verifiedByTeacher: true,
      });

      const result = service.getResourcesForRole('student', profileId);
      expect(result).toEqual([]);
    });

    it('returns empty array when profile does not exist', () => {
      const result = service.getResourcesForRole('student', 'non-existent-id');
      expect(result).toEqual([]);
    });

    it('returns empty array when profile is expired (stale)', () => {
      const profileId = createExpiredProfile();

      createResource(db, {
        profileId,
        name: 'Expired Resource',
        description: 'From expired profile',
        targetAudience: ['student'],
        category: 'helpline',
        confidence: 0.9,
        verifiedByTeacher: true,
      });

      const result = service.getResourcesForRole('student', profileId);
      expect(result).toEqual([]);
    });

    it('maps resources to RoutedResource format with actionLabel', () => {
      const profileId = createApprovedProfile();

      createResource(db, {
        profileId,
        name: 'Kindertelefoon',
        description: 'Helpline',
        phone: '0800-0432',
        targetAudience: ['student'],
        category: 'helpline',
        confidence: 0.99,
        isKnownResource: true,
        verifiedByTeacher: true,
      });

      const result = service.getResourcesForRole('student', profileId);
      expect(result).toHaveLength(1);
      expect(result[0].actionLabel).toBe('Bel nu');
      expect(result[0].actionUrl).toBe('tel:0800-0432');
    });

    it('uses URL as actionUrl when available', () => {
      const profileId = createApprovedProfile();

      createResource(db, {
        profileId,
        name: 'Meldknop.nl',
        description: 'Reporting portal',
        url: 'https://meldknop.nl',
        phone: '0800-1234',
        targetAudience: ['student'],
        category: 'reporting_portal',
        confidence: 0.99,
        isKnownResource: true,
        verifiedByTeacher: true,
      });

      const result = service.getResourcesForRole('student', profileId);
      expect(result[0].actionLabel).toBe('Meld hier');
      expect(result[0].actionUrl).toBe('https://meldknop.nl');
    });

    it('returns undefined actionUrl when no url or phone', () => {
      const profileId = createApprovedProfile();

      createResource(db, {
        profileId,
        name: 'Internal Contact',
        description: 'School coordinator',
        targetAudience: ['teacher'],
        category: 'school_internal',
        confidence: 0.9,
        verifiedByTeacher: true,
      });

      const result = service.getResourcesForRole('teacher', profileId);
      expect(result[0].actionLabel).toBe('Intern contact');
      expect(result[0].actionUrl).toBeUndefined();
    });
  });

  // ─── getAllResources ──────────────────────────────────────────────────────

  describe('getAllResources', () => {
    it('returns all verified resources from an approved profile', () => {
      const profileId = createApprovedProfile();

      createResource(db, {
        profileId,
        name: 'Resource 1',
        description: 'First',
        targetAudience: ['student'],
        category: 'helpline',
        confidence: 0.9,
        verifiedByTeacher: true,
      });

      createResource(db, {
        profileId,
        name: 'Resource 2',
        description: 'Second',
        targetAudience: ['teacher'],
        category: 'support_organization',
        confidence: 0.8,
        verifiedByTeacher: true,
      });

      const result = service.getAllResources(profileId);
      expect(result).toHaveLength(2);
    });

    it('excludes unverified resources', () => {
      const profileId = createApprovedProfile();

      createResource(db, {
        profileId,
        name: 'Verified',
        description: 'Verified resource',
        targetAudience: ['student'],
        category: 'helpline',
        confidence: 0.9,
        verifiedByTeacher: true,
      });

      createResource(db, {
        profileId,
        name: 'Unverified',
        description: 'Not verified',
        targetAudience: ['student'],
        category: 'helpline',
        confidence: 0.6,
        verifiedByTeacher: false,
      });

      const result = service.getAllResources(profileId);
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Verified');
    });

    it('returns empty array when profile is not approved', () => {
      const profileId = createPendingProfile();

      createResource(db, {
        profileId,
        name: 'Resource',
        description: 'From pending profile',
        targetAudience: ['student'],
        category: 'helpline',
        confidence: 0.9,
        verifiedByTeacher: true,
      });

      const result = service.getAllResources(profileId);
      expect(result).toEqual([]);
    });

    it('returns empty array when profile does not exist', () => {
      const result = service.getAllResources('non-existent-id');
      expect(result).toEqual([]);
    });

    it('returns empty array when profile is expired', () => {
      const profileId = createExpiredProfile();

      createResource(db, {
        profileId,
        name: 'Expired Resource',
        description: 'From expired profile',
        targetAudience: ['student'],
        category: 'helpline',
        confidence: 0.9,
        verifiedByTeacher: true,
      });

      const result = service.getAllResources(profileId);
      expect(result).toEqual([]);
    });

    it('sorts results: known first, then by confidence desc', () => {
      const profileId = createApprovedProfile();

      createResource(db, {
        profileId,
        name: 'AI Low',
        description: 'Low confidence AI',
        targetAudience: ['student'],
        category: 'counseling',
        confidence: 0.5,
        isKnownResource: false,
        verifiedByTeacher: true,
      });

      createResource(db, {
        profileId,
        name: 'Known Resource',
        description: 'Pre-seeded',
        targetAudience: ['student'],
        category: 'helpline',
        confidence: 0.99,
        isKnownResource: true,
        verifiedByTeacher: true,
      });

      createResource(db, {
        profileId,
        name: 'AI High',
        description: 'High confidence AI',
        targetAudience: ['teacher'],
        category: 'support_organization',
        confidence: 0.9,
        isKnownResource: false,
        verifiedByTeacher: true,
      });

      const result = service.getAllResources(profileId);
      expect(result).toHaveLength(3);
      expect(result[0].name).toBe('Known Resource');
      expect(result[1].name).toBe('AI High');
      expect(result[2].name).toBe('AI Low');
    });
  });

  // ─── getResourcesByCategory ───────────────────────────────────────────────

  describe('getResourcesByCategory', () => {
    it('returns resources matching the given category', () => {
      const profileId = createApprovedProfile();

      createResource(db, {
        profileId,
        name: 'Helpline 1',
        description: 'A helpline',
        targetAudience: ['student'],
        category: 'helpline',
        confidence: 0.9,
        verifiedByTeacher: true,
      });

      createResource(db, {
        profileId,
        name: 'Support Org',
        description: 'A support org',
        targetAudience: ['teacher'],
        category: 'support_organization',
        confidence: 0.8,
        verifiedByTeacher: true,
      });

      const helplines = service.getResourcesByCategory('helpline', profileId);
      expect(helplines).toHaveLength(1);
      expect(helplines[0].name).toBe('Helpline 1');

      const supportOrgs = service.getResourcesByCategory('support_organization', profileId);
      expect(supportOrgs).toHaveLength(1);
      expect(supportOrgs[0].name).toBe('Support Org');
    });

    it('returns empty array when no resources match category', () => {
      const profileId = createApprovedProfile();

      createResource(db, {
        profileId,
        name: 'Helpline',
        description: 'A helpline',
        targetAudience: ['student'],
        category: 'helpline',
        confidence: 0.9,
        verifiedByTeacher: true,
      });

      const result = service.getResourcesByCategory('legal_aid', profileId);
      expect(result).toEqual([]);
    });

    it('returns empty array when profile is not approved', () => {
      const profileId = createPendingProfile();

      createResource(db, {
        profileId,
        name: 'Resource',
        description: 'From pending',
        targetAudience: ['student'],
        category: 'helpline',
        confidence: 0.9,
        verifiedByTeacher: true,
      });

      const result = service.getResourcesByCategory('helpline', profileId);
      expect(result).toEqual([]);
    });
  });

  // ─── Action label mapping ─────────────────────────────────────────────────

  describe('action label mapping', () => {
    it('maps all resource categories to correct Dutch labels', () => {
      const profileId = createApprovedProfile();

      const categories = [
        { category: 'helpline', label: 'Bel nu' },
        { category: 'reporting_portal', label: 'Meld hier' },
        { category: 'support_organization', label: 'Bekijk info' },
        { category: 'government_body', label: 'Contact' },
        { category: 'school_internal', label: 'Intern contact' },
        { category: 'legal_aid', label: 'Juridisch advies' },
        { category: 'counseling', label: 'Maak afspraak' },
      ] as const;

      for (const { category, label } of categories) {
        createResource(db, {
          profileId,
          name: `Resource ${category}`,
          description: `A ${category} resource`,
          targetAudience: ['student'],
          category,
          confidence: 0.9,
          verifiedByTeacher: true,
        });
      }

      const result = service.getAllResources(profileId);

      for (const { category, label } of categories) {
        const resource = result.find((r) => r.category === category);
        expect(resource).toBeDefined();
        expect(resource!.actionLabel).toBe(label);
      }
    });
  });
});
