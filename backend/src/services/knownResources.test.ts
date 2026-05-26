import { describe, it, expect, beforeAll } from 'vitest';
import { getKnownResourcesForCountry, type KnownResource } from './knownResources.js';

describe('getKnownResourcesForCountry', () => {
  it('returns Dutch resources for "Netherlands"', () => {
    const resources = getKnownResourcesForCountry('Netherlands');
    expect(resources.length).toBe(6);
  });

  it('returns Dutch resources for case-insensitive variants', () => {
    const variants = ['netherlands', 'The Netherlands', 'Nederland', 'NL', 'nl'];
    for (const variant of variants) {
      const resources = getKnownResourcesForCountry(variant);
      expect(resources.length).toBe(6);
    }
  });

  it('returns empty array for unsupported countries', () => {
    expect(getKnownResourcesForCountry('Germany')).toEqual([]);
    expect(getKnownResourcesForCountry('France')).toEqual([]);
    expect(getKnownResourcesForCountry('')).toEqual([]);
  });

  it('handles whitespace in country input', () => {
    const resources = getKnownResourcesForCountry('  Netherlands  ');
    expect(resources.length).toBe(6);
  });

  describe('Dutch resource data integrity', () => {
    let resources: KnownResource[];

    beforeAll(() => {
      resources = getKnownResourcesForCountry('Netherlands');
    });

    it('all resources have confidence 0.99', () => {
      for (const resource of resources) {
        expect(resource.confidence).toBe(0.99);
      }
    });

    it('all resources have non-empty name and description', () => {
      for (const resource of resources) {
        expect(resource.name.length).toBeGreaterThan(0);
        expect(resource.description.length).toBeGreaterThan(0);
      }
    });

    it('all resources have at least one target audience', () => {
      for (const resource of resources) {
        expect(resource.targetAudience.length).toBeGreaterThan(0);
      }
    });

    it('all resources have a matchKey for deduplication', () => {
      for (const resource of resources) {
        expect(resource.matchKey.length).toBeGreaterThan(0);
      }
    });

    it('includes Kindertelefoon with correct data', () => {
      const kindertelefoon = resources.find(r => r.name === 'Kindertelefoon');
      expect(kindertelefoon).toBeDefined();
      expect(kindertelefoon!.phone).toBe('0800-0432');
      expect(kindertelefoon!.targetAudience).toEqual(['student']);
      expect(kindertelefoon!.category).toBe('helpline');
      expect(kindertelefoon!.urlFragment).toBe('kindertelefoon.nl');
    });

    it('includes Meldknop.nl with correct data', () => {
      const meldknop = resources.find(r => r.name === 'Meldknop.nl');
      expect(meldknop).toBeDefined();
      expect(meldknop!.targetAudience).toContain('student');
      expect(meldknop!.targetAudience).toContain('parent');
      expect(meldknop!.category).toBe('reporting_portal');
      expect(meldknop!.urlFragment).toBe('meldknop.nl');
    });

    it('includes Stichting School & Veiligheid for teachers', () => {
      const ssv = resources.find(r => r.name === 'Stichting School & Veiligheid');
      expect(ssv).toBeDefined();
      expect(ssv!.targetAudience).toEqual(['teacher']);
      expect(ssv!.category).toBe('support_organization');
    });

    it('includes Stop Pesten NU Teacher Portal for teachers', () => {
      const spn = resources.find(r => r.name === 'Stop Pesten NU Teacher Portal');
      expect(spn).toBeDefined();
      expect(spn!.targetAudience).toEqual(['teacher']);
      expect(spn!.category).toBe('support_organization');
    });

    it('includes stoppestennu.nl for parents', () => {
      const spnParent = resources.find(r => r.name === 'stoppestennu.nl');
      expect(spnParent).toBeDefined();
      expect(spnParent!.targetAudience).toEqual(['parent']);
      expect(spnParent!.category).toBe('support_organization');
    });

    it('includes School Anti-Bullying Coordinator as school_internal', () => {
      const coordinator = resources.find(r => r.name === 'School Anti-Bullying Coordinator');
      expect(coordinator).toBeDefined();
      expect(coordinator!.targetAudience).toContain('teacher');
      expect(coordinator!.targetAudience).toContain('coordinator');
      expect(coordinator!.category).toBe('school_internal');
    });
  });
});
