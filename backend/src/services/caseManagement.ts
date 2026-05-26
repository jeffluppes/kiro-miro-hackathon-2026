/**
 * Case Management Service — manages bullying case lifecycle with
 * jurisdiction-aware checklists and legal guidance.
 *
 * Implements ICaseManagementService from the design document.
 */

import type Database from 'better-sqlite3';
import type {
  Case,
  ChecklistItem,
  LegalGuidance,
  CreateCaseInput,
  LegalObligation,
  ReportingProcedure,
  DiscoveredResource,
} from '../types/index.js';
import type { CaseStage } from '../types/index.js';
import { VALID_CASE_STAGE_TRANSITIONS } from '../types/index.js';
import { getProfile } from '../db/profileRepository.js';
import {
  getResourcesByProfileId,
  getLegalObligationsByProfileId,
  getReportingProceduresByProfileId,
} from '../db/resourceRepository.js';
import {
  createCaseRow,
  getCaseRow,
  getCasesByTeacherId,
  updateCaseStatus,
  createChecklistItem,
  getChecklistItemsByCaseId,
  deleteChecklistItemsByCaseId,
  createStageHistoryEntry,
} from '../db/caseRepository.js';

// ─── Types ───────────────────────────────────────────────────────────────────

/**
 * Function signature for AI checklist generation.
 * Accepts case context and jurisdiction info, returns checklist text items.
 */
export type GenerateChecklistFn = (context: {
  incidentType: string;
  description: string;
  legalObligations: LegalObligation[];
  reportingProcedures: ReportingProcedure[];
}) => Promise<Array<{ text: string; jurisdictionSpecific: boolean }>>;

export interface ICaseManagementService {
  createCase(data: CreateCaseInput): Promise<Case>;
  updateStage(caseId: string, stage: CaseStage, teacherId: string): Promise<Case>;
  getCase(caseId: string): Promise<Case>;
  getCasesForTeacher(teacherId: string): Promise<Case[]>;
  generateChecklist(caseId: string): Promise<ChecklistItem[]>;
  getLegalGuidance(caseId: string): Promise<LegalGuidance>;
}

// ─── Default AI Checklist Generator ──────────────────────────────────────────

/**
 * Default AI checklist generation function using Anthropic API.
 * In production, this calls the Anthropic API. For tests, it can be replaced
 * with a mock function.
 */
const defaultGenerateChecklist: GenerateChecklistFn = async (context) => {
  // In production, this would call the Anthropic API
  // For now, return a basic checklist based on context
  const items: Array<{ text: string; jurisdictionSpecific: boolean }> = [
    { text: 'Document the incident details', jurisdictionSpecific: false },
    { text: 'Interview involved parties', jurisdictionSpecific: false },
    { text: 'Notify school administration', jurisdictionSpecific: false },
  ];

  // Add jurisdiction-specific items based on legal obligations
  for (const obligation of context.legalObligations) {
    items.push({
      text: `${obligation.title}${obligation.deadline ? ` (${obligation.deadline})` : ''}`,
      jurisdictionSpecific: true,
    });
  }

  // Add items based on reporting procedures
  for (const procedure of context.reportingProcedures) {
    items.push({
      text: `Follow procedure: ${procedure.title}`,
      jurisdictionSpecific: true,
    });
  }

  return items;
};

// ─── Service Implementation ──────────────────────────────────────────────────

/**
 * Creates a CaseManagementService instance.
 *
 * @param db - The SQLite database instance (dependency injection)
 * @param generateChecklistFn - Optional AI function for checklist generation (for testability)
 */
export function createCaseManagementService(
  db: Database.Database,
  generateChecklistFn: GenerateChecklistFn = defaultGenerateChecklist
): ICaseManagementService {
  /**
   * Create a new case linked to an approved jurisdiction profile.
   *
   * Validates that the jurisdictionProfileId references an approved profile,
   * creates the case with stage "report", and generates a checklist via AI.
   */
  async function createCase(data: CreateCaseInput): Promise<Case> {
    // Validate jurisdictionProfileId references an approved profile
    const profileRow = getProfile(db, data.jurisdictionProfileId);
    if (!profileRow) {
      throw new Error(
        `Jurisdiction profile not found: ${data.jurisdictionProfileId}`
      );
    }
    if (profileRow.status !== 'approved') {
      throw new Error(
        `Jurisdiction profile must be approved. Current status: ${profileRow.status}`
      );
    }

    // Create the case with stage "report"
    const caseRow = createCaseRow(db, {
      teacherId: data.teacherId,
      studentId: data.studentId,
      jurisdictionProfileId: data.jurisdictionProfileId,
      status: 'report',
      priority: data.priority ?? 'medium',
      incidentType: data.incidentType,
      description: data.description,
    });

    // Record initial stage in history
    createStageHistoryEntry(db, {
      caseId: caseRow.id,
      fromStage: null,
      toStage: 'report',
      changedBy: data.teacherId,
    });

    // Generate checklist via AI using jurisdiction context
    const obligations = getLegalObligationsByProfileId(db, data.jurisdictionProfileId);
    const procedures = getReportingProceduresByProfileId(db, data.jurisdictionProfileId);

    const checklistItems = await generateChecklistFn({
      incidentType: data.incidentType,
      description: data.description,
      legalObligations: obligations.map((o) => ({
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
      reportingProcedures: procedures.map((p) => ({
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
    });

    // Store checklist items
    for (let i = 0; i < checklistItems.length; i++) {
      const item = checklistItems[i]!;
      createChecklistItem(db, {
        caseId: caseRow.id,
        text: item.text,
        done: false,
        order: i,
        jurisdictionSpecific: item.jurisdictionSpecific,
      });
    }

    return reconstructCase(db, caseRow.id);
  }

  /**
   * Update the stage of a case.
   *
   * Validates the transition using the state machine, updates the stage,
   * and records the transition in case_stage_history.
   */
  async function updateStage(
    caseId: string,
    stage: CaseStage,
    teacherId: string
  ): Promise<Case> {
    const caseRow = getCaseRow(db, caseId);
    if (!caseRow) {
      throw new Error(`Case not found: ${caseId}`);
    }

    const currentStage = caseRow.status as CaseStage;

    // Validate transition
    const validTargets = VALID_CASE_STAGE_TRANSITIONS[currentStage];
    if (!validTargets || !validTargets.includes(stage)) {
      throw new Error(
        `Invalid stage transition: ${currentStage} → ${stage}. ` +
          `Valid transitions from '${currentStage}': [${(validTargets ?? []).join(', ')}]`
      );
    }

    // Update the case status
    updateCaseStatus(db, caseId, stage);

    // Record in case_stage_history
    createStageHistoryEntry(db, {
      caseId,
      fromStage: currentStage,
      toStage: stage,
      changedBy: teacherId,
    });

    return reconstructCase(db, caseId);
  }

  /**
   * Get a case by its ID.
   */
  async function getCase(caseId: string): Promise<Case> {
    const caseRow = getCaseRow(db, caseId);
    if (!caseRow) {
      throw new Error(`Case not found: ${caseId}`);
    }
    return reconstructCase(db, caseId);
  }

  /**
   * Get all cases for a teacher.
   */
  async function getCasesForTeacher(teacherId: string): Promise<Case[]> {
    const caseRows = getCasesByTeacherId(db, teacherId);
    return Promise.all(caseRows.map((row) => reconstructCase(db, row.id)));
  }

  /**
   * Generate a jurisdiction-aware checklist for a case.
   *
   * Calls the AI function with case context and the linked profile's
   * legal obligations and reporting procedures.
   */
  async function generateChecklist(caseId: string): Promise<ChecklistItem[]> {
    const caseRow = getCaseRow(db, caseId);
    if (!caseRow) {
      throw new Error(`Case not found: ${caseId}`);
    }

    const obligations = getLegalObligationsByProfileId(
      db,
      caseRow.jurisdiction_profile_id
    );
    const procedures = getReportingProceduresByProfileId(
      db,
      caseRow.jurisdiction_profile_id
    );

    const checklistItems = await generateChecklistFn({
      incidentType: caseRow.incident_type,
      description: caseRow.description,
      legalObligations: obligations.map((o) => ({
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
      reportingProcedures: procedures.map((p) => ({
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
    });

    // Store new checklist items (replace existing)
    deleteChecklistItemsByCaseId(db, caseId);

    const storedItems: ChecklistItem[] = [];
    for (let i = 0; i < checklistItems.length; i++) {
      const item = checklistItems[i]!;
      const row = createChecklistItem(db, {
        caseId,
        text: item.text,
        done: false,
        order: i,
        jurisdictionSpecific: item.jurisdictionSpecific,
      });
      storedItems.push({
        id: row.id,
        caseId: row.case_id,
        text: row.text,
        done: row.done === 1,
        order: row.order,
        jurisdictionSpecific: row.jurisdiction_specific === 1,
      });
    }

    return storedItems;
  }

  /**
   * Get legal guidance for a case from the linked jurisdiction profile.
   *
   * Returns the legal obligations, reporting procedures, and resources
   * from the linked profile.
   */
  async function getLegalGuidance(caseId: string): Promise<LegalGuidance> {
    const caseRow = getCaseRow(db, caseId);
    if (!caseRow) {
      throw new Error(`Case not found: ${caseId}`);
    }

    const profileId = caseRow.jurisdiction_profile_id;

    const obligationRows = getLegalObligationsByProfileId(db, profileId);
    const procedureRows = getReportingProceduresByProfileId(db, profileId);
    const resourceRows = getResourcesByProfileId(db, profileId);

    const obligations: LegalObligation[] = obligationRows.map((o) => ({
      id: o.id,
      profileId: o.profile_id,
      title: o.title,
      description: o.description,
      authority: o.authority,
      deadline: o.deadline ?? undefined,
      sourceUrl: o.source_url ?? undefined,
      applicableLaw: o.applicable_law ?? undefined,
      confidence: o.confidence,
    }));

    const procedures: ReportingProcedure[] = procedureRows.map((p) => ({
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
    }));

    const resources: DiscoveredResource[] = resourceRows.map((r) => ({
      id: r.id,
      profileId: r.profile_id,
      name: r.name,
      description: r.description,
      url: r.url ?? undefined,
      phone: r.phone ?? undefined,
      email: r.email ?? undefined,
      targetAudience: JSON.parse(r.target_audience),
      category: r.category as any,
      source: r.source,
      confidence: r.confidence,
      isKnownResource: r.is_known_resource === 1,
      verifiedByTeacher: r.verified_by_teacher === 1,
    }));

    return {
      obligations,
      procedures,
      resources,
      generatedAt: new Date(),
    };
  }

  return {
    createCase,
    updateStage,
    getCase,
    getCasesForTeacher,
    generateChecklist,
    getLegalGuidance,
  };
}

// ─── Helper Functions ────────────────────────────────────────────────────────

/**
 * Reconstruct a full Case object from the database tables.
 */
function reconstructCase(db: Database.Database, caseId: string): Case {
  const caseRow = getCaseRow(db, caseId);
  if (!caseRow) {
    throw new Error(`Case not found: ${caseId}`);
  }

  const checklistRows = getChecklistItemsByCaseId(db, caseId);

  const checklist: ChecklistItem[] = checklistRows.map((row) => ({
    id: row.id,
    caseId: row.case_id,
    text: row.text,
    done: row.done === 1,
    order: row.order,
    jurisdictionSpecific: row.jurisdiction_specific === 1,
  }));

  return {
    id: caseRow.id,
    teacherId: caseRow.teacher_id,
    studentId: caseRow.student_id ?? undefined,
    jurisdictionProfileId: caseRow.jurisdiction_profile_id,
    status: caseRow.status as CaseStage,
    priority: caseRow.priority as any,
    incidentType: caseRow.incident_type,
    description: caseRow.description,
    checklist,
    createdAt: new Date(caseRow.created_at),
    updatedAt: new Date(caseRow.updated_at),
  };
}
