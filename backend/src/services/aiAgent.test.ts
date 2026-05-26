/**
 * Unit tests for the AI Agent service.
 * Tests the parseDiscoveryResponse function and StructuredDiscoveryResult schema.
 */

import { describe, it, expect } from 'vitest';
import {
  parseDiscoveryResponse,
  StructuredDiscoveryResultSchema,
  webSearchTool,
  JURISDICTION_DISCOVERY_SYSTEM_PROMPT,
} from './aiAgent.js';
import type Anthropic from '@anthropic-ai/sdk';

describe('aiAgent', () => {
  describe('webSearchTool', () => {
    it('has the correct tool name and schema', () => {
      expect(webSearchTool.name).toBe('web_search');
      expect(webSearchTool.input_schema.type).toBe('object');
      expect(webSearchTool.input_schema.properties).toHaveProperty('query');
      expect(webSearchTool.input_schema.required).toContain('query');
    });
  });

  describe('JURISDICTION_DISCOVERY_SYSTEM_PROMPT', () => {
    it('instructs the agent to discover key information categories', () => {
      expect(JURISDICTION_DISCOVERY_SYSTEM_PROMPT).toContain('municipality');
      expect(JURISDICTION_DISCOVERY_SYSTEM_PROMPT).toContain('anti-bullying');
      expect(JURISDICTION_DISCOVERY_SYSTEM_PROMPT).toContain('reporting requirements');
      expect(JURISDICTION_DISCOVERY_SYSTEM_PROMPT).toContain('support organizations');
      expect(JURISDICTION_DISCOVERY_SYSTEM_PROMPT).toContain('legal obligations');
    });

    it('specifies the expected JSON output format', () => {
      expect(JURISDICTION_DISCOVERY_SYSTEM_PROMPT).toContain('resources');
      expect(JURISDICTION_DISCOVERY_SYSTEM_PROMPT).toContain('legalObligations');
      expect(JURISDICTION_DISCOVERY_SYSTEM_PROMPT).toContain('reportingProcedures');
      expect(JURISDICTION_DISCOVERY_SYSTEM_PROMPT).toContain('overallConfidence');
    });
  });

  describe('StructuredDiscoveryResultSchema', () => {
    it('validates a complete valid result', () => {
      const input = {
        municipality: 'Amsterdam',
        province: 'Noord-Holland',
        country: 'Netherlands',
        resources: [
          {
            name: 'Kindertelefoon',
            description: 'Helpline for children',
            url: 'https://kindertelefoon.nl',
            phone: '0800-0432',
            targetAudience: ['student'],
            category: 'helpline',
          },
        ],
        legalObligations: [
          {
            title: 'Wet veiligheid op school',
            description: 'Schools must have anti-bullying policy',
            authority: 'Inspectie van het Onderwijs',
            deadline: 'ongoing',
            applicableLaw: 'Wet veiligheid op school (2015)',
          },
        ],
        reportingProcedures: [
          {
            title: 'Report to school board',
            steps: ['Document incident', 'Notify coordinator'],
            targetAuthority: 'School Board',
            requiredDocuments: ['Incident report form'],
          },
        ],
        overallConfidence: 0.82,
      };

      const result = StructuredDiscoveryResultSchema.parse(input);
      expect(result.municipality).toBe('Amsterdam');
      expect(result.resources).toHaveLength(1);
      expect(result.legalObligations).toHaveLength(1);
      expect(result.reportingProcedures).toHaveLength(1);
      expect(result.overallConfidence).toBe(0.82);
    });

    it('applies defaults for missing optional fields', () => {
      const input = {
        municipality: 'Utrecht',
        country: 'Netherlands',
      };

      const result = StructuredDiscoveryResultSchema.parse(input);
      expect(result.province).toBe('');
      expect(result.resources).toEqual([]);
      expect(result.legalObligations).toEqual([]);
      expect(result.reportingProcedures).toEqual([]);
      expect(result.overallConfidence).toBe(0.5);
    });

    it('rejects confidence scores outside 0-1 range', () => {
      expect(() =>
        StructuredDiscoveryResultSchema.parse({
          municipality: 'Test',
          overallConfidence: 1.5,
        }),
      ).toThrow();

      expect(() =>
        StructuredDiscoveryResultSchema.parse({
          municipality: 'Test',
          overallConfidence: -0.1,
        }),
      ).toThrow();
    });
  });

  describe('parseDiscoveryResponse', () => {
    it('parses a valid JSON text block', () => {
      const content: Anthropic.ContentBlock[] = [
        {
          type: 'text',
          text: JSON.stringify({
            municipality: 'Rotterdam',
            province: 'Zuid-Holland',
            country: 'Netherlands',
            resources: [],
            legalObligations: [],
            reportingProcedures: [],
            overallConfidence: 0.75,
          }),
        },
      ];

      const result = parseDiscoveryResponse(content);
      expect(result.municipality).toBe('Rotterdam');
      expect(result.province).toBe('Zuid-Holland');
      expect(result.country).toBe('Netherlands');
      expect(result.overallConfidence).toBe(0.75);
    });

    it('parses JSON wrapped in markdown code blocks', () => {
      const content: Anthropic.ContentBlock[] = [
        {
          type: 'text',
          text: '```json\n{"municipality": "Den Haag", "province": "Zuid-Holland", "country": "Netherlands", "resources": [], "legalObligations": [], "reportingProcedures": [], "overallConfidence": 0.6}\n```',
        },
      ];

      const result = parseDiscoveryResponse(content);
      expect(result.municipality).toBe('Den Haag');
      expect(result.overallConfidence).toBe(0.6);
    });

    it('extracts JSON object from mixed text', () => {
      const content: Anthropic.ContentBlock[] = [
        {
          type: 'text',
          text: 'Here are the results:\n{"municipality": "Eindhoven", "province": "Noord-Brabant", "country": "Netherlands", "resources": [], "legalObligations": [], "reportingProcedures": [], "overallConfidence": 0.7}\nEnd of results.',
        },
      ];

      const result = parseDiscoveryResponse(content);
      expect(result.municipality).toBe('Eindhoven');
      expect(result.country).toBe('Netherlands');
    });

    it('returns low-confidence empty result when no text blocks present', () => {
      const content: Anthropic.ContentBlock[] = [];

      const result = parseDiscoveryResponse(content);
      expect(result.municipality).toBe('');
      expect(result.overallConfidence).toBe(0.1);
      expect(result.resources).toEqual([]);
    });

    it('returns low-confidence empty result when text is not valid JSON', () => {
      const content: Anthropic.ContentBlock[] = [
        {
          type: 'text',
          text: 'I could not find any information about this school.',
        },
      ];

      const result = parseDiscoveryResponse(content);
      expect(result.municipality).toBe('');
      expect(result.overallConfidence).toBe(0.1);
    });

    it('handles multiple text blocks by concatenating them', () => {
      const content: Anthropic.ContentBlock[] = [
        { type: 'text', text: '{"municipality": "Groningen",' },
        {
          type: 'text',
          text: '"province": "Groningen", "country": "Netherlands", "resources": [], "legalObligations": [], "reportingProcedures": [], "overallConfidence": 0.8}',
        },
      ];

      const result = parseDiscoveryResponse(content);
      expect(result.municipality).toBe('Groningen');
      expect(result.overallConfidence).toBe(0.8);
    });

    it('ignores non-text content blocks', () => {
      const content: Anthropic.ContentBlock[] = [
        {
          type: 'tool_use',
          id: 'tool_123',
          name: 'web_search',
          input: { query: 'test' },
        } as unknown as Anthropic.ContentBlock,
        {
          type: 'text',
          text: '{"municipality": "Leiden", "province": "Zuid-Holland", "country": "Netherlands", "resources": [], "legalObligations": [], "reportingProcedures": [], "overallConfidence": 0.65}',
        },
      ];

      const result = parseDiscoveryResponse(content);
      expect(result.municipality).toBe('Leiden');
    });

    it('parses resources with all fields', () => {
      const content: Anthropic.ContentBlock[] = [
        {
          type: 'text',
          text: JSON.stringify({
            municipality: 'Amsterdam',
            province: 'Noord-Holland',
            country: 'Netherlands',
            resources: [
              {
                name: 'Kindertelefoon',
                description: 'Free helpline for children',
                url: 'https://kindertelefoon.nl',
                phone: '0800-0432',
                targetAudience: ['student'],
                category: 'helpline',
              },
              {
                name: 'Meldknop.nl',
                description: 'Online reporting portal',
                url: 'https://meldknop.nl',
                targetAudience: ['student', 'parent'],
                category: 'reporting_portal',
              },
            ],
            legalObligations: [
              {
                title: 'Wet veiligheid op school',
                description: 'Mandatory anti-bullying policy',
                authority: 'Inspectie van het Onderwijs',
                applicableLaw: 'Wet veiligheid op school (2015)',
              },
            ],
            reportingProcedures: [
              {
                title: 'SISA Registration',
                steps: ['Identify concern', 'Register in SISA', 'Follow up'],
                targetAuthority: 'Municipality Amsterdam',
                requiredDocuments: ['Incident form'],
              },
            ],
            overallConfidence: 0.85,
          }),
        },
      ];

      const result = parseDiscoveryResponse(content);
      expect(result.resources).toHaveLength(2);
      expect(result.resources[0]!.name).toBe('Kindertelefoon');
      expect(result.resources[0]!.phone).toBe('0800-0432');
      expect(result.resources[1]!.targetAudience).toEqual(['student', 'parent']);
      expect(result.legalObligations[0]!.applicableLaw).toBe(
        'Wet veiligheid op school (2015)',
      );
      expect(result.reportingProcedures[0]!.steps).toHaveLength(3);
    });
  });
});
