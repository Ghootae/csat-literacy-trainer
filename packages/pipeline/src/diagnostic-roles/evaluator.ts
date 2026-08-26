import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import OpenAI from 'openai';
import { zodTextFormat } from 'openai/helpers/zod';

import {
  DIAGNOSTIC_ROLES_PROMPT_VERSION,
  DiagnosticRolesResultSchema,
  type DiagnosticRolesInput,
  type DiagnosticRolesResult,
} from './schema.js';

export type DiagnosticRolesEffort = 'medium' | 'high';

export interface DiagnosticRolesCallResult {
  readonly result: DiagnosticRolesResult;
  readonly metadata: {
    readonly provider: 'openai';
    readonly model: string;
    readonly effort: DiagnosticRolesEffort;
    readonly promptVersion: typeof DIAGNOSTIC_ROLES_PROMPT_VERSION;
    readonly responseId: string;
    readonly durationMs: number;
    readonly usage: {
      readonly inputTokens: number;
      readonly outputTokens: number;
      readonly reasoningTokens: number;
      readonly cachedInputTokens: number;
      readonly cacheWriteTokens: number;
    };
  };
}
const PROMPT_PATH = resolve(
  process.cwd(),
  'packages/pipeline/experiments/dialogue/diagnostic-roles-prompt-v1.md',
);

export function loadDiagnosticRolesPrompt(): string {
  return readFileSync(PROMPT_PATH, 'utf8').trim();
}

function unique(values: readonly string[], field: string): void {
  if (new Set(values).size !== values.length) {
    throw new Error(`diagnostic roles: duplicate ${field}`);
  }
}

export function validateDiagnosticRolesResult(
  result: DiagnosticRolesResult,
  input: DiagnosticRolesInput,
): DiagnosticRolesResult {
  if (result.paragraphId !== input.paragraphId) {
    throw new Error(`diagnostic roles: paragraphId changed to ${result.paragraphId}`);
  }

  const relationIds = input.coreRelations.map((relation) => relation.id);
  const axisIds = input.centralAxes.map((axis) => axis.id);
  unique(relationIds, 'input relation IDs');
  unique(axisIds, 'input axis IDs');
  unique(result.axisAudits.map((audit) => audit.axisId), 'axis audits');
  unique(result.relationRoles.map((role) => role.relationId), 'relation roles');

  if (result.axisAudits.length !== axisIds.length ||
      result.axisAudits.some((audit) => !axisIds.includes(audit.axisId))) {
    throw new Error('diagnostic roles: axisAudits must contain every input axis once');
  }
  if (result.relationRoles.length !== relationIds.length ||
      result.relationRoles.some((role) => !relationIds.includes(role.relationId))) {
    throw new Error('diagnostic roles: relationRoles must contain every core relation once');
  }

  const rolesByRelation = new Map<string, Array<'required' | 'error_only'>>();
  for (const axis of input.centralAxes) {
    const audit = result.axisAudits.find((item) => item.axisId === axis.id)!;
    const assignedIds = audit.assignments.map((assignment) => assignment.relationId);
    unique(assignedIds, `assignments for ${axis.id}`);
    if (assignedIds.length !== axis.relationIds.length ||
        assignedIds.some((relationId) => !axis.relationIds.includes(relationId))) {
      throw new Error(`diagnostic roles: assignments must match relations of ${axis.id}`);
    }
    for (const assignment of audit.assignments) {
      const roles = rolesByRelation.get(assignment.relationId) ?? [];
      roles.push(assignment.diagnosticRole);
      rolesByRelation.set(assignment.relationId, roles);
    }
  }

  for (const relation of result.relationRoles) {
    const axisRoles = rolesByRelation.get(relation.relationId);
    if (axisRoles === undefined || axisRoles.length === 0) {
      throw new Error(`diagnostic roles: relation ${relation.relationId} is not assigned to an axis`);
    }
    const expected = axisRoles.includes('required') ? 'required' : 'error_only';
    if (relation.diagnosticRole !== expected) {
      throw new Error(`diagnostic roles: global role mismatch for ${relation.relationId}`);
    }
  }

  if (result.verdict === 'READY') {
    if (result.issues.length > 0) throw new Error('diagnostic roles: READY cannot contain issues');
    for (const audit of result.axisAudits) {
      if (!audit.assignments.some((assignment) => assignment.diagnosticRole === 'required')) {
        throw new Error(`diagnostic roles: READY axis ${audit.axisId} needs a probe anchor`);
      }
    }
  } else if (result.issues.length === 0) {
    throw new Error('diagnostic roles: NEEDS_REVIEW must explain an issue');
  }

  return result;
}

export async function assignDiagnosticRolesWithOpenAI(
  input: DiagnosticRolesInput,
  config: {
    readonly model: string;
    readonly effort: DiagnosticRolesEffort;
    readonly client?: OpenAI;
  },
): Promise<DiagnosticRolesCallResult> {
  const client = config.client ?? new OpenAI({ maxRetries: 0 });
  const started = performance.now();
  const response = await client.responses.parse({
    model: config.model,
    instructions: loadDiagnosticRolesPrompt(),
    input: JSON.stringify(input, null, 2),
    reasoning: { effort: config.effort },
    max_output_tokens: 8_000,
    store: false,
    text: {
      format: zodTextFormat(DiagnosticRolesResultSchema, 'diagnostic_roles_result'),
    },
  });
  if (response.output_parsed === null) {
    throw new Error('diagnostic roles: structured output parsing failed');
  }
  const usage = response.usage;
  return {
    result: validateDiagnosticRolesResult(response.output_parsed, input),
    metadata: {
      provider: 'openai',
      model: config.model,
      effort: config.effort,
      promptVersion: DIAGNOSTIC_ROLES_PROMPT_VERSION,
      responseId: response.id,
      durationMs: Math.round(performance.now() - started),
      usage: {
        inputTokens: usage?.input_tokens ?? 0,
        outputTokens: usage?.output_tokens ?? 0,
        reasoningTokens: usage?.output_tokens_details.reasoning_tokens ?? 0,
        cachedInputTokens: usage?.input_tokens_details.cached_tokens ?? 0,
        cacheWriteTokens: usage?.input_tokens_details.cache_write_tokens ?? 0,
      },
    },
  };
}
