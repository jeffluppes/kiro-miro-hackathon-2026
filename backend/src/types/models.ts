/**
 * Shared data model interfaces for SchoolGuard MVP.
 */

import type {
  CasePriority,
  CaseStage,
  ProfileStatus,
  ResourceCategory,
  StakeholderRole,
} from './enums.js';

/** A cached collection of jurisdiction-specific anti-bullying resources. */
export interface JurisdictionProfile {
  id: string;
  schoolName: string;
  schoolAddress?: string;
  municipality: string;
  province?: string;
  country: string;
  status: ProfileStatus;
  discoveredAt: Date;
  approvedAt?: Date;
  approvedBy?: string;
  expiresAt: Date;
  resources: DiscoveredResource[];
  legalObligations: LegalObligation[];
  reportingProcedures: ReportingProcedure[];
  confidenceScore: number;
}

/** A resource discovered by the AI agent or pre-seeded. */
export interface DiscoveredResource {
  id: string;
  profileId: string;
  name: string;
  description: string;
  url?: string;
  phone?: string;
  email?: string;
  targetAudience: StakeholderRole[];
  category: ResourceCategory;
  source: string;
  confidence: number;
  isKnownResource: boolean;
  verifiedByTeacher: boolean;
}

/** A legal obligation applicable to the school's jurisdiction. */
export interface LegalObligation {
  id: string;
  profileId: string;
  title: string;
  description: string;
  authority: string;
  deadline?: string;
  sourceUrl?: string;
  applicableLaw?: string;
  confidence: number;
}

/** A reporting procedure with ordered steps. */
export interface ReportingProcedure {
  id: string;
  profileId: string;
  title: string;
  steps: ProcedureStep[];
  targetAuthority: string;
  requiredDocuments?: string[];
  templateAvailable: boolean;
  sourceUrl?: string;
  confidence: number;
}

/** A single step within a reporting procedure. */
export interface ProcedureStep {
  order: number;
  description: string;
  responsible: StakeholderRole;
  deadline?: string;
}

/** A bullying case linked to a jurisdiction profile. */
export interface Case {
  id: string;
  teacherId: string;
  studentId?: string;
  jurisdictionProfileId: string;
  status: CaseStage;
  priority: CasePriority;
  incidentType: string;
  description: string;
  checklist: ChecklistItem[];
  createdAt: Date;
  updatedAt: Date;
}

/** A checklist item within a case. */
export interface ChecklistItem {
  id: string;
  caseId: string;
  text: string;
  done: boolean;
  order: number;
  jurisdictionSpecific: boolean;
}

/** Legal guidance aggregated from a jurisdiction profile for a case. */
export interface LegalGuidance {
  obligations: LegalObligation[];
  procedures: ReportingProcedure[];
  resources: DiscoveredResource[];
  generatedAt: Date;
}

/** A resource enriched with routing context for display. */
export interface RoutedResource extends DiscoveredResource {
  actionLabel: string;
  actionUrl?: string;
  contextNote?: string;
}

/** Input data for creating a new case. */
export interface CreateCaseInput {
  teacherId: string;
  studentId?: string;
  jurisdictionProfileId: string;
  incidentType: string;
  description: string;
  priority?: CasePriority;
}

/** Result of escalating a case to authorities. */
export interface EscalationResult {
  success: boolean;
  reportId?: string;
  submittedTo: string;
  submittedAt: Date;
  notes?: string;
}

/** Audit log entry for case stage transitions. */
export interface CaseStageHistoryEntry {
  id: string;
  caseId: string;
  previousStage: CaseStage;
  newStage: CaseStage;
  changedBy: string;
  changedAt: Date;
}
