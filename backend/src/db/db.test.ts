import { describe, it, expect, beforeEach } from 'vitest';
import Database from 'better-sqlite3';
import { runMigrations } from './migrations.js';
import {
  createProfile,
  getProfile,
  updateProfile,
  getProfileBySchoolName,
} from './profileRepository.js';

function createTestDb(): Database.Database {
  const db = new Database(':memory:');
  db.pragma('foreign_keys = ON');
  runMigrations(db);
  return db;
}

describe('Database migrations', () => {
  it('should create all required tables', () => {
    const db = createTestDb();

    const tables = db
      .prepare(
        "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
      )
      .all() as { name: string }[];

    const tableNames = tables.map((t) => t.name);

    expect(tableNames).toContain('jurisdiction_profiles');
    expect(tableNames).toContain('discovered_resources');
    expect(tableNames).toContain('legal_obligations');
    expect(tableNames).toContain('reporting_procedures');
    expect(tableNames).toContain('cases');
    expect(tableNames).toContain('checklist_items');
    expect(tableNames).toContain('case_stage_history');
    expect(tableNames).toContain('schema_migrations');

    db.close();
  });

  it('should be idempotent (running migrations twice does not error)', () => {
    const db = createTestDb();
    // Running migrations again should not throw
    expect(() => runMigrations(db)).not.toThrow();
    db.close();
  });
});

describe('Profile repository', () => {
  let db: Database.Database;

  beforeEach(() => {
    db = createTestDb();
  });

  describe('createProfile', () => {
    it('should create a profile with default values', () => {
      const profile = createProfile(db, {
        schoolName: 'Basisschool De Regenboog',
      });

      expect(profile.id).toBeDefined();
      expect(profile.school_name).toBe('Basisschool De Regenboog');
      expect(profile.status).toBe('discovering');
      expect(profile.municipality).toBe('');
      expect(profile.country).toBe('');
      expect(profile.confidence_score).toBe(0);
      expect(profile.discovered_at).toBeDefined();
      expect(profile.expires_at).toBeDefined();
    });

    it('should create a profile with all provided fields', () => {
      const profile = createProfile(db, {
        schoolName: 'Test School',
        schoolAddress: '123 Main St',
        municipality: 'Amsterdam',
        province: 'Noord-Holland',
        country: 'Netherlands',
        status: 'pending_review',
        confidenceScore: 0.85,
      });

      expect(profile.school_name).toBe('Test School');
      expect(profile.school_address).toBe('123 Main St');
      expect(profile.municipality).toBe('Amsterdam');
      expect(profile.province).toBe('Noord-Holland');
      expect(profile.country).toBe('Netherlands');
      expect(profile.status).toBe('pending_review');
      expect(profile.confidence_score).toBe(0.85);
    });

    it('should set expiry to 30 days from now by default', () => {
      const before = Date.now();
      const profile = createProfile(db, { schoolName: 'Test' });
      const expiresAt = new Date(profile.expires_at).getTime();
      const thirtyDays = 30 * 24 * 60 * 60 * 1000;

      expect(expiresAt).toBeGreaterThanOrEqual(before + thirtyDays - 1000);
      expect(expiresAt).toBeLessThanOrEqual(Date.now() + thirtyDays + 1000);
    });
  });

  describe('getProfile', () => {
    it('should return null for non-existent profile', () => {
      const result = getProfile(db, 'non-existent-id');
      expect(result).toBeNull();
    });

    it('should return the profile by id', () => {
      const created = createProfile(db, { schoolName: 'Test School' });
      const fetched = getProfile(db, created.id);

      expect(fetched).not.toBeNull();
      expect(fetched!.id).toBe(created.id);
      expect(fetched!.school_name).toBe('Test School');
    });
  });

  describe('updateProfile', () => {
    it('should return null for non-existent profile', () => {
      const result = updateProfile(db, 'non-existent-id', {
        municipality: 'Amsterdam',
      });
      expect(result).toBeNull();
    });

    it('should update specified fields only', () => {
      const created = createProfile(db, {
        schoolName: 'Test School',
        municipality: '',
        country: '',
      });

      const updated = updateProfile(db, created.id, {
        municipality: 'Amsterdam',
        country: 'Netherlands',
        status: 'pending_review',
        confidenceScore: 0.82,
      });

      expect(updated).not.toBeNull();
      expect(updated!.municipality).toBe('Amsterdam');
      expect(updated!.country).toBe('Netherlands');
      expect(updated!.status).toBe('pending_review');
      expect(updated!.confidence_score).toBe(0.82);
      // Unchanged fields
      expect(updated!.school_name).toBe('Test School');
    });

    it('should update approved_at and approved_by', () => {
      const created = createProfile(db, {
        schoolName: 'Test School',
        status: 'pending_review',
      });

      const now = new Date().toISOString();
      const updated = updateProfile(db, created.id, {
        status: 'approved',
        approvedAt: now,
        approvedBy: 'teacher-123',
      });

      expect(updated!.status).toBe('approved');
      expect(updated!.approved_at).toBe(now);
      expect(updated!.approved_by).toBe('teacher-123');
    });

    it('should return existing profile when no fields to update', () => {
      const created = createProfile(db, { schoolName: 'Test School' });
      const result = updateProfile(db, created.id, {});

      expect(result).not.toBeNull();
      expect(result!.id).toBe(created.id);
    });
  });

  describe('getProfileBySchoolName', () => {
    it('should return null when no profile exists for school name', () => {
      const result = getProfileBySchoolName(db, 'Non-existent School');
      expect(result).toBeNull();
    });

    it('should return the profile matching the school name', () => {
      createProfile(db, { schoolName: 'Basisschool De Regenboog' });
      const result = getProfileBySchoolName(db, 'Basisschool De Regenboog');

      expect(result).not.toBeNull();
      expect(result!.school_name).toBe('Basisschool De Regenboog');
    });

    it('should return the most recent profile when multiple exist', () => {
      createProfile(db, {
        schoolName: 'Test School',
        municipality: 'First',
      });

      // Small delay to ensure different created_at
      createProfile(db, {
        schoolName: 'Test School',
        municipality: 'Second',
      });

      const result = getProfileBySchoolName(db, 'Test School');
      expect(result).not.toBeNull();
      expect(result!.municipality).toBe('Second');
    });
  });
});
