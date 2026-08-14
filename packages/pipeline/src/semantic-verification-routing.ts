import type { Gold } from './gold.js';
import type { GeneratedQuerySet } from './llm/query-gen.js';
import {
  verifyGoldSemantic,
  verifyQuerySemantic,
  verifyTitleQuerySemantic,
  type SemanticVerificationReport,
} from './semantic-verification.js';

export interface SemanticVerifierDependencies {
  readonly gold: (sourceText: string, candidate: Gold, paragraphId: string) => Promise<SemanticVerificationReport>;
  readonly query: (
    sourceText: string,
    gold: Gold,
    candidate: GeneratedQuerySet,
    paragraphId: string,
  ) => Promise<SemanticVerificationReport>;
  readonly titleQuery: (
    sourceText: string,
    gold: Gold,
    candidate: GeneratedQuerySet,
    paragraphId: string,
  ) => Promise<SemanticVerificationReport>;
}

export const DEFAULT_SEMANTIC_VERIFIERS: SemanticVerifierDependencies = {
  gold: verifyGoldSemantic,
  query: verifyQuerySemantic,
  titleQuery: verifyTitleQuerySemantic,
};

export type SemanticVerifierRequest =
  | {
      readonly kind: 'gold';
      readonly sourceText: string;
      readonly candidate: Gold;
      readonly paragraphId: string;
    }
  | {
      readonly kind: 'query' | 'title-query';
      readonly sourceText: string;
      readonly gold: Gold;
      readonly candidate: GeneratedQuerySet;
      readonly paragraphId: string;
    };

export function runSelectedSemanticVerifier(
  request: SemanticVerifierRequest,
  dependencies: SemanticVerifierDependencies = DEFAULT_SEMANTIC_VERIFIERS,
): Promise<SemanticVerificationReport> {
  if (request.kind === 'gold') {
    return dependencies.gold(request.sourceText, request.candidate, request.paragraphId);
  }
  if (request.kind === 'query') {
    return dependencies.query(request.sourceText, request.gold, request.candidate, request.paragraphId);
  }
  return dependencies.titleQuery(request.sourceText, request.gold, request.candidate, request.paragraphId);
}
