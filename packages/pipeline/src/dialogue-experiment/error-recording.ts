import type { ClaimLedgerEntry, ErrorClaim } from './schema.js';

/** Structural provenance only: the model still decides whether a quoted claim is wrong. */
export function validateErrorClaims(
  errors: readonly ErrorClaim[],
  ledger: readonly ClaimLedgerEntry[] | undefined,
  axes: readonly { axisId: string; state: string }[],
): void {
  if (!ledger) throw new Error('errorClaims requires claimLedger.');
  const distorted = new Set(axes.filter((axis) => axis.state === 'distorted').map((axis) => axis.axisId));
  const covered = new Set<string>();
  const seen = new Set<string>();
  for (const error of errors) {
    if (!distorted.has(error.axisId)) throw new Error('errorClaims must target a distorted axis.');
    const claim = ledger[error.claimIndex];
    if (!claim || claim.state !== 'current') throw new Error('errorClaims must reference a current claim, never a superseded/retracted claim.');
    if (claim.source !== error.source || claim.responseIndex !== error.responseIndex ||
      !error.evidence.trim() || !claim.evidence.includes(error.evidence)) {
      throw new Error('errorClaims must quote the referenced current claim at the same student responseIndex and source.');
    }
    const key = JSON.stringify([error.axisId, error.claimIndex, error.evidence]);
    if (seen.has(key)) throw new Error('errorClaims must not duplicate the same error quote.');
    seen.add(key);
    covered.add(error.axisId);
  }
  if ([...distorted].some((id) => !covered.has(id))) {
    throw new Error('Every distorted axis requires at least one explicitly located error claim.');
  }
}
