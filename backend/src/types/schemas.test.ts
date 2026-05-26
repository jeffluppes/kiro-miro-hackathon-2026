import { describe, expect, it } from 'vitest';
import {
  ApproveProfileRequestSchema,
  CasePrioritySchema,
  CaseSchema,
  CaseStageSchema,
  CreateCaseRequestSchema,
  DiscoverJurisdictionRequestSchema,
  DiscoveredResourceSchema,
  EditResourceRequestSchema,
  GetResourcesQuerySchema,
  JurisdictionProfileSchema,
  LegalObligationSchema,
  ProfileStatusSchema,
  RejectProfileRequestSchema,
  ReportingProcedureSchema,
  ResourceCategorySchema,
  StakeholderRoleSchema,
  UpdateCaseStageRequestSchema,
} from './schemas.js';

describe('Enum schemas', () => {
  it('validates ProfileStatus values', () => {
    expect(ProfileStatusSchema.parse('discovering')).toBe('discovering');
    expect(ProfileStatusSchema.parse('pending_review')).toBe('pending_review');
    expect(ProfileStatusSchema.parse('approved')).toBe('approved');
    expect(ProfileStatusSchema.parse('rejected')).toBe('rejected');
    expect(ProfileStatusSchema.parse('stale')).toBe('stale');
    expect(() => ProfileStatusSchema.parse('invalid')).toThrow();
  });

  it('validates StakeholderRole values', () => {
    expect(StakeholderRoleSchema.parse('student')).toBe('student');
    expect(StakeholderRoleSchema.parse('parent')).toBe('parent');
    expect(StakeholderRoleSchema.parse('teacher')).toBe('teacher');
    expect(StakeholderRoleSchema.parse('coordinator')).toBe('coordinator');
    expect(() => StakeholderRoleSchema.parse('admin')).toThrow();
  });

  it('validates ResourceCategory values', () => {
    expect(ResourceCategorySchema.parse('helpline')).toBe('helpline');
    expect(ResourceCategorySchema.parse('reporting_portal')).toBe('reporting_portal');
    expect(ResourceCategorySchema.parse('counseling')).toBe('counseling');
    expect(() => ResourceCategorySchema.parse('unknown')).toThrow();
  });

  it('validates CaseStage values', () => {
    expect(CaseStageSchema.parse('report')).toBe('report');
    expect(CaseStageSchema.parse('resolve')).toBe('resolve');
    expect(() => CaseStageSchema.parse('closed')).toThrow();
  });

  it('validates CasePriority values', () => {
    expect(CasePrioritySchema.parse('critical')).toBe('critical');
    expect(CasePrioritySchema.parse('low')).toBe('low');
    expect(() => CasePrioritySchema.parse('urgent')).toThrow();
  });
});

describe('DiscoveredResource schema', () => {
  const validResource = {
    id: 'res-1',
    profileId: 'prof-1',
    name: 'Kindertelefoon',
    description: 'Helpline for children',
    url: 'https://kindertelefoon.nl',
    phone: '0800-0432',
    targetAudience: ['student'],
    category: 'helpline',
    source: 'pre-seeded',
    confidence: 0.99,
    isKnownResource: true,
    verifiedByTeacher: false,
  };

  it('accepts a valid resource', () => {
    const result = DiscoveredResourceSchema.parse(validResource);
    expect(result.name).toBe('Kindertelefoon');
    expect(result.confidence).toBe(0.99);
  });

  it('rejects confidence out of bounds', () => {
    expect(() => DiscoveredResourceSchema.parse({ ...validResource, confidence: 1.5 })).toThrow();
    expect(() => DiscoveredResourceSchema.parse({ ...validResource, confidence: -0.1 })).toThrow();
  });

  it('rejects empty name', () => {
    expect(() => DiscoveredResourceSchema.parse({ ...validResource, name: '' })).toThrow();
  });

  it('rejects empty targetAudience', () => {
    expect(() => DiscoveredResourceSchema.parse({ ...validResource, targetAudience: [] })).toThrow();
  });

  it('rejects invalid category', () => {
    expect(() => DiscoveredResourceSchema.parse({ ...validResource, category: 'invalid' })).toThrow();
  });
});

describe('LegalObligation schema', () => {
  const validObligation = {
    id: 'obl-1',
    profileId: 'prof-1',
    title: 'Wet veiligheid op school',
    description: 'Schools must have an anti-bullying policy',
    authority: 'Inspectie van het Onderwijs',
    deadline: 'within 24 hours',
    applicableLaw: 'Wet veiligheid op school (2015)',
    confidence: 0.85,
  };

  it('accepts a valid obligation', () => {
    const result = LegalObligationSchema.parse(validObligation);
    expect(result.title).toBe('Wet veiligheid op school');
  });

  it('allows optional fields to be omitted', () => {
    const { deadline, sourceUrl, applicableLaw, ...minimal } = validObligation;
    expect(() => LegalObligationSchema.parse(minimal)).not.toThrow();
  });
});

describe('ReportingProcedure schema', () => {
  const validProcedure = {
    id: 'proc-1',
    profileId: 'prof-1',
    title: 'Report to Inspectie',
    steps: [
      { order: 0, description: 'Document the incident', responsible: 'teacher' },
      { order: 1, description: 'Notify coordinator', responsible: 'coordinator' },
    ],
    targetAuthority: 'Inspectie van het Onderwijs',
    requiredDocuments: ['incident report', 'witness statements'],
    templateAvailable: true,
    confidence: 0.75,
  };

  it('accepts a valid procedure', () => {
    const result = ReportingProcedureSchema.parse(validProcedure);
    expect(result.steps).toHaveLength(2);
  });

  it('rejects empty steps array', () => {
    expect(() => ReportingProcedureSchema.parse({ ...validProcedure, steps: [] })).toThrow();
  });
});

describe('JurisdictionProfile schema', () => {
  const validProfile = {
    id: 'prof-1',
    schoolName: 'Basisschool De Regenboog',
    municipality: 'Amsterdam',
    country: 'Netherlands',
    status: 'pending_review',
    discoveredAt: '2024-01-15T10:00:00Z',
    expiresAt: '2024-02-14T10:00:00Z',
    resources: [],
    legalObligations: [],
    reportingProcedures: [],
    confidenceScore: 0.82,
  };

  it('accepts a valid profile', () => {
    const result = JurisdictionProfileSchema.parse(validProfile);
    expect(result.schoolName).toBe('Basisschool De Regenboog');
    expect(result.discoveredAt).toBeInstanceOf(Date);
  });

  it('coerces date strings to Date objects', () => {
    const result = JurisdictionProfileSchema.parse(validProfile);
    expect(result.discoveredAt).toBeInstanceOf(Date);
    expect(result.expiresAt).toBeInstanceOf(Date);
  });

  it('rejects empty school name', () => {
    expect(() => JurisdictionProfileSchema.parse({ ...validProfile, schoolName: '' })).toThrow();
  });

  it('rejects confidence score out of bounds', () => {
    expect(() => JurisdictionProfileSchema.parse({ ...validProfile, confidenceScore: 2.0 })).toThrow();
  });
});

describe('Case schema', () => {
  const validCase = {
    id: 'case-1',
    teacherId: 'teacher-1',
    jurisdictionProfileId: 'prof-1',
    status: 'report',
    priority: 'medium',
    incidentType: 'verbal_bullying',
    description: 'Student reports repeated name-calling',
    checklist: [],
    createdAt: '2024-01-15T10:00:00Z',
    updatedAt: '2024-01-15T10:00:00Z',
  };

  it('accepts a valid case', () => {
    const result = CaseSchema.parse(validCase);
    expect(result.status).toBe('report');
  });

  it('allows optional studentId', () => {
    const result = CaseSchema.parse(validCase);
    expect(result.studentId).toBeUndefined();
  });

  it('rejects invalid status', () => {
    expect(() => CaseSchema.parse({ ...validCase, status: 'closed' })).toThrow();
  });
});

describe('API request schemas', () => {
  describe('DiscoverJurisdictionRequestSchema', () => {
    it('accepts valid school name', () => {
      const result = DiscoverJurisdictionRequestSchema.parse({ schoolName: 'De Regenboog' });
      expect(result.schoolName).toBe('De Regenboog');
    });

    it('rejects empty school name', () => {
      expect(() => DiscoverJurisdictionRequestSchema.parse({ schoolName: '' })).toThrow();
    });

    it('rejects missing school name', () => {
      expect(() => DiscoverJurisdictionRequestSchema.parse({})).toThrow();
    });
  });

  describe('ApproveProfileRequestSchema', () => {
    it('accepts valid teacher ID', () => {
      const result = ApproveProfileRequestSchema.parse({ teacherId: 'teacher-1' });
      expect(result.teacherId).toBe('teacher-1');
    });

    it('rejects empty teacher ID', () => {
      expect(() => ApproveProfileRequestSchema.parse({ teacherId: '' })).toThrow();
    });
  });

  describe('RejectProfileRequestSchema', () => {
    it('accepts valid rejection', () => {
      const result = RejectProfileRequestSchema.parse({
        teacherId: 'teacher-1',
        reason: 'Incorrect municipality detected',
      });
      expect(result.reason).toBe('Incorrect municipality detected');
    });

    it('rejects empty reason', () => {
      expect(() => RejectProfileRequestSchema.parse({ teacherId: 'teacher-1', reason: '' })).toThrow();
    });
  });

  describe('EditResourceRequestSchema', () => {
    it('accepts partial resource edits', () => {
      const result = EditResourceRequestSchema.parse({ name: 'Updated Name' });
      expect(result.name).toBe('Updated Name');
    });

    it('accepts empty object (no edits)', () => {
      const result = EditResourceRequestSchema.parse({});
      expect(result).toEqual({});
    });

    it('rejects invalid URL', () => {
      expect(() => EditResourceRequestSchema.parse({ url: 'not-a-url' })).toThrow();
    });
  });

  describe('GetResourcesQuerySchema', () => {
    it('accepts valid query', () => {
      const result = GetResourcesQuerySchema.parse({ role: 'student', jurisdictionId: 'prof-1' });
      expect(result.role).toBe('student');
    });

    it('rejects invalid role', () => {
      expect(() => GetResourcesQuerySchema.parse({ role: 'admin', jurisdictionId: 'prof-1' })).toThrow();
    });
  });

  describe('CreateCaseRequestSchema', () => {
    it('accepts valid case creation', () => {
      const result = CreateCaseRequestSchema.parse({
        teacherId: 'teacher-1',
        jurisdictionProfileId: 'prof-1',
        incidentType: 'verbal_bullying',
        description: 'Student reports name-calling',
      });
      expect(result.teacherId).toBe('teacher-1');
      expect(result.priority).toBeUndefined();
    });

    it('accepts optional priority', () => {
      const result = CreateCaseRequestSchema.parse({
        teacherId: 'teacher-1',
        jurisdictionProfileId: 'prof-1',
        incidentType: 'verbal_bullying',
        description: 'Student reports name-calling',
        priority: 'high',
      });
      expect(result.priority).toBe('high');
    });

    it('rejects missing required fields', () => {
      expect(() => CreateCaseRequestSchema.parse({ teacherId: 'teacher-1' })).toThrow();
    });
  });

  describe('UpdateCaseStageRequestSchema', () => {
    it('accepts valid stage update', () => {
      const result = UpdateCaseStageRequestSchema.parse({ stage: 'triage', teacherId: 'teacher-1' });
      expect(result.stage).toBe('triage');
    });

    it('rejects invalid stage', () => {
      expect(() => UpdateCaseStageRequestSchema.parse({ stage: 'invalid', teacherId: 'teacher-1' })).toThrow();
    });
  });
});
