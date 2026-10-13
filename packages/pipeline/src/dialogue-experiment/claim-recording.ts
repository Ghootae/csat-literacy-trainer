import type { DialogueEvaluationInput } from './evaluator.js';
import type { ClaimLedgerEntry, StudentRepresentationSnapshot } from './schema.js';

/** Project model-declared lifecycle states, never infer a correction from keywords or the gold. */
export function currentClaimsFromLedger(
  ledger: readonly ClaimLedgerEntry[],
  input: DialogueEvaluationInput,
): StudentRepresentationSnapshot['expressedClaims'] {
  const utterances = [
    { source: 'initial', text: input.initialResponse },
    ...input.history.map(({ question, answer }) => ({
      source: question.type === 'CORRECTIVE' ? 'corrective' : 'diagnostic', text: answer,
    })),
  ];
  const checkQuote = (quote: { responseIndex: number; source: string; evidence: string }) => {
    const utterance = utterances[quote.responseIndex];
    if (!utterance || utterance.source !== quote.source || !quote.evidence.trim() ||
      !utterance.text.includes(quote.evidence)) {
      throw new Error('claimLedger evidence must quote the specified student responseIndex and source, not a question.');
    }
  };
  const seen = new Set<string>();
  for (const claim of ledger) {
    checkQuote(claim);
    const key = JSON.stringify([claim.responseIndex, claim.evidence, claim.description]);
    if (seen.has(key)) throw new Error('claimLedger must not duplicate the same claim across lifecycle states.');
    seen.add(key);
    if (claim.state === 'current') {
      if (claim.revisionEvidence.length !== 0) throw new Error('current claims must have no revisionEvidence.');
    } else {
      if (claim.revisionEvidence.length === 0) throw new Error('retired claims require later student revisionEvidence.');
      for (const revision of claim.revisionEvidence) {
        checkQuote(revision);
        if (revision.responseIndex <= claim.responseIndex) {
          throw new Error('revisionEvidence must come after the original claim.');
        }
      }
    }
  }
  return ledger.filter((claim) => claim.state === 'current')
    .map(({ description, source, evidence }) => ({ description, source, evidence }));
}
