/**
 * Resource Routing Service — filters and routes discovered resources
 * to the appropriate stakeholder type (teacher, student, parent, coordinator).
 *
 * Implements IResourceRoutingService from the design document.
 */

import type Database from 'better-sqlite3';
import type {
  DiscoveredResource,
  RoutedResource,
  ResourceCategory,
  StakeholderRole,
} from '../types/index.js';
import { getProfile } from '../db/profileRepository.js';
import { getResourcesByProfileId } from '../db/resourceRepository.js';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface IResourceRoutingService {
  getResourcesForRole(
    role: StakeholderRole,
    jurisdictionId: string
  ): RoutedResource[];
  getResourcesByCategory(
    category: ResourceCategory,
    jurisdictionId: string
  ): RoutedResource[];
  getAllResources(jurisdictionId: string): RoutedResource[];
}

// ─── Action Labels (Dutch) ───────────────────────────────────────────────────

const ACTION_LABELS: Record<ResourceCategory, string> = {
  helpline: 'Bel nu',
  reporting_portal: 'Meld hier',
  support_organization: 'Bekijk info',
  government_body: 'Contact',
  school_internal: 'Intern contact',
  legal_aid: 'Juridisch advies',
  counseling: 'Maak afspraak',
};

// ─── Service Implementation ──────────────────────────────────────────────────

/**
 * Creates a ResourceRoutingService instance.
 *
 * @param db - The SQLite database instance (dependency injection)
 */
export function createResourceRoutingService(
  db: Database.Database
): IResourceRoutingService {
  /**
   * Get resources filtered by stakeholder role.
   *
   * Only returns resources from approved profiles where:
   * - targetAudience includes the given role
   * - verifiedByTeacher === true
   *
   * Sorted: known resources first, then by descending confidence.
   */
  function getResourcesForRole(
    role: StakeholderRole,
    jurisdictionId: string
  ): RoutedResource[] {
    const resources = getVerifiedResourcesFromApprovedProfile(jurisdictionId);
    if (resources.length === 0) return [];

    // Filter by role in targetAudience
    const matched = resources.filter((r) =>
      r.targetAudience.includes(role)
    );

    // Sort: known resources first, then by confidence desc
    const sorted = sortResources(matched);

    // Map to RoutedResource format
    return sorted.map(toRoutedResource);
  }

  /**
   * Get resources filtered by category.
   *
   * Only returns resources from approved profiles where verifiedByTeacher === true.
   */
  function getResourcesByCategory(
    category: ResourceCategory,
    jurisdictionId: string
  ): RoutedResource[] {
    const resources = getVerifiedResourcesFromApprovedProfile(jurisdictionId);
    if (resources.length === 0) return [];

    const matched = resources.filter((r) => r.category === category);
    const sorted = sortResources(matched);

    return sorted.map(toRoutedResource);
  }

  /**
   * Get all verified resources from an approved profile.
   */
  function getAllResources(jurisdictionId: string): RoutedResource[] {
    const resources = getVerifiedResourcesFromApprovedProfile(jurisdictionId);
    if (resources.length === 0) return [];

    const sorted = sortResources(resources);
    return sorted.map(toRoutedResource);
  }

  // ─── Internal Helpers ────────────────────────────────────────────────────

  /**
   * Fetch verified resources from an approved, non-stale profile.
   * Returns empty array if profile doesn't exist, isn't approved, or is stale.
   */
  function getVerifiedResourcesFromApprovedProfile(
    jurisdictionId: string
  ): DiscoveredResource[] {
    const profileRow = getProfile(db, jurisdictionId);

    // Return empty if profile doesn't exist
    if (!profileRow) return [];

    // Return empty if profile isn't approved
    if (profileRow.status !== 'approved') return [];

    // Return empty if profile is stale (expired)
    if (new Date() > new Date(profileRow.expires_at)) return [];

    // Fetch resources and convert from row format
    const resourceRows = getResourcesByProfileId(db, jurisdictionId);

    // Convert rows to DiscoveredResource and filter verified only
    const resources: DiscoveredResource[] = resourceRows
      .filter((r) => r.verified_by_teacher === 1)
      .map((r) => ({
        id: r.id,
        profileId: r.profile_id,
        name: r.name,
        description: r.description,
        url: r.url ?? undefined,
        phone: r.phone ?? undefined,
        email: r.email ?? undefined,
        targetAudience: JSON.parse(r.target_audience) as StakeholderRole[],
        category: r.category as ResourceCategory,
        source: r.source,
        confidence: r.confidence,
        isKnownResource: r.is_known_resource === 1,
        verifiedByTeacher: r.verified_by_teacher === 1,
      }));

    return resources;
  }

  return {
    getResourcesForRole,
    getResourcesByCategory,
    getAllResources,
  };
}

// ─── Pure Helper Functions ─────────────────────────────────────────────────

/**
 * Sort resources: known resources first, then by descending confidence.
 */
function sortResources(resources: DiscoveredResource[]): DiscoveredResource[] {
  return [...resources].sort((a, b) => {
    // Known resources first
    if (a.isKnownResource && !b.isKnownResource) return -1;
    if (!a.isKnownResource && b.isKnownResource) return 1;
    // Then by confidence descending
    return b.confidence - a.confidence;
  });
}

/**
 * Map a DiscoveredResource to a RoutedResource with action label and URL.
 */
function toRoutedResource(resource: DiscoveredResource): RoutedResource {
  const actionLabel = getActionLabel(resource.category);
  const actionUrl = getActionUrl(resource);

  return {
    ...resource,
    actionLabel,
    actionUrl,
  };
}

/**
 * Get the Dutch action label for a resource category.
 */
function getActionLabel(category: ResourceCategory): string {
  return ACTION_LABELS[category] ?? 'Bekijk info';
}

/**
 * Determine the action URL for a resource.
 * Prefers URL, falls back to tel: link for phone.
 */
function getActionUrl(resource: DiscoveredResource): string | undefined {
  if (resource.url) return resource.url;
  if (resource.phone) return `tel:${resource.phone}`;
  return undefined;
}
