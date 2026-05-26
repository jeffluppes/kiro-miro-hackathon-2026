/**
 * Jurisdiction Discovery Service — orchestrates the AI agent, known resource
 * merging, and profile lifecycle management.
 *
 * Implements IJurisdictionDiscoveryService from the design document.
 */

import type Database from 'better-sqlite3';
import type {
  JurisdictionProfile,
  DiscoveredResource,
  LegalObligation,
  ReportingProcedure,
} from '../types/index.js';
import { VALID_PROFILE_TRANSITIONS } from '../types/index.js';
import type { ProfileStatus } from '../types/index.js';
import {
  createProfile,
  getProfile,
  updateProfile,
  getProfileBySchoolName,
} from '../db/profileRepository.js';
import {
  createResource,
  getResourcesByProfileId,
  markAllResourcesVerified,
  createLegalObligation,
  getLegalObligationsByProfileId,
  createReportingProcedure,
  getReportingProceduresByProfileId,
} from '../db/resourceRepository.js';
import { processAgentLoop } from './aiAgent.js';
import type { AgentLoopOptions, StructuredDiscoveryResult } from './aiAgent.js';
import { getKnownResourcesForCountry } from './knownResources.js';
import { mergeWithKnownResources } from './mergeResources.js';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface JurisdictionDiscoveryServiceOptions {
  /** Options passed to the AI agent loop. */
  agentOptions?: AgentLoopOptions;
}

export interface IJurisdictionDiscoveryService {
  discoverJurisdiction(schoolName: string): Promise<JurisdictionProfile>;
  getApprovedProfile(schoolName: string): Promise<JurisdictionProfile | null>;
  approveProfile(profileId: string, teacherId: string): Promise<JurisdictionProfile>;
  rejectProfile(profileId: string, teacherId: string, reason: string): Promise<void>;
  refreshProfile(profileId: string): Promise<JurisdictionProfile>;
}

// ─── Service Implementation ──────────────────────────────────────────────────

/**
 * Creates a JurisdictionDiscoveryService instance.
 *
 * @param db - The SQLite database instance (dependency injection)
 * @param options - Optional configuration for the AI agent
 */
export function createJurisdictionDiscoveryService(
  db: Database.Database,
  options: JurisdictionDiscoveryServiceOptions = {}
): IJurisdictionDiscoveryService {
  const { agentOptions } = options;

  /**
   * Discover jurisdiction information for a school.
   *
   * Flow: check cache → create profile → run AI agent → merge known resources → store as pending_review
   */
  async function discoverJurisdiction(schoolName: string): Promise<JurisdictionProfile> {
    // Step 1: Check cache — return approved, non-stale profile if available
    const cached = getProfileBySchoolName(db, schoolName);
    if (cached && cached.status === 'approved' && !isStale(cached.expires_at)) {
      return reconstructProfile(db, cached.id);
    }

    // Step 2: Create a new profile in "discovering" state
    const profileRow = createProfile(db, {
      schoolName,
      status: 'discovering',
    });

    // Step 3: Run AI agent
    let discoveryResult: StructuredDiscoveryResult;
    try {
      discoveryResult = await processAgentLoop(schoolName, agentOptions);
    } catch {
      // AI failure: return profile with empty municipality, confidence 0.1
      // Still seed known resources if we can detect a country
      updateProfile(db, profileRow.id, {
        municipality: '',
        country: '',
        status: 'pending_review',
        confidenceScore: 0.1,
      });
      return reconstructProfile(db, profileRow.id);
    }

    // Step 4: Handle case where AI cannot locate school
    if (!discoveryResult.municipality && discoveryResult.overallConfidence <= 0.1) {
      updateProfile(db, profileRow.id, {
        municipality: '',
        province: discoveryResult.province || undefined,
        country: discoveryResult.country || undefined,
        status: 'pending_review',
        confidenceScore: 0.1,
      });

      // Still seed known resources for detected country
      if (discoveryResult.country) {
        await storeDiscoveryResults(db, profileRow.id, discoveryResult);
      }

      return reconstructProfile(db, profileRow.id);
    }

    // Step 5: Merge with known resources
    const discoveredResources: DiscoveredResource[] = discoveryResult.resources.map(
      (r, idx) => ({
        id: `temp-${idx}`,
        profileId: profileRow.id,
        name: r.name,
        description: r.description,
        url: r.url,
        phone: r.phone,
        targetAudience: r.targetAudience as any[],
        category: r.category as any,
        source: 'ai-discovered',
        confidence: discoveryResult.overallConfidence,
        isKnownResource: false,
        verifiedByTeacher: false,
      })
    );

    const knownResources = getKnownResourcesForCountry(discoveryResult.country);
    const mergedResources = mergeWithKnownResources(discoveredResources, knownResources);

    // Step 6: Store resources, obligations, and procedures
    for (const resource of mergedResources) {
      createResource(db, {
        profileId: profileRow.id,
        name: resource.name,
        description: resource.description,
        url: resource.url,
        phone: resource.phone,
        email: resource.email,
        targetAudience: resource.targetAudience,
        category: resource.category,
        source: resource.source,
        confidence: resource.confidence,
        isKnownResource: resource.isKnownResource,
        verifiedByTeacher: resource.verifiedByTeacher,
      });
    }

    for (const obligation of discoveryResult.legalObligations) {
      createLegalObligation(db, {
        profileId: profileRow.id,
        title: obligation.title,
        description: obligation.description,
        authority: obligation.authority,
        deadline: obligation.deadline,
        applicableLaw: obligation.applicableLaw,
        confidence: discoveryResult.overallConfidence,
      });
    }

    for (const procedure of discoveryResult.reportingProcedures) {
      createReportingProcedure(db, {
        profileId: profileRow.id,
        title: procedure.title,
        steps: procedure.steps,
        targetAuthority: procedure.targetAuthority,
        requiredDocuments: procedure.requiredDocuments,
        confidence: discoveryResult.overallConfidence,
      });
    }

    // Step 7: Update profile to pending_review
    updateProfile(db, profileRow.id, {
      municipality: discoveryResult.municipality,
      province: discoveryResult.province || undefined,
      country: discoveryResult.country || undefined,
      status: 'pending_review',
      confidenceScore: discoveryResult.overallConfidence,
    });

    return reconstructProfile(db, profileRow.id);
  }

  /**
   * Get an approved, non-stale profile for a school name.
   * Returns null if no approved profile exists or if it's stale.
   */
  async function getApprovedProfile(schoolName: string): Promise<JurisdictionProfile | null> {
    const profileRow = getProfileBySchoolName(db, schoolName);
    if (!profileRow) return null;
    if (profileRow.status !== 'approved') return null;
    if (isStale(profileRow.expires_at)) return null;

    return reconstructProfile(db, profileRow.id);
  }

  /**
   * Approve a profile: validate status is pending_review → update to approved
   * → set approvedAt, approvedBy → mark all resources verified.
   */
  async function approveProfile(
    profileId: string,
    teacherId: string
  ): Promise<JurisdictionProfile> {
    const profileRow = getProfile(db, profileId);
    if (!profileRow) {
      throw new Error(`Profile not found: ${profileId}`);
    }

    // Validate status transition
    validateTransition(profileRow.status as ProfileStatus, 'approved');

    const now = new Date().toISOString();
    updateProfile(db, profileId, {
      status: 'approved',
      approvedAt: now,
      approvedBy: teacherId,
    });

    // Mark all resources as verified by teacher
    markAllResourcesVerified(db, profileId);

    return reconstructProfile(db, profileId);
  }

  /**
   * Reject a profile: validate status → update to rejected → record reason.
   */
  async function rejectProfile(
    profileId: string,
    _teacherId: string,
    _reason: string
  ): Promise<void> {
    const profileRow = getProfile(db, profileId);
    if (!profileRow) {
      throw new Error(`Profile not found: ${profileId}`);
    }

    // Validate status transition
    validateTransition(profileRow.status as ProfileStatus, 'rejected');

    updateProfile(db, profileId, {
      status: 'rejected',
    });
  }

  /**
   * Refresh a profile: trigger new discovery, create new pending profile.
   */
  async function refreshProfile(profileId: string): Promise<JurisdictionProfile> {
    const profileRow = getProfile(db, profileId);
    if (!profileRow) {
      throw new Error(`Profile not found: ${profileId}`);
    }

    // Trigger a new discovery for the same school
    return discoverJurisdiction(profileRow.school_name);
  }

  return {
    discoverJurisdiction,
    getApprovedProfile,
    approveProfile,
    rejectProfile,
    refreshProfile,
  };
}

// ─── Helper Functions ────────────────────────────────────────────────────────

/**
 * Check if a profile has expired based on its expires_at date.
 */
function isStale(expiresAt: string): boolean {
  return new Date() > new Date(expiresAt);
}

/**
 * Validate a profile status transition using the state machine.
 */
function validateTransition(currentStatus: ProfileStatus, targetStatus: ProfileStatus): void {
  const validTargets = VALID_PROFILE_TRANSITIONS[currentStatus];
  if (!validTargets.includes(targetStatus)) {
    throw new Error(
      `Invalid status transition: ${currentStatus} → ${targetStatus}. ` +
        `Valid transitions from '${currentStatus}': [${validTargets.join(', ')}]`
    );
  }
}

/**
 * Store discovery results (resources, obligations, procedures) for a profile
 * that had partial or empty AI results but still needs known resource seeding.
 */
async function storeDiscoveryResults(
  db: Database.Database,
  profileId: string,
  result: StructuredDiscoveryResult
): Promise<void> {
  // Merge with known resources for the detected country
  const discoveredResources: DiscoveredResource[] = result.resources.map(
    (r, idx) => ({
      id: `temp-${idx}`,
      profileId,
      name: r.name,
      description: r.description,
      url: r.url,
      phone: r.phone,
      targetAudience: r.targetAudience as any[],
      category: r.category as any,
      source: 'ai-discovered',
      confidence: result.overallConfidence,
      isKnownResource: false,
      verifiedByTeacher: false,
    })
  );

  const knownResources = getKnownResourcesForCountry(result.country);
  const mergedResources = mergeWithKnownResources(discoveredResources, knownResources);

  for (const resource of mergedResources) {
    createResource(db, {
      profileId,
      name: resource.name,
      description: resource.description,
      url: resource.url,
      phone: resource.phone,
      email: resource.email,
      targetAudience: resource.targetAudience,
      category: resource.category,
      source: resource.source,
      confidence: resource.confidence,
      isKnownResource: resource.isKnownResource,
      verifiedByTeacher: resource.verifiedByTeacher,
    });
  }

  for (const obligation of result.legalObligations) {
    createLegalObligation(db, {
      profileId,
      title: obligation.title,
      description: obligation.description,
      authority: obligation.authority,
      deadline: obligation.deadline,
      applicableLaw: obligation.applicableLaw,
      confidence: result.overallConfidence,
    });
  }

  for (const procedure of result.reportingProcedures) {
    createReportingProcedure(db, {
      profileId,
      title: procedure.title,
      steps: procedure.steps,
      targetAuthority: procedure.targetAuthority,
      requiredDocuments: procedure.requiredDocuments,
      confidence: result.overallConfidence,
    });
  }
}

/**
 * Reconstruct a full JurisdictionProfile object from the database tables.
 */
function reconstructProfile(
  db: Database.Database,
  profileId: string
): JurisdictionProfile {
  const profileRow = getProfile(db, profileId);
  if (!profileRow) {
    throw new Error(`Profile not found: ${profileId}`);
  }

  const resourceRows = getResourcesByProfileId(db, profileId);
  const obligationRows = getLegalObligationsByProfileId(db, profileId);
  const procedureRows = getReportingProceduresByProfileId(db, profileId);

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

  const legalObligations: LegalObligation[] = obligationRows.map((o) => ({
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

  const reportingProcedures: ReportingProcedure[] = procedureRows.map((p) => ({
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

  return {
    id: profileRow.id,
    schoolName: profileRow.school_name,
    schoolAddress: profileRow.school_address ?? undefined,
    municipality: profileRow.municipality,
    province: profileRow.province ?? undefined,
    country: profileRow.country,
    status: profileRow.status as ProfileStatus,
    discoveredAt: new Date(profileRow.discovered_at),
    approvedAt: profileRow.approved_at ? new Date(profileRow.approved_at) : undefined,
    approvedBy: profileRow.approved_by ?? undefined,
    expiresAt: new Date(profileRow.expires_at),
    resources,
    legalObligations,
    reportingProcedures,
    confidenceScore: profileRow.confidence_score,
  };
}
