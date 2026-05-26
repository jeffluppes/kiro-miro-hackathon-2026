import { describe, it, expect, beforeEach, vi } from 'vitest';
import Database from 'better-sqlite3';
import { runMigrations } from '../db/migrations.js';
import { createProfile, updateProfile } from '../db/profileRepository.js';
import {
  createLegalObligation,
  createReportingProcedure,
  createResource,
} from '../db/resourceRepository.js';
import { getStageHistoryByCaseId } from '../db/caseRepository.js';
import {
  createCaseManagementService,
  type GenerateChecklistFn,
  type ICaseManagementService,
} from './caseManagement.js';

function createTestDb(): Database.Database {
  const db = new Database(':memory:');
  db.pragma('foreign_keys = ON');
  runMigrations(db);
  return db;
}

/**
 * Helper: create an approved jurisdiction profile with legal obligations
 * and reporting procedures for testing.
 */
function setupApprovedProfile(db: Database.Database) {
  const profile = createProfile(db, {
    schoolName: 'Basisschool De Regenboog',
    municipality: 'Amsterdam',
    province: 'Noord-Holland',
    country: 'Netherlands',
    status: 'pending_review',
    confidenceScore: 0.85,
  });

  // Approve the profile
  updateProfile(db, profile.id, {
    status: 'approved',
    approvedAt: new Date().toISOString(),
    approvedBy: 'teacher-1',
  });

  // Add legal obligations
  const obligation = createLegalObligation(db, {
    profileId: profile.id,
    title: 'Notify anti-bullying coordinator',
    description: 'Must notify within 24 hours',
    authority: 'School Board',
    deadline: 'within 24 hours',
    applicableLaw: 'Wet veiligheid op school',
    confidence: 0.9,
  });

  // Add reporting procedures
  const procedure = createReportingProcedure(db, {
    profileId: profile.id,
    title: 'Report to SISA',
    steps: ['Document incident', 'Fill SISA form', 'Submit to municipality'],
    targetAuthority: 'Municipality of Amsterdam',
    requiredDocuments: ['Incident report', 'Student details'],
    confidence: 0.85,
  });

  // Add a resource
  const resource = createResource(db, {
    profileId: profile.id,
    name: 'Kindertelefoon',
    description: 'Helpline for children',
    phone: '0800-0432',
    targetAudience: ['student'],
    category: 'helpline',
    source: 'pre-seeded',
    confidence: 0.99,
    isKnownResource: true,
    verifiedByTeacher: true,
  });

  return { profile, obligation, procedure, resource };
}

/**
 * Mock AI checklist generator for testing.
 */
const mockGenerateChecklist: GenerateChecklistFn = vi.fn(async (context) => {
  const items: Array<{ text: string; jurisdictionSpecific: boolean }> = [
    { text: 'Document the incident', jurisdictionSpecific: false },
    { text: 'Interview witnesses', jurisdictionSpecific: false },
  ];

  for (const obligation of context.legalObligations) {
    items.push({
      text: `Comply: ${obligation.title}`,
      jurisdictionSpecific: true,
    });
  }

  for (const procedure of context.reportingProcedures) {
    items.push({
      text: `Execute: ${procedure.title}`,
      jurisdictionSpecific: true,
    });
  }

  return items;
});

describe('CaseManagementService', () => {
  let db: Database.Database;
  let service: ICaseManagementService;

  beforeEach(() => {
    db = createTestDb();
    vi.clearAllMocks();
    service = createCaseManagementService(db, mockGenerateChecklist);
  });

  describe('createCase', () => {
    it('should create a case linked to an approved profile', async () => {
      const { profile } = setupApprovedProfile(db);

      const newCase = await service.createCase({
        teacherId: 'teacher-1',
        studentId: 'student-1',
        jurisdictionProfileId: profile.id,
        incidentType: 'verbal_bullying',
        description: 'Repeated name-calling during recess',
      });

      expect(newCase.id).toBeDefined();
      expect(newCase.teacherId).toBe('teacher-1');
      expect(newCase.studentId).toBe('student-1');
      expect(newCase.jurisdictionProfileId).toBe(profile.id);
      expect(newCase.status).toBe('report');
      expect(newCase.priority).toBe('medium');
      expect(newCase.incidentType).toBe('verbal_bullying');
      expect(newCase.description).toBe('Repeated name-calling during recess');
      expect(newCase.createdAt).toBeInstanceOf(Date);
      expect(newCase.updatedAt).toBeInstanceOf(Date);
    });

    it('should generate a jurisdiction-aware checklist on creation', async () => {
      const { profile } = setupApprovedProfile(db);

      const newCase = await service.createCase({
        teacherId: 'teacher-1',
        jurisdictionProfileId: profile.id,
        incidentType: 'physical_bullying',
        description: 'Student was pushed',
      });

      expect(newCase.checklist.length).toBeGreaterThan(0);
      // Should have generic items + jurisdiction-specific items
      const genericItems = newCase.checklist.filter((i) => !i.jurisdictionSpecific);
      const specificItems = newCase.checklist.filter((i) => i.jurisdictionSpecific);
      expect(genericItems.length).toBeGreaterThan(0);
      expect(specificItems.length).toBeGreaterThan(0);
    });

    it('should call the AI function with correct context', async () => {
      const { profile } = setupApprovedProfile(db);

      await service.createCase({
        teacherId: 'teacher-1',
        jurisdictionProfileId: profile.id,
        incidentType: 'cyberbullying',
        description: 'Online harassment',
      });

      expect(mockGenerateChecklist).toHaveBeenCalledTimes(1);
      const callArgs = (mockGenerateChecklist as any).mock.calls[0][0];
      expect(callArgs.incidentType).toBe('cyberbullying');
      expect(callArgs.description).toBe('Online harassment');
      expect(callArgs.legalObligations.length).toBeGreaterThan(0);
      expect(callArgs.reportingProcedures.length).toBeGreaterThan(0);
    });

    it('should throw if jurisdictionProfileId does not exist', async () => {
      await expect(
        service.createCase({
          teacherId: 'teacher-1',
          jurisdictionProfileId: 'non-existent-id',
          incidentType: 'verbal_bullying',
          description: 'Test',
        })
      ).rejects.toThrow('Jurisdiction profile not found');
    });

    it('should throw if jurisdiction profile is not approved', async () => {
      const profile = createProfile(db, {
        schoolName: 'Test School',
        status: 'pending_review',
      });

      await expect(
        service.createCase({
          teacherId: 'teacher-1',
          jurisdictionProfileId: profile.id,
          incidentType: 'verbal_bullying',
          description: 'Test',
        })
      ).rejects.toThrow('Jurisdiction profile must be approved');
    });

    it('should record initial stage in case_stage_history', async () => {
      const { profile } = setupApprovedProfile(db);

      const newCase = await service.createCase({
        teacherId: 'teacher-1',
        jurisdictionProfileId: profile.id,
        incidentType: 'verbal_bullying',
        description: 'Test',
      });

      const history = getStageHistoryByCaseId(db, newCase.id);
      expect(history.length).toBe(1);
      expect(history[0]!.from_stage).toBeNull();
      expect(history[0]!.to_stage).toBe('report');
      expect(history[0]!.changed_by).toBe('teacher-1');
    });

    it('should accept optional priority', async () => {
      const { profile } = setupApprovedProfile(db);

      const newCase = await service.createCase({
        teacherId: 'teacher-1',
        jurisdictionProfileId: profile.id,
        incidentType: 'physical_bullying',
        description: 'Serious incident',
        priority: 'high',
      });

      expect(newCase.priority).toBe('high');
    });
  });

  describe('updateStage', () => {
    it('should transition from report to triage', async () => {
      const { profile } = setupApprovedProfile(db);
      const newCase = await service.createCase({
        teacherId: 'teacher-1',
        jurisdictionProfileId: profile.id,
        incidentType: 'verbal_bullying',
        description: 'Test',
      });

      const updated = await service.updateStage(newCase.id, 'triage', 'teacher-1');
      expect(updated.status).toBe('triage');
    });

    it('should record the transition in case_stage_history', async () => {
      const { profile } = setupApprovedProfile(db);
      const newCase = await service.createCase({
        teacherId: 'teacher-1',
        jurisdictionProfileId: profile.id,
        incidentType: 'verbal_bullying',
        description: 'Test',
      });

      await service.updateStage(newCase.id, 'triage', 'teacher-1');

      const history = getStageHistoryByCaseId(db, newCase.id);
      // Initial creation + transition
      expect(history.length).toBe(2);
      expect(history[1]!.from_stage).toBe('report');
      expect(history[1]!.to_stage).toBe('triage');
      expect(history[1]!.changed_by).toBe('teacher-1');
      expect(history[1]!.changed_at).toBeDefined();
    });

    it('should support full lifecycle: report → triage → review → action → resolve', async () => {
      const { profile } = setupApprovedProfile(db);
      const newCase = await service.createCase({
        teacherId: 'teacher-1',
        jurisdictionProfileId: profile.id,
        incidentType: 'verbal_bullying',
        description: 'Test',
      });

      let current = await service.updateStage(newCase.id, 'triage', 'teacher-1');
      expect(current.status).toBe('triage');

      current = await service.updateStage(newCase.id, 'review', 'teacher-1');
      expect(current.status).toBe('review');

      current = await service.updateStage(newCase.id, 'action', 'teacher-1');
      expect(current.status).toBe('action');

      current = await service.updateStage(newCase.id, 'resolve', 'teacher-1');
      expect(current.status).toBe('resolve');
    });

    it('should throw on invalid transition (report → review)', async () => {
      const { profile } = setupApprovedProfile(db);
      const newCase = await service.createCase({
        teacherId: 'teacher-1',
        jurisdictionProfileId: profile.id,
        incidentType: 'verbal_bullying',
        description: 'Test',
      });

      await expect(
        service.updateStage(newCase.id, 'review', 'teacher-1')
      ).rejects.toThrow('Invalid stage transition');
    });

    it('should throw on invalid transition (resolve → report)', async () => {
      const { profile } = setupApprovedProfile(db);
      const newCase = await service.createCase({
        teacherId: 'teacher-1',
        jurisdictionProfileId: profile.id,
        incidentType: 'verbal_bullying',
        description: 'Test',
      });

      // Move to resolve
      await service.updateStage(newCase.id, 'triage', 'teacher-1');
      await service.updateStage(newCase.id, 'review', 'teacher-1');
      await service.updateStage(newCase.id, 'action', 'teacher-1');
      await service.updateStage(newCase.id, 'resolve', 'teacher-1');

      await expect(
        service.updateStage(newCase.id, 'report', 'teacher-1')
      ).rejects.toThrow('Invalid stage transition');
    });

    it('should throw if case does not exist', async () => {
      await expect(
        service.updateStage('non-existent-id', 'triage', 'teacher-1')
      ).rejects.toThrow('Case not found');
    });
  });

  describe('getCase', () => {
    it('should return a case with its checklist', async () => {
      const { profile } = setupApprovedProfile(db);
      const created = await service.createCase({
        teacherId: 'teacher-1',
        jurisdictionProfileId: profile.id,
        incidentType: 'verbal_bullying',
        description: 'Test incident',
      });

      const fetched = await service.getCase(created.id);
      expect(fetched.id).toBe(created.id);
      expect(fetched.teacherId).toBe('teacher-1');
      expect(fetched.checklist.length).toBeGreaterThan(0);
    });

    it('should throw if case does not exist', async () => {
      await expect(service.getCase('non-existent-id')).rejects.toThrow(
        'Case not found'
      );
    });
  });

  describe('getCasesForTeacher', () => {
    it('should return all cases for a teacher', async () => {
      const { profile } = setupApprovedProfile(db);

      await service.createCase({
        teacherId: 'teacher-1',
        jurisdictionProfileId: profile.id,
        incidentType: 'verbal_bullying',
        description: 'Case 1',
      });

      await service.createCase({
        teacherId: 'teacher-1',
        jurisdictionProfileId: profile.id,
        incidentType: 'physical_bullying',
        description: 'Case 2',
      });

      await service.createCase({
        teacherId: 'teacher-2',
        jurisdictionProfileId: profile.id,
        incidentType: 'cyberbullying',
        description: 'Case 3 (different teacher)',
      });

      const cases = await service.getCasesForTeacher('teacher-1');
      expect(cases.length).toBe(2);
      expect(cases.every((c) => c.teacherId === 'teacher-1')).toBe(true);
    });

    it('should return empty array if teacher has no cases', async () => {
      const cases = await service.getCasesForTeacher('teacher-no-cases');
      expect(cases).toEqual([]);
    });
  });

  describe('generateChecklist', () => {
    it('should generate and store checklist items for a case', async () => {
      const { profile } = setupApprovedProfile(db);
      const newCase = await service.createCase({
        teacherId: 'teacher-1',
        jurisdictionProfileId: profile.id,
        incidentType: 'verbal_bullying',
        description: 'Test',
      });

      // Clear mock call count from createCase
      vi.clearAllMocks();

      const checklist = await service.generateChecklist(newCase.id);
      expect(checklist.length).toBeGreaterThan(0);
      expect(mockGenerateChecklist).toHaveBeenCalledTimes(1);

      // Verify items are stored
      const fetched = await service.getCase(newCase.id);
      expect(fetched.checklist.length).toBe(checklist.length);
    });

    it('should replace existing checklist items', async () => {
      const { profile } = setupApprovedProfile(db);
      const newCase = await service.createCase({
        teacherId: 'teacher-1',
        jurisdictionProfileId: profile.id,
        incidentType: 'verbal_bullying',
        description: 'Test',
      });

      // Generate again — should replace
      const newChecklist = await service.generateChecklist(newCase.id);
      const fetched = await service.getCase(newCase.id);
      expect(fetched.checklist.length).toBe(newChecklist.length);
    });

    it('should throw if case does not exist', async () => {
      await expect(
        service.generateChecklist('non-existent-id')
      ).rejects.toThrow('Case not found');
    });
  });

  describe('getLegalGuidance', () => {
    it('should return legal obligations from the linked profile', async () => {
      const { profile } = setupApprovedProfile(db);
      const newCase = await service.createCase({
        teacherId: 'teacher-1',
        jurisdictionProfileId: profile.id,
        incidentType: 'verbal_bullying',
        description: 'Test',
      });

      const guidance = await service.getLegalGuidance(newCase.id);

      expect(guidance.obligations.length).toBeGreaterThan(0);
      expect(guidance.obligations[0]!.title).toBe(
        'Notify anti-bullying coordinator'
      );
      expect(guidance.obligations[0]!.applicableLaw).toBe(
        'Wet veiligheid op school'
      );
    });

    it('should return reporting procedures from the linked profile', async () => {
      const { profile } = setupApprovedProfile(db);
      const newCase = await service.createCase({
        teacherId: 'teacher-1',
        jurisdictionProfileId: profile.id,
        incidentType: 'verbal_bullying',
        description: 'Test',
      });

      const guidance = await service.getLegalGuidance(newCase.id);

      expect(guidance.procedures.length).toBeGreaterThan(0);
      expect(guidance.procedures[0]!.title).toBe('Report to SISA');
      expect(guidance.procedures[0]!.targetAuthority).toBe(
        'Municipality of Amsterdam'
      );
    });

    it('should return resources from the linked profile', async () => {
      const { profile } = setupApprovedProfile(db);
      const newCase = await service.createCase({
        teacherId: 'teacher-1',
        jurisdictionProfileId: profile.id,
        incidentType: 'verbal_bullying',
        description: 'Test',
      });

      const guidance = await service.getLegalGuidance(newCase.id);

      expect(guidance.resources.length).toBeGreaterThan(0);
      expect(guidance.resources[0]!.name).toBe('Kindertelefoon');
    });

    it('should include generatedAt timestamp', async () => {
      const { profile } = setupApprovedProfile(db);
      const newCase = await service.createCase({
        teacherId: 'teacher-1',
        jurisdictionProfileId: profile.id,
        incidentType: 'verbal_bullying',
        description: 'Test',
      });

      const guidance = await service.getLegalGuidance(newCase.id);
      expect(guidance.generatedAt).toBeInstanceOf(Date);
    });

    it('should throw if case does not exist', async () => {
      await expect(
        service.getLegalGuidance('non-existent-id')
      ).rejects.toThrow('Case not found');
    });
  });
});
