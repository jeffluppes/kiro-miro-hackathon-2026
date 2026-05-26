/**
 * Repository functions for discovered_resources, legal_obligations,
 * and reporting_procedures tables.
 */

import type Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';

// ─── Row Types ───────────────────────────────────────────────────────────────

export interface ResourceRow {
  id: string;
  profile_id: string;
  name: string;
  description: string;
  url: string | null;
  phone: string | null;
  email: string | null;
  target_audience: string; // JSON array
  category: string;
  source: string;
  confidence: number;
  is_known_resource: number; // 0 or 1
  verified_by_teacher: number; // 0 or 1
  created_at: string;
}

export interface LegalObligationRow {
  id: string;
  profile_id: string;
  title: string;
  description: string;
  authority: string;
  deadline: string | null;
  source_url: string | null;
  applicable_law: string | null;
  confidence: number;
  created_at: string;
}

export interface ReportingProcedureRow {
  id: string;
  profile_id: string;
  title: string;
  steps: string; // JSON array
  target_authority: string;
  required_documents: string | null; // JSON array or null
  template_available: number; // 0 or 1
  source_url: string | null;
  confidence: number;
  created_at: string;
}

// ─── Input Types ─────────────────────────────────────────────────────────────

export interface CreateResourceInput {
  profileId: string;
  name: string;
  description?: string;
  url?: string;
  phone?: string;
  email?: string;
  targetAudience?: string[];
  category: string;
  source?: string;
  confidence?: number;
  isKnownResource?: boolean;
  verifiedByTeacher?: boolean;
}

export interface CreateLegalObligationInput {
  profileId: string;
  title: string;
  description?: string;
  authority?: string;
  deadline?: string;
  sourceUrl?: string;
  applicableLaw?: string;
  confidence?: number;
}

export interface CreateReportingProcedureInput {
  profileId: string;
  title: string;
  steps?: string[];
  targetAuthority?: string;
  requiredDocuments?: string[];
  templateAvailable?: boolean;
  sourceUrl?: string;
  confidence?: number;
}

// ─── Discovered Resources ────────────────────────────────────────────────────

/**
 * Create a discovered resource in the database.
 */
export function createResource(
  db: Database.Database,
  input: CreateResourceInput
): ResourceRow {
  const id = uuidv4();

  const stmt = db.prepare(`
    INSERT INTO discovered_resources (
      id, profile_id, name, description, url, phone, email,
      target_audience, category, source, confidence,
      is_known_resource, verified_by_teacher
    ) VALUES (
      @id, @profile_id, @name, @description, @url, @phone, @email,
      @target_audience, @category, @source, @confidence,
      @is_known_resource, @verified_by_teacher
    )
  `);

  stmt.run({
    id,
    profile_id: input.profileId,
    name: input.name,
    description: input.description ?? '',
    url: input.url ?? null,
    phone: input.phone ?? null,
    email: input.email ?? null,
    target_audience: JSON.stringify(input.targetAudience ?? []),
    category: input.category,
    source: input.source ?? '',
    confidence: input.confidence ?? 0,
    is_known_resource: input.isKnownResource ? 1 : 0,
    verified_by_teacher: input.verifiedByTeacher ? 1 : 0,
  });

  return getResource(db, id)!;
}

/**
 * Get a discovered resource by ID.
 */
export function getResource(
  db: Database.Database,
  id: string
): ResourceRow | null {
  const stmt = db.prepare('SELECT * FROM discovered_resources WHERE id = ?');
  const row = stmt.get(id) as ResourceRow | undefined;
  return row ?? null;
}

/**
 * Get all discovered resources for a profile.
 */
export function getResourcesByProfileId(
  db: Database.Database,
  profileId: string
): ResourceRow[] {
  const stmt = db.prepare(
    'SELECT * FROM discovered_resources WHERE profile_id = ?'
  );
  return stmt.all(profileId) as ResourceRow[];
}

/**
 * Mark all resources for a profile as verified by teacher.
 */
export function markAllResourcesVerified(
  db: Database.Database,
  profileId: string
): void {
  const stmt = db.prepare(
    'UPDATE discovered_resources SET verified_by_teacher = 1 WHERE profile_id = ?'
  );
  stmt.run(profileId);
}

/**
 * Update a discovered resource by ID.
 */
export function updateResource(
  db: Database.Database,
  id: string,
  input: Partial<CreateResourceInput>
): ResourceRow | null {
  const existing = getResource(db, id);
  if (!existing) return null;

  const fields: string[] = [];
  const values: Record<string, unknown> = { id };

  if (input.name !== undefined) {
    fields.push('name = @name');
    values.name = input.name;
  }
  if (input.description !== undefined) {
    fields.push('description = @description');
    values.description = input.description;
  }
  if (input.url !== undefined) {
    fields.push('url = @url');
    values.url = input.url ?? null;
  }
  if (input.phone !== undefined) {
    fields.push('phone = @phone');
    values.phone = input.phone ?? null;
  }
  if (input.email !== undefined) {
    fields.push('email = @email');
    values.email = input.email ?? null;
  }
  if (input.targetAudience !== undefined) {
    fields.push('target_audience = @target_audience');
    values.target_audience = JSON.stringify(input.targetAudience);
  }
  if (input.category !== undefined) {
    fields.push('category = @category');
    values.category = input.category;
  }

  if (fields.length === 0) return existing;

  const sql = `UPDATE discovered_resources SET ${fields.join(', ')} WHERE id = @id`;
  db.prepare(sql).run(values);

  return getResource(db, id);
}

/**
 * Delete all resources for a profile.
 */
export function deleteResourcesByProfileId(
  db: Database.Database,
  profileId: string
): void {
  const stmt = db.prepare(
    'DELETE FROM discovered_resources WHERE profile_id = ?'
  );
  stmt.run(profileId);
}

// ─── Legal Obligations ───────────────────────────────────────────────────────

/**
 * Create a legal obligation in the database.
 */
export function createLegalObligation(
  db: Database.Database,
  input: CreateLegalObligationInput
): LegalObligationRow {
  const id = uuidv4();

  const stmt = db.prepare(`
    INSERT INTO legal_obligations (
      id, profile_id, title, description, authority,
      deadline, source_url, applicable_law, confidence
    ) VALUES (
      @id, @profile_id, @title, @description, @authority,
      @deadline, @source_url, @applicable_law, @confidence
    )
  `);

  stmt.run({
    id,
    profile_id: input.profileId,
    title: input.title,
    description: input.description ?? '',
    authority: input.authority ?? '',
    deadline: input.deadline ?? null,
    source_url: input.sourceUrl ?? null,
    applicable_law: input.applicableLaw ?? null,
    confidence: input.confidence ?? 0,
  });

  return getLegalObligation(db, id)!;
}

/**
 * Get a legal obligation by ID.
 */
export function getLegalObligation(
  db: Database.Database,
  id: string
): LegalObligationRow | null {
  const stmt = db.prepare('SELECT * FROM legal_obligations WHERE id = ?');
  const row = stmt.get(id) as LegalObligationRow | undefined;
  return row ?? null;
}

/**
 * Get all legal obligations for a profile.
 */
export function getLegalObligationsByProfileId(
  db: Database.Database,
  profileId: string
): LegalObligationRow[] {
  const stmt = db.prepare(
    'SELECT * FROM legal_obligations WHERE profile_id = ?'
  );
  return stmt.all(profileId) as LegalObligationRow[];
}

/**
 * Delete all legal obligations for a profile.
 */
export function deleteLegalObligationsByProfileId(
  db: Database.Database,
  profileId: string
): void {
  const stmt = db.prepare(
    'DELETE FROM legal_obligations WHERE profile_id = ?'
  );
  stmt.run(profileId);
}

// ─── Reporting Procedures ────────────────────────────────────────────────────

/**
 * Create a reporting procedure in the database.
 */
export function createReportingProcedure(
  db: Database.Database,
  input: CreateReportingProcedureInput
): ReportingProcedureRow {
  const id = uuidv4();

  const stmt = db.prepare(`
    INSERT INTO reporting_procedures (
      id, profile_id, title, steps, target_authority,
      required_documents, template_available, source_url, confidence
    ) VALUES (
      @id, @profile_id, @title, @steps, @target_authority,
      @required_documents, @template_available, @source_url, @confidence
    )
  `);

  stmt.run({
    id,
    profile_id: input.profileId,
    title: input.title,
    steps: JSON.stringify(input.steps ?? []),
    target_authority: input.targetAuthority ?? '',
    required_documents: input.requiredDocuments
      ? JSON.stringify(input.requiredDocuments)
      : null,
    template_available: input.templateAvailable ? 1 : 0,
    source_url: input.sourceUrl ?? null,
    confidence: input.confidence ?? 0,
  });

  return getReportingProcedure(db, id)!;
}

/**
 * Get a reporting procedure by ID.
 */
export function getReportingProcedure(
  db: Database.Database,
  id: string
): ReportingProcedureRow | null {
  const stmt = db.prepare('SELECT * FROM reporting_procedures WHERE id = ?');
  const row = stmt.get(id) as ReportingProcedureRow | undefined;
  return row ?? null;
}

/**
 * Get all reporting procedures for a profile.
 */
export function getReportingProceduresByProfileId(
  db: Database.Database,
  profileId: string
): ReportingProcedureRow[] {
  const stmt = db.prepare(
    'SELECT * FROM reporting_procedures WHERE profile_id = ?'
  );
  return stmt.all(profileId) as ReportingProcedureRow[];
}

/**
 * Delete all reporting procedures for a profile.
 */
export function deleteReportingProceduresByProfileId(
  db: Database.Database,
  profileId: string
): void {
  const stmt = db.prepare(
    'DELETE FROM reporting_procedures WHERE profile_id = ?'
  );
  stmt.run(profileId);
}
