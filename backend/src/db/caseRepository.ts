/**
 * Repository functions for cases, checklist_items, and case_stage_history tables.
 */

import type Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';

// ─── Row Types ───────────────────────────────────────────────────────────────

export interface CaseRow {
  id: string;
  teacher_id: string;
  student_id: string | null;
  jurisdiction_profile_id: string;
  status: string;
  priority: string;
  incident_type: string;
  description: string;
  created_at: string;
  updated_at: string;
}

export interface ChecklistItemRow {
  id: string;
  case_id: string;
  text: string;
  done: number; // 0 or 1
  order: number;
  jurisdiction_specific: number; // 0 or 1
  created_at: string;
}

export interface CaseStageHistoryRow {
  id: string;
  case_id: string;
  from_stage: string | null;
  to_stage: string;
  changed_by: string;
  changed_at: string;
}

// ─── Input Types ─────────────────────────────────────────────────────────────

export interface CreateCaseRowInput {
  teacherId: string;
  studentId?: string;
  jurisdictionProfileId: string;
  status?: string;
  priority?: string;
  incidentType: string;
  description: string;
}

export interface CreateChecklistItemInput {
  caseId: string;
  text: string;
  done?: boolean;
  order: number;
  jurisdictionSpecific?: boolean;
}

export interface CreateStageHistoryInput {
  caseId: string;
  fromStage: string | null;
  toStage: string;
  changedBy: string;
  changedAt?: string;
}

// ─── Cases ───────────────────────────────────────────────────────────────────

/**
 * Create a new case in the database.
 */
export function createCaseRow(
  db: Database.Database,
  input: CreateCaseRowInput
): CaseRow {
  const id = uuidv4();
  const now = new Date().toISOString();

  const stmt = db.prepare(`
    INSERT INTO cases (
      id, teacher_id, student_id, jurisdiction_profile_id,
      status, priority, incident_type, description,
      created_at, updated_at
    ) VALUES (
      @id, @teacher_id, @student_id, @jurisdiction_profile_id,
      @status, @priority, @incident_type, @description,
      @created_at, @updated_at
    )
  `);

  stmt.run({
    id,
    teacher_id: input.teacherId,
    student_id: input.studentId ?? null,
    jurisdiction_profile_id: input.jurisdictionProfileId,
    status: input.status ?? 'report',
    priority: input.priority ?? 'medium',
    incident_type: input.incidentType,
    description: input.description,
    created_at: now,
    updated_at: now,
  });

  return getCaseRow(db, id)!;
}

/**
 * Get a case by its ID.
 */
export function getCaseRow(
  db: Database.Database,
  id: string
): CaseRow | null {
  const stmt = db.prepare('SELECT * FROM cases WHERE id = ?');
  const row = stmt.get(id) as CaseRow | undefined;
  return row ?? null;
}

/**
 * Get all cases for a teacher.
 */
export function getCasesByTeacherId(
  db: Database.Database,
  teacherId: string
): CaseRow[] {
  const stmt = db.prepare(
    'SELECT * FROM cases WHERE teacher_id = ? ORDER BY created_at DESC'
  );
  return stmt.all(teacherId) as CaseRow[];
}

/**
 * Update the status (stage) of a case.
 */
export function updateCaseStatus(
  db: Database.Database,
  id: string,
  status: string
): CaseRow | null {
  const existing = getCaseRow(db, id);
  if (!existing) return null;

  const now = new Date().toISOString();
  db.prepare(
    'UPDATE cases SET status = @status, updated_at = @updated_at WHERE id = @id'
  ).run({ id, status, updated_at: now });

  return getCaseRow(db, id);
}

// ─── Checklist Items ─────────────────────────────────────────────────────────

/**
 * Create a checklist item for a case.
 */
export function createChecklistItem(
  db: Database.Database,
  input: CreateChecklistItemInput
): ChecklistItemRow {
  const id = uuidv4();

  const stmt = db.prepare(`
    INSERT INTO checklist_items (
      id, case_id, text, done, "order", jurisdiction_specific
    ) VALUES (
      @id, @case_id, @text, @done, @order, @jurisdiction_specific
    )
  `);

  stmt.run({
    id,
    case_id: input.caseId,
    text: input.text,
    done: input.done ? 1 : 0,
    order: input.order,
    jurisdiction_specific: input.jurisdictionSpecific ? 1 : 0,
  });

  return getChecklistItem(db, id)!;
}

/**
 * Get a checklist item by ID.
 */
export function getChecklistItem(
  db: Database.Database,
  id: string
): ChecklistItemRow | null {
  const stmt = db.prepare('SELECT * FROM checklist_items WHERE id = ?');
  const row = stmt.get(id) as ChecklistItemRow | undefined;
  return row ?? null;
}

/**
 * Get all checklist items for a case, ordered by their order field.
 */
export function getChecklistItemsByCaseId(
  db: Database.Database,
  caseId: string
): ChecklistItemRow[] {
  const stmt = db.prepare(
    'SELECT * FROM checklist_items WHERE case_id = ? ORDER BY "order" ASC'
  );
  return stmt.all(caseId) as ChecklistItemRow[];
}

/**
 * Delete all checklist items for a case.
 */
export function deleteChecklistItemsByCaseId(
  db: Database.Database,
  caseId: string
): void {
  db.prepare('DELETE FROM checklist_items WHERE case_id = ?').run(caseId);
}

// ─── Case Stage History ──────────────────────────────────────────────────────

/**
 * Record a stage transition in the case_stage_history table.
 */
export function createStageHistoryEntry(
  db: Database.Database,
  input: CreateStageHistoryInput
): CaseStageHistoryRow {
  const id = uuidv4();
  const changedAt = input.changedAt ?? new Date().toISOString();

  const stmt = db.prepare(`
    INSERT INTO case_stage_history (
      id, case_id, from_stage, to_stage, changed_by, changed_at
    ) VALUES (
      @id, @case_id, @from_stage, @to_stage, @changed_by, @changed_at
    )
  `);

  stmt.run({
    id,
    case_id: input.caseId,
    from_stage: input.fromStage,
    to_stage: input.toStage,
    changed_by: input.changedBy,
    changed_at: changedAt,
  });

  return getStageHistoryEntry(db, id)!;
}

/**
 * Get a stage history entry by ID.
 */
export function getStageHistoryEntry(
  db: Database.Database,
  id: string
): CaseStageHistoryRow | null {
  const stmt = db.prepare('SELECT * FROM case_stage_history WHERE id = ?');
  const row = stmt.get(id) as CaseStageHistoryRow | undefined;
  return row ?? null;
}

/**
 * Get all stage history entries for a case, ordered by changed_at.
 */
export function getStageHistoryByCaseId(
  db: Database.Database,
  caseId: string
): CaseStageHistoryRow[] {
  const stmt = db.prepare(
    'SELECT * FROM case_stage_history WHERE case_id = ? ORDER BY changed_at ASC'
  );
  return stmt.all(caseId) as CaseStageHistoryRow[];
}
