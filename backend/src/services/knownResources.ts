/**
 * Pre-seeded known anti-bullying resources by country.
 *
 * These resources are always included in JurisdictionProfiles for their
 * respective countries, regardless of whether the AI agent discovers them.
 * They serve as a reliable baseline for teachers.
 *
 * Each resource includes a `matchKey` and `urlFragment` used by the merge
 * algorithm (Algorithm 4) to detect duplicates when the AI independently
 * discovers the same resource.
 */

import type { ResourceCategory, StakeholderRole } from '../types/index.js';

/** A known pre-seeded resource with deduplication keys. */
export interface KnownResource {
  name: string;
  description: string;
  url?: string;
  phone?: string;
  email?: string;
  targetAudience: StakeholderRole[];
  category: ResourceCategory;
  confidence: number;
  /** Key used for fuzzy name matching during merge. */
  matchKey: string;
  /** URL fragment used for URL-based deduplication during merge. */
  urlFragment: string;
}

/** Pre-seeded Dutch anti-bullying resources. */
const DUTCH_KNOWN_RESOURCES: KnownResource[] = [
  {
    name: 'Kindertelefoon',
    description:
      'Gratis en anonieme hulplijn voor kinderen en jongeren tot 18 jaar. Bereikbaar via telefoon, chat en online forum voor vragen over pesten, thuis, school en meer.',
    url: 'https://www.kindertelefoon.nl',
    phone: '0800-0432',
    targetAudience: ['student'],
    category: 'helpline',
    confidence: 0.99,
    matchKey: 'kindertelefoon',
    urlFragment: 'kindertelefoon.nl',
  },
  {
    name: 'Meldknop.nl',
    description:
      'Online meldpunt waar kinderen en ouders pesten, cyberpesten en andere onveilige situaties kunnen melden. Biedt ook informatie en advies.',
    url: 'https://www.meldknop.nl',
    targetAudience: ['student', 'parent'],
    category: 'reporting_portal',
    confidence: 0.99,
    matchKey: 'meldknop',
    urlFragment: 'meldknop.nl',
  },
  {
    name: 'Stichting School & Veiligheid',
    description:
      'Landelijk expertisecentrum dat scholen ondersteunt bij het creëren van een sociaal veilig klimaat. Biedt trainingen, tools en advies voor onderwijsprofessionals.',
    url: 'https://www.schoolenveiligheid.nl',
    targetAudience: ['teacher'],
    category: 'support_organization',
    confidence: 0.99,
    matchKey: 'school & veiligheid',
    urlFragment: 'schoolenveiligheid.nl',
  },
  {
    name: 'Stop Pesten NU Teacher Portal',
    description:
      'Informatie en hulpmiddelen voor leerkrachten om pesten in de klas aan te pakken. Biedt lesmaterialen, protocollen en praktische tips.',
    url: 'https://www.stoppestennu.nl/leerkrachten',
    targetAudience: ['teacher'],
    category: 'support_organization',
    confidence: 0.99,
    matchKey: 'stop pesten nu',
    urlFragment: 'stoppestennu.nl',
  },
  {
    name: 'stoppestennu.nl',
    description:
      'Informatie voor ouders over het herkennen en aanpakken van pestgedrag. Tips voor gesprekken met school en kinderen, en verwijzingen naar hulp.',
    url: 'https://www.stoppestennu.nl/ouders',
    targetAudience: ['parent'],
    category: 'support_organization',
    confidence: 0.99,
    matchKey: 'stoppestennu',
    urlFragment: 'stoppestennu.nl',
  },
  {
    name: 'School Anti-Bullying Coordinator',
    description:
      'De interne anti-pestcoördinator van de school. Eerste aanspreekpunt voor leerkrachten en coördinatoren bij pestincidenten. Verantwoordelijk voor het pestprotocol.',
    targetAudience: ['teacher', 'coordinator'],
    category: 'school_internal',
    confidence: 0.99,
    matchKey: 'anti-bullying coordinator',
    urlFragment: '',
  },
];

/**
 * Returns the pre-seeded known resources for a given country.
 *
 * Currently only the Netherlands has known resources. Returns an empty
 * array for unsupported countries.
 *
 * @param country - The country name (case-insensitive). Accepts "Netherlands",
 *   "The Netherlands", "Nederland", and "NL".
 * @returns Array of known resources for the country, or empty array if none.
 */
export function getKnownResourcesForCountry(country: string): KnownResource[] {
  const normalized = country.trim().toLowerCase();

  const dutchVariants = [
    'netherlands',
    'the netherlands',
    'nederland',
    'nl',
  ];

  if (dutchVariants.includes(normalized)) {
    return DUTCH_KNOWN_RESOURCES;
  }

  return [];
}
