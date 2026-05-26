import type Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';

/**
 * Row shape as stored in the jurisdiction_profiles table.
 */
export interface ProfileRow {
  id: string;
  school_name: string;
  school_address: string | null;
  municipality: string;
  province: string | null;
  country: string;
  status: string;
  discovered_at: string;
  approved_at: string | null;
  approved_by: string | null;
  expires_at: string;
  confidence_score: number;
  created_at: string;
  updated_at: string;
}

/**
 * Input for creating a new jurisdiction profile.
 */
export interface CreateProfileInput {
  schoolName: string;
  schoolAddress?: string;
  municipality?: string;
  province?: string;
  country?: string;
  status?: string;
  discoveredAt?: string;
  expiresAt?: string;
  confidenceScore?: number;
}

/**
 * Input for updating an existing jurisdiction profile.
 */
export interface UpdateProfileInput {
  schoolAddress?: string;
  municipality?: string;
  province?: string;
  country?: string;
  status?: string;
  approvedAt?: string;
  approvedBy?: string;
  expiresAt?: string;
  confidenceScore?: number;
}

/**
 * Create a new jurisdiction profile in the database.
 */
export function createProfile(
  db: Database.Database,
  input: CreateProfileInput
): ProfileRow {
  const id = uuidv4();
  const now = new Date().toISOString();
  const defaultExpiry = new Date(
    Date.now() + 30 * 24 * 60 * 60 * 1000
  ).toISOString();

  const stmt = db.prepare(`
    INSERT INTO jurisdiction_profiles (
      id, school_name, school_address, municipality, province, country,
      status, discovered_at, expires_at, confidence_score, created_at, updated_at
    ) VALUES (
      @id, @school_name, @school_address, @municipality, @province, @country,
      @status, @discovered_at, @expires_at, @confidence_score, @created_at, @updated_at
    )
  `);

  stmt.run({
    id,
    school_name: input.schoolName,
    school_address: input.schoolAddress ?? null,
    municipality: input.municipality ?? '',
    province: input.province ?? null,
    country: input.country ?? '',
    status: input.status ?? 'discovering',
    discovered_at: input.discoveredAt ?? now,
    expires_at: input.expiresAt ?? defaultExpiry,
    confidence_score: input.confidenceScore ?? 0,
    created_at: now,
    updated_at: now,
  });

  return getProfile(db, id)!;
}

/**
 * Get a jurisdiction profile by its ID.
 */
export function getProfile(
  db: Database.Database,
  id: string
): ProfileRow | null {
  const stmt = db.prepare('SELECT * FROM jurisdiction_profiles WHERE id = ?');
  const row = stmt.get(id) as ProfileRow | undefined;
  return row ?? null;
}

/**
 * Update an existing jurisdiction profile.
 */
export function updateProfile(
  db: Database.Database,
  id: string,
  input: UpdateProfileInput
): ProfileRow | null {
  const existing = getProfile(db, id);
  if (!existing) return null;

  const fields: string[] = [];
  const values: Record<string, unknown> = { id };

  if (input.schoolAddress !== undefined) {
    fields.push('school_address = @school_address');
    values.school_address = input.schoolAddress;
  }
  if (input.municipality !== undefined) {
    fields.push('municipality = @municipality');
    values.municipality = input.municipality;
  }
  if (input.province !== undefined) {
    fields.push('province = @province');
    values.province = input.province;
  }
  if (input.country !== undefined) {
    fields.push('country = @country');
    values.country = input.country;
  }
  if (input.status !== undefined) {
    fields.push('status = @status');
    values.status = input.status;
  }
  if (input.approvedAt !== undefined) {
    fields.push('approved_at = @approved_at');
    values.approved_at = input.approvedAt;
  }
  if (input.approvedBy !== undefined) {
    fields.push('approved_by = @approved_by');
    values.approved_by = input.approvedBy;
  }
  if (input.expiresAt !== undefined) {
    fields.push('expires_at = @expires_at');
    values.expires_at = input.expiresAt;
  }
  if (input.confidenceScore !== undefined) {
    fields.push('confidence_score = @confidence_score');
    values.confidence_score = input.confidenceScore;
  }

  if (fields.length === 0) return existing;

  fields.push("updated_at = datetime('now')");

  const sql = `UPDATE jurisdiction_profiles SET ${fields.join(', ')} WHERE id = @id`;
  db.prepare(sql).run(values);

  return getProfile(db, id);
}

/**
 * Find a jurisdiction profile by school name.
 * Returns the most recent profile for the given school name.
 */
export function getProfileBySchoolName(
  db: Database.Database,
  schoolName: string
): ProfileRow | null {
  const stmt = db.prepare(
    'SELECT * FROM jurisdiction_profiles WHERE school_name = ? ORDER BY rowid DESC LIMIT 1'
  );
  const row = stmt.get(schoolName) as ProfileRow | undefined;
  return row ?? null;
}
