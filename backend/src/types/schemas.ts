/**
 * Zod schemas for runtime validation of API request/response payloads.
 */

import { z } from 'zod';
import {
  CASE_PRIORITIES,
  CASE_STAGES,
  PROFILE_STATUSES,
  RESOURCE_CATEGORIES,
  STAKEHOLDER_ROLES,
} from './enums.js';

// ─── Enum Schemas ────────────────────────────────────────────────────────────

export const ProfileStatusSchema = z.enum(PROFILE_STATUSES);
export const StakeholderRoleSchema = z.enum(STAKEHOLDER_ROLES);
export const ResourceCategorySchema = z.enum(RESOURCE_CATEGORIES);
export const CaseStageSchema = z.enum(CASE_STAGES);
export const CasePrioritySchema = z.enum(CASE_PRIORITIES);

// ─── Model Schemas ───────────────────────────────────────────────────────────

export const ProcedureStepSchema = z.object({
  order: z.number().int().nonnegative(),
  description: z.string().min(1),
  responsible: StakeholderRoleSchema,
  deadline: z.string().optional(),
});

export const DiscoveredResourceSchema = z.object({
  id: z.string().min(1),
  profileId: z.string().min(1),
  name: z.string().min(1),
  description: z.string(),
  url: z.string().url().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  targetAudience: z.array(StakeholderRoleSchema).min(1),
  category: ResourceCategorySchema,
  source: z.string().min(1),
  confidence: z.number().min(0).max(1),
  isKnownResource: z.boolean(),
  verifiedByTeacher: z.boolean(),
});

export const LegalObligationSchema = z.object({
  id: z.string().min(1),
  profileId: z.string().min(1),
  title: z.string().min(1),
  description: z.string(),
  authority: z.string().min(1),
  deadline: z.string().optional(),
  sourceUrl: z.string().url().optional(),
  applicableLaw: z.string().optional(),
  confidence: z.number().min(0).max(1),
});

export const ReportingProcedureSchema = z.object({
  id: z.string().min(1),
  profileId: z.string().min(1),
  title: z.string().min(1),
  steps: z.array(ProcedureStepSchema).min(1),
  targetAuthority: z.string().min(1),
  requiredDocuments: z.array(z.string()).optional(),
  templateAvailable: z.boolean(),
  sourceUrl: z.string().url().optional(),
  confidence: z.number().min(0).max(1),
});

export const JurisdictionProfileSchema = z.object({
  id: z.string().min(1),
  schoolName: z.string().min(1),
  schoolAddress: z.string().optional(),
  municipality: z.string(),
  province: z.string().optional(),
  country: z.string().min(1),
  status: ProfileStatusSchema,
  discoveredAt: z.coerce.date(),
  approvedAt: z.coerce.date().optional(),
  approvedBy: z.string().optional(),
  expiresAt: z.coerce.date(),
  resources: z.array(DiscoveredResourceSchema),
  legalObligations: z.array(LegalObligationSchema),
  reportingProcedures: z.array(ReportingProcedureSchema),
  confidenceScore: z.number().min(0).max(1),
});

export const ChecklistItemSchema = z.object({
  id: z.string().min(1),
  caseId: z.string().min(1),
  text: z.string().min(1),
  done: z.boolean(),
  order: z.number().int().nonnegative(),
  jurisdictionSpecific: z.boolean(),
});

export const CaseSchema = z.object({
  id: z.string().min(1),
  teacherId: z.string().min(1),
  studentId: z.string().optional(),
  jurisdictionProfileId: z.string().min(1),
  status: CaseStageSchema,
  priority: CasePrioritySchema,
  incidentType: z.string().min(1),
  description: z.string().min(1),
  checklist: z.array(ChecklistItemSchema),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export const LegalGuidanceSchema = z.object({
  obligations: z.array(LegalObligationSchema),
  procedures: z.array(ReportingProcedureSchema),
  resources: z.array(DiscoveredResourceSchema),
  generatedAt: z.coerce.date(),
});

// ─── API Request Schemas ─────────────────────────────────────────────────────

/** POST /api/jurisdiction/discover */
export const DiscoverJurisdictionRequestSchema = z.object({
  schoolName: z.string().min(1, 'School name is required'),
});

/** POST /api/jurisdiction/:profileId/approve */
export const ApproveProfileRequestSchema = z.object({
  teacherId: z.string().min(1, 'Teacher ID is required'),
});

/** POST /api/jurisdiction/:profileId/reject */
export const RejectProfileRequestSchema = z.object({
  teacherId: z.string().min(1, 'Teacher ID is required'),
  reason: z.string().min(1, 'Rejection reason is required'),
});

/** PATCH /api/jurisdiction/:profileId/resources/:resourceId */
export const EditResourceRequestSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  url: z.string().url().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  targetAudience: z.array(StakeholderRoleSchema).min(1).optional(),
  category: ResourceCategorySchema.optional(),
});

/** GET /api/resources?role={role}&jurisdictionId={id} */
export const GetResourcesQuerySchema = z.object({
  role: StakeholderRoleSchema,
  jurisdictionId: z.string().min(1, 'Jurisdiction ID is required'),
});

/** POST /api/cases */
export const CreateCaseRequestSchema = z.object({
  teacherId: z.string().min(1, 'Teacher ID is required'),
  studentId: z.string().optional(),
  jurisdictionProfileId: z.string().min(1, 'Jurisdiction profile ID is required'),
  incidentType: z.string().min(1, 'Incident type is required'),
  description: z.string().min(1, 'Description is required'),
  priority: CasePrioritySchema.optional(),
});

/** PATCH /api/cases/:id/stage */
export const UpdateCaseStageRequestSchema = z.object({
  stage: CaseStageSchema,
  teacherId: z.string().min(1, 'Teacher ID is required'),
});

// ─── Inferred Types (for convenience) ────────────────────────────────────────

export type DiscoverJurisdictionRequest = z.infer<typeof DiscoverJurisdictionRequestSchema>;
export type ApproveProfileRequest = z.infer<typeof ApproveProfileRequestSchema>;
export type RejectProfileRequest = z.infer<typeof RejectProfileRequestSchema>;
export type EditResourceRequest = z.infer<typeof EditResourceRequestSchema>;
export type GetResourcesQuery = z.infer<typeof GetResourcesQuerySchema>;
export type CreateCaseRequest = z.infer<typeof CreateCaseRequestSchema>;
export type UpdateCaseStageRequest = z.infer<typeof UpdateCaseStageRequestSchema>;
