/**
 * Merge logic for combining AI-discovered resources with known pre-seeded resources.
 *
 * Implements Algorithm 4 from the design document: Known Resource Seeding.
 * Ensures that all known resources for a country are always present in the
 * final resource list, while preserving all AI-discovered resources.
 */

import { v4 as uuidv4 } from 'uuid';
import type { DiscoveredResource } from '../types/index.js';
import type { KnownResource } from './knownResources.js';

/**
 * Merges AI-discovered resources with known pre-seeded resources.
 *
 * For each known resource:
 * - If the AI already discovered it (fuzzy match on name or URL), enrich the
 *   existing entry: set isKnownResource=true, boost confidence to at least 0.95,
 *   and fill in missing phone/url from the known data.
 * - If the AI did not discover it, add a new entry with confidence 0.99 and
 *   source marked as "pre-seeded (known Dutch resource)".
 *
 * AI-discovered resources are never removed.
 *
 * @param discovered - Raw AI-discovered resources from the agent loop
 * @param knownResources - Pre-seeded known resources from getKnownResourcesForCountry()
 * @returns Merged list containing all discovered + any missing known resources
 */
export function mergeWithKnownResources(
  discovered: DiscoveredResource[],
  knownResources: KnownResource[],
): DiscoveredResource[] {
  const merged = [...discovered];

  for (const known of knownResources) {
    // Check if AI already discovered this resource via fuzzy matching
    const alreadyFound = merged.find(
      (d) =>
        d.name.toLowerCase().includes(known.matchKey.toLowerCase()) ||
        (known.urlFragment !== '' &&
          d.url !== undefined &&
          d.url.includes(known.urlFragment)),
    );

    if (alreadyFound) {
      // Enrich existing entry with known data
      alreadyFound.isKnownResource = true;
      alreadyFound.confidence = Math.max(alreadyFound.confidence, 0.95);
      alreadyFound.phone = alreadyFound.phone || known.phone;
      alreadyFound.url = alreadyFound.url || known.url;
    } else {
      // Add known resource that AI missed
      merged.push({
        id: uuidv4(),
        profileId: '',
        name: known.name,
        description: known.description,
        url: known.url,
        phone: known.phone,
        email: known.email,
        targetAudience: known.targetAudience,
        category: known.category,
        source: 'pre-seeded (known Dutch resource)',
        confidence: 0.99,
        isKnownResource: true,
        verifiedByTeacher: false,
      });
    }
  }

  return merged;
}
