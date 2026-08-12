/**
 * Runtime boundary for proposition fulfillment.
 *
 * The learning loop may use either the existing query-derived evidence or the frozen semantic-view
 * evaluator. This module owns the only conversion from the evaluator's three labels to the product's
 * binary fulfilled contract.
 */

import type { Gold } from './gold.js';
import {
  evaluatePropositionCoverage,
  type PropositionCoverageCall,
  type PropositionCoverageInput,
  type TargetPropositionView,
} from './llm/proposition-coverage-eval.js';

export type PropositionEvidenceEvaluator = 'query' | 'semantic-view';
export type PropositionCoverage = PropositionCoverageCall['output']['coverage'];

export interface PropositionFulfillment {
  readonly propositionId: string;
  readonly coverage: PropositionCoverage;
  readonly fulfilled: boolean;
}

export interface SemanticFulfillmentRun {
  readonly evaluator: 'semantic-view';
  readonly latencyMs: number;
  readonly results: readonly PropositionFulfillment[];
}

type GoldProposition = Gold['propositions'][number];
type CoverageEvaluator = (input: PropositionCoverageInput) => Promise<PropositionCoverageCall>;

export function propositionEvidenceEvaluator(value: string | undefined): PropositionEvidenceEvaluator {
  if (value === undefined || value === '' || value === 'query') return 'query';
  if (value === 'semantic-view') return 'semantic-view';
  throw new Error(`PROPOSITION_EVIDENCE_EVALUATOR가 잘못됐다: ${value} (query|semantic-view)`);
}

export function coverageIsFulfilled(coverage: PropositionCoverage): boolean {
  return coverage === 'explicit';
}

/** Explicit projection prevents ids, shortForm, source sentences, links, and oracle metadata leaking. */
export function targetPropositionView(proposition: GoldProposition): TargetPropositionView {
  return {
    text: proposition.text,
    relation: {
      from: proposition.relation.from,
      to: proposition.relation.to,
      kind: proposition.relation.kind,
    },
    predicate: proposition.predicate,
    argument: proposition.argument,
    aspect: proposition.aspect,
    subjectRole: proposition.subjectRole,
  };
}

/**
 * Each proposition remains an independent model call, matching the frozen calibration contract.
 * proposition ids are reattached only after the call and are never part of model input.
 */
export async function evaluateSemanticFulfillment(
  propositions: readonly GoldProposition[],
  studentResponse: string,
  evaluate: CoverageEvaluator = evaluatePropositionCoverage,
): Promise<SemanticFulfillmentRun> {
  const started = performance.now();
  const results: PropositionFulfillment[] = new Array(propositions.length);
  let cursor = 0;
  const worker = async (): Promise<void> => {
    for (;;) {
      const index = cursor++;
      const proposition = propositions[index];
      if (proposition === undefined) return;
      const call = await evaluate({
        targetProposition: targetPropositionView(proposition),
        studentResponse,
      });
      const coverage = call.output.coverage;
      results[index] = {
        propositionId: proposition.id,
        coverage,
        fulfilled: coverageIsFulfilled(coverage),
      };
    }
  };
  // The frozen calibration used four concurrent independent calls. Keep the runtime within that envelope.
  await Promise.all(Array.from({ length: Math.min(4, propositions.length) }, worker));
  return { evaluator: 'semantic-view', latencyMs: Math.round(performance.now() - started), results };
}
