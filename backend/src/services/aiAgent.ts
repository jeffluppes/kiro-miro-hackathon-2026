/**
 * AI Agent service implementing the Anthropic tool-use agentic loop
 * for jurisdiction discovery.
 *
 * The agent uses web search to discover anti-bullying resources,
 * legal obligations, and reporting procedures for a given school.
 */

import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';

// ─── Structured Discovery Result Schema ──────────────────────────────────────

const DiscoveredResourceItemSchema = z.object({
  name: z.string(),
  description: z.string().default(''),
  url: z.string().optional(),
  phone: z.string().optional(),
  targetAudience: z.array(z.string()).default([]),
  category: z.string().default('support_organization'),
});

const LegalObligationItemSchema = z.object({
  title: z.string(),
  description: z.string().default(''),
  authority: z.string().default(''),
  deadline: z.string().optional(),
  applicableLaw: z.string().optional(),
});

const ReportingProcedureItemSchema = z.object({
  title: z.string(),
  steps: z.array(z.string()).default([]),
  targetAuthority: z.string().default(''),
  requiredDocuments: z.array(z.string()).optional(),
});

export const StructuredDiscoveryResultSchema = z.object({
  municipality: z.string().default(''),
  province: z.string().default(''),
  country: z.string().default(''),
  resources: z.array(DiscoveredResourceItemSchema).default([]),
  legalObligations: z.array(LegalObligationItemSchema).default([]),
  reportingProcedures: z.array(ReportingProcedureItemSchema).default([]),
  overallConfidence: z.number().min(0).max(1).default(0.5),
});

export type StructuredDiscoveryResult = z.infer<typeof StructuredDiscoveryResultSchema>;

// ─── Web Search Tool Definition ──────────────────────────────────────────────

export const webSearchTool: Anthropic.Tool = {
  name: 'web_search',
  description:
    'Search the web for current information about anti-bullying policies, local resources, and reporting requirements.',
  input_schema: {
    type: 'object' as const,
    properties: {
      query: {
        type: 'string',
        description: 'The search query to find jurisdiction-specific information',
      },
    },
    required: ['query'],
  },
};

// ─── System Prompt ───────────────────────────────────────────────────────────

export const JURISDICTION_DISCOVERY_SYSTEM_PROMPT = `You are a research agent that discovers anti-bullying resources and reporting requirements for schools.

Given a school name, you must:
1. Determine the school's location (municipality, province, country)
2. Find local anti-bullying policies and procedures
3. Identify government reporting requirements and deadlines
4. Discover local support organizations for students, parents, and teachers
5. Find relevant laws and legal obligations

Use the web_search tool to find current, accurate information. Make multiple searches to build a complete picture. Structure your final response as JSON with the following fields:
- municipality, province, country
- resources: [{name, description, url, phone, targetAudience, category}]
- legalObligations: [{title, description, authority, deadline, applicableLaw}]
- reportingProcedures: [{title, steps, targetAuthority, requiredDocuments}]
- overallConfidence: number between 0 and 1

targetAudience should be an array containing one or more of: "student", "parent", "teacher", "coordinator"
category should be one of: "helpline", "reporting_portal", "support_organization", "government_body", "school_internal", "legal_aid", "counseling"

Return ONLY valid JSON in your final response, with no additional text or markdown formatting.`;

// ─── Web Search Executor (Placeholder/Stub) ──────────────────────────────────

/**
 * Placeholder web search function. This can be swapped with a real search API
 * (Tavily, Brave Search, etc.) later.
 *
 * @param query - The search query string
 * @returns Search results as a formatted string
 */
export async function executeWebSearch(query: string): Promise<string> {
  // Stub implementation — returns a message indicating no real search was performed.
  // Replace this with an actual search API integration (Tavily, Brave, SerpAPI, etc.)
  return `[Web search results for: "${query}"]\n\nNo real search API configured. This is a placeholder response. To enable real web search, integrate a search API (e.g., Tavily, Brave Search) in the executeWebSearch function.`;
}

// ─── Agent Loop Implementation ───────────────────────────────────────────────

export interface AgentLoopOptions {
  /** Anthropic API key. Defaults to ANTHROPIC_API_KEY env var. */
  apiKey?: string;
  /** Model to use. Defaults to claude-sonnet-4-20250514. */
  model?: string;
  /** Maximum tokens for each response. Defaults to 4096. */
  maxTokens?: number;
  /** Maximum number of loop iterations to prevent runaway. Defaults to 15. */
  maxIterations?: number;
  /** Custom web search executor. Defaults to the placeholder stub. */
  searchExecutor?: (query: string) => Promise<string>;
}

/**
 * Processes the AI agent loop for jurisdiction discovery.
 *
 * Sends the initial message to Anthropic, then iterates:
 * - If stop_reason is 'tool_use', execute the requested tool calls
 * - Feed tool results back to the model
 * - Repeat until the model stops calling tools (stop_reason is 'end_turn' or 'stop_sequence')
 *
 * Finally, parses the text response into a StructuredDiscoveryResult.
 *
 * @param schoolName - The school name to discover jurisdiction info for
 * @param options - Configuration options for the agent loop
 * @returns Parsed structured discovery result
 */
export async function processAgentLoop(
  schoolName: string,
  options: AgentLoopOptions = {},
): Promise<StructuredDiscoveryResult> {
  const {
    apiKey = process.env['ANTHROPIC_API_KEY'],
    model = 'claude-sonnet-4-20250514',
    maxTokens = 4096,
    maxIterations = 15,
    searchExecutor = executeWebSearch,
  } = options;

  if (!apiKey) {
    throw new Error(
      'ANTHROPIC_API_KEY is not set. Provide it via environment variable or options.apiKey.',
    );
  }

  const client = new Anthropic({ apiKey });

  const messages: Anthropic.MessageParam[] = [
    {
      role: 'user',
      content: `Discover anti-bullying resources and reporting requirements for: ${schoolName}`,
    },
  ];

  // Initial request to the model
  let currentResponse = await client.messages.create({
    model,
    max_tokens: maxTokens,
    tools: [webSearchTool],
    system: JURISDICTION_DISCOVERY_SYSTEM_PROMPT,
    messages,
  });

  let iterations = 0;

  // Agentic loop: keep processing while the model wants to use tools
  while (currentResponse.stop_reason === 'tool_use' && iterations < maxIterations) {
    iterations++;

    const toolUseBlocks = currentResponse.content.filter(
      (block): block is Anthropic.ContentBlockParam & { type: 'tool_use'; id: string; name: string; input: Record<string, unknown> } =>
        block.type === 'tool_use',
    );

    // Execute each tool call, handling partial failures
    const toolResults: Anthropic.ToolResultBlockParam[] = await Promise.all(
      toolUseBlocks.map(async (toolCall) => {
        if (toolCall.name === 'web_search') {
          try {
            const query = (toolCall.input as { query: string }).query;
            const searchResult = await searchExecutor(query);
            return {
              type: 'tool_result' as const,
              tool_use_id: toolCall.id,
              content: searchResult,
            };
          } catch (error) {
            // Partial failure: if a search fails, return error message but continue
            const errorMessage =
              error instanceof Error ? error.message : 'Unknown search error';
            return {
              type: 'tool_result' as const,
              tool_use_id: toolCall.id,
              content: `[Search failed: ${errorMessage}]. Please continue with remaining search goals.`,
              is_error: true,
            };
          }
        }

        // Unknown tool — return error but don't abort
        return {
          type: 'tool_result' as const,
          tool_use_id: toolCall.id,
          content: `Unknown tool: ${toolCall.name}. Please continue with available tools.`,
          is_error: true,
        };
      }),
    );

    // Add assistant response and tool results to conversation
    messages.push({ role: 'assistant', content: currentResponse.content });
    messages.push({ role: 'user', content: toolResults });

    // Continue the conversation
    currentResponse = await client.messages.create({
      model,
      max_tokens: maxTokens,
      tools: [webSearchTool],
      system: JURISDICTION_DISCOVERY_SYSTEM_PROMPT,
      messages,
    });
  }

  // Extract the final text response
  return parseDiscoveryResponse(currentResponse.content);
}

// ─── Response Parsing ────────────────────────────────────────────────────────

/**
 * Parses the final text response from the AI agent into a StructuredDiscoveryResult.
 * Attempts to extract JSON from the response content blocks.
 *
 * @param content - The content blocks from the final Anthropic response
 * @returns Parsed and validated StructuredDiscoveryResult
 */
export function parseDiscoveryResponse(
  content: Anthropic.ContentBlock[],
): StructuredDiscoveryResult {
  // Collect all text blocks
  const textBlocks = content.filter(
    (block): block is Anthropic.TextBlock => block.type === 'text',
  );

  const fullText = textBlocks.map((block) => block.text).join('\n');

  if (!fullText.trim()) {
    // No text response — return empty result with low confidence
    return {
      municipality: '',
      province: '',
      country: '',
      resources: [],
      legalObligations: [],
      reportingProcedures: [],
      overallConfidence: 0.1,
    };
  }

  // Try to extract JSON from the text (may be wrapped in markdown code blocks)
  const jsonMatch = fullText.match(/```(?:json)?\s*([\s\S]*?)```/) ?? [
    null,
    fullText,
  ];
  const jsonString = (jsonMatch[1] ?? fullText).trim();

  try {
    const parsed: unknown = JSON.parse(jsonString);
    const validated = StructuredDiscoveryResultSchema.parse(parsed);
    return validated;
  } catch {
    // If JSON parsing fails, try to find JSON object in the text
    const objectMatch = fullText.match(/\{[\s\S]*\}/);
    if (objectMatch) {
      try {
        const parsed: unknown = JSON.parse(objectMatch[0]);
        const validated = StructuredDiscoveryResultSchema.parse(parsed);
        return validated;
      } catch {
        // Fall through to default
      }
    }

    // Return a minimal result with low confidence if parsing fails entirely
    return {
      municipality: '',
      province: '',
      country: '',
      resources: [],
      legalObligations: [],
      reportingProcedures: [],
      overallConfidence: 0.1,
    };
  }
}
