/**
 * Shared enums and union types for SchoolGuard MVP.
 */

/** Status of a JurisdictionProfile through its lifecycle. */
export type ProfileStatus =
  | 'discovering'
  | 'pending_review'
  | 'approved'
  | 'rejected'
  | 'stale';

/** Valid transitions for ProfileStatus state machine. */
export const VALID_PROFILE_TRANSITIONS: Record<ProfileStatus, ProfileStatus[]> = {
  discovering: ['pending_review'],
  pending_review: ['approved', 'rejected'],
  approved: ['stale'],
  rejected: [],
  stale: [],
};

/** Stakeholder roles in the anti-bullying ecosystem. */
export type StakeholderRole = 'student' | 'parent' | 'teacher' | 'coordinator';

/** Categories of discovered anti-bullying resources. */
export type ResourceCategory =
  | 'helpline'
  | 'reporting_portal'
  | 'support_organization'
  | 'government_body'
  | 'school_internal'
  | 'legal_aid'
  | 'counseling';

/** Lifecycle stages of a bullying case. */
export type CaseStage = 'report' | 'triage' | 'review' | 'action' | 'resolve';

/** Priority levels for bullying cases. */
export type CasePriority = 'critical' | 'high' | 'medium' | 'low';

/** All valid ProfileStatus values as an array (useful for Zod enums). */
export const PROFILE_STATUSES: [ProfileStatus, ...ProfileStatus[]] = [
  'discovering',
  'pending_review',
  'approved',
  'rejected',
  'stale',
];

/** All valid StakeholderRole values as an array. */
export const STAKEHOLDER_ROLES: [StakeholderRole, ...StakeholderRole[]] = [
  'student',
  'parent',
  'teacher',
  'coordinator',
];

/** All valid ResourceCategory values as an array. */
export const RESOURCE_CATEGORIES: [ResourceCategory, ...ResourceCategory[]] = [
  'helpline',
  'reporting_portal',
  'support_organization',
  'government_body',
  'school_internal',
  'legal_aid',
  'counseling',
];

/** All valid CaseStage values as an array. */
export const CASE_STAGES: [CaseStage, ...CaseStage[]] = [
  'report',
  'triage',
  'review',
  'action',
  'resolve',
];

/** Valid transitions for CaseStage state machine. */
export const VALID_CASE_STAGE_TRANSITIONS: Record<CaseStage, CaseStage[]> = {
  report: ['triage'],
  triage: ['review'],
  review: ['action'],
  action: ['resolve'],
  resolve: [],
};

/** All valid CasePriority values as an array. */
export const CASE_PRIORITIES: [CasePriority, ...CasePriority[]] = [
  'critical',
  'high',
  'medium',
  'low',
];
