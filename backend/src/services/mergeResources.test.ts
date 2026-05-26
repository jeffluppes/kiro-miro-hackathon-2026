import { describe, it, expect } from 'vitest';
import { mergeWithKnownResources } from './mergeResources.js';
import type { DiscoveredResource } from '../types/index.js';
import type { KnownResource } from './knownResources.js';

function makeDiscoveredResource(
  overrides: Partial<DiscoveredResource> = {},
): DiscoveredResource {
  return {
    id: 'disc-1',
    profileId: 'profile-1',
    name: 'Some Resource',
    description: 'A discovered resource',
    targetAudience: ['student'],
    category: 'helpline',
    source: 'ai-discovered',
    confidence: 0.8,
    isKnownResource: false,
    verifiedByTeacher: false,
    ...overrides,
  };
}

function makeKnownResource(
  overrides: Partial<KnownResource> = {},
): KnownResource {
  return {
    name: 'Kindertelefoon',
    description: 'Helpline for children',
    url: 'https://www.kindertelefoon.nl',
    phone: '0800-0432',
    targetAudience: ['student'],
    category: 'helpline',
    confidence: 0.99,
    matchKey: 'kindertelefoon',
    urlFragment: 'kindertelefoon.nl',
    ...overrides,
  };
}

describe('mergeWithKnownResources', () => {
  it('should return discovered resources unchanged when knownResources is empty', () => {
    const discovered = [makeDiscoveredResource()];
    const result = mergeWithKnownResources(discovered, []);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual(discovered[0]);
  });

  it('should add known resources when discovered list is empty', () => {
    const known = [makeKnownResource()];
    const result = mergeWithKnownResources([], known);

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Kindertelefoon');
    expect(result[0].confidence).toBe(0.99);
    expect(result[0].isKnownResource).toBe(true);
    expect(result[0].source).toBe('pre-seeded (known Dutch resource)');
    expect(result[0].verifiedByTeacher).toBe(false);
    expect(result[0].id).toBeDefined();
  });

  it('should match by name (case-insensitive) and enrich existing entry', () => {
    const discovered = [
      makeDiscoveredResource({
        name: 'De Kindertelefoon Hulplijn',
        confidence: 0.7,
        isKnownResource: false,
        phone: undefined,
        url: undefined,
      }),
    ];
    const known = [makeKnownResource()];

    const result = mergeWithKnownResources(discovered, known);

    expect(result).toHaveLength(1);
    expect(result[0].isKnownResource).toBe(true);
    expect(result[0].confidence).toBe(0.95);
    expect(result[0].phone).toBe('0800-0432');
    expect(result[0].url).toBe('https://www.kindertelefoon.nl');
  });

  it('should match by URL fragment and enrich existing entry', () => {
    const discovered = [
      makeDiscoveredResource({
        name: 'Children Helpline NL',
        url: 'https://www.kindertelefoon.nl/contact',
        confidence: 0.6,
        isKnownResource: false,
      }),
    ];
    const known = [makeKnownResource()];

    const result = mergeWithKnownResources(discovered, known);

    expect(result).toHaveLength(1);
    expect(result[0].isKnownResource).toBe(true);
    expect(result[0].confidence).toBe(0.95);
  });

  it('should use max(discovered, 0.95) for confidence when merging', () => {
    const discovered = [
      makeDiscoveredResource({
        name: 'Kindertelefoon info',
        confidence: 0.98,
      }),
    ];
    const known = [makeKnownResource()];

    const result = mergeWithKnownResources(discovered, known);

    expect(result[0].confidence).toBe(0.98);
  });

  it('should not overwrite existing phone/url when already present', () => {
    const discovered = [
      makeDiscoveredResource({
        name: 'Kindertelefoon',
        phone: '0800-9999',
        url: 'https://custom.kindertelefoon.nl',
      }),
    ];
    const known = [makeKnownResource()];

    const result = mergeWithKnownResources(discovered, known);

    expect(result[0].phone).toBe('0800-9999');
    expect(result[0].url).toBe('https://custom.kindertelefoon.nl');
  });

  it('should never remove AI-discovered resources', () => {
    const discovered = [
      makeDiscoveredResource({ id: 'ai-1', name: 'AI Found Resource' }),
      makeDiscoveredResource({ id: 'ai-2', name: 'Another AI Resource' }),
    ];
    const known = [makeKnownResource()];

    const result = mergeWithKnownResources(discovered, known);

    expect(result).toHaveLength(3);
    expect(result.find((r) => r.id === 'ai-1')).toBeDefined();
    expect(result.find((r) => r.id === 'ai-2')).toBeDefined();
  });

  it('should handle multiple known resources', () => {
    const discovered: DiscoveredResource[] = [];
    const known = [
      makeKnownResource({ name: 'Kindertelefoon', matchKey: 'kindertelefoon' }),
      makeKnownResource({
        name: 'Meldknop.nl',
        matchKey: 'meldknop',
        urlFragment: 'meldknop.nl',
        url: 'https://www.meldknop.nl',
      }),
    ];

    const result = mergeWithKnownResources(discovered, known);

    expect(result).toHaveLength(2);
    expect(result[0].name).toBe('Kindertelefoon');
    expect(result[1].name).toBe('Meldknop.nl');
    expect(result.every((r) => r.isKnownResource)).toBe(true);
    expect(result.every((r) => r.confidence === 0.99)).toBe(true);
  });

  it('should not match on empty urlFragment', () => {
    const discovered = [
      makeDiscoveredResource({
        name: 'Some Internal Coordinator',
        url: 'https://school.nl/coordinator',
      }),
    ];
    const known = [
      makeKnownResource({
        name: 'School Anti-Bullying Coordinator',
        matchKey: 'anti-bullying coordinator',
        urlFragment: '',
      }),
    ];

    const result = mergeWithKnownResources(discovered, known);

    // Should not match because urlFragment is empty and name doesn't include matchKey
    expect(result).toHaveLength(2);
    expect(result[1].name).toBe('School Anti-Bullying Coordinator');
  });

  it('should set profileId to empty string for newly added known resources', () => {
    const result = mergeWithKnownResources([], [makeKnownResource()]);

    expect(result[0].profileId).toBe('');
  });

  it('should not mutate the original discovered array', () => {
    const discovered = [
      makeDiscoveredResource({ name: 'Kindertelefoon info' }),
    ];
    const originalLength = discovered.length;

    mergeWithKnownResources(discovered, [
      makeKnownResource(),
      makeKnownResource({
        name: 'Meldknop.nl',
        matchKey: 'meldknop',
        urlFragment: 'meldknop.nl',
      }),
    ]);

    expect(discovered).toHaveLength(originalLength);
  });

  it('should generate unique IDs for added known resources', () => {
    const known = [
      makeKnownResource({
        name: 'Resource A',
        matchKey: 'resource-a',
        urlFragment: 'resource-a.nl',
        url: 'https://resource-a.nl',
      }),
      makeKnownResource({
        name: 'Resource B',
        matchKey: 'resource-b',
        urlFragment: 'resource-b.nl',
        url: 'https://resource-b.nl',
      }),
    ];

    const result = mergeWithKnownResources([], known);

    expect(result).toHaveLength(2);
    expect(result[0].id).not.toBe(result[1].id);
  });
});
