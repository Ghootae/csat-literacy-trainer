// Port of scripts/lib/v5-marker-judgment.mjs; preserve its JSON contract and validation semantics.
// claimConflicts·keyRelationCoverage는 TS 쪽에만 있음(2026-10-21).
export function extendedSelectionSchema(base: Record<string, any>) {
  const schema = structuredClone(base);
  // claimConflicts and keyRelationCoverage must be generated before reconstructability/contentAssessment, so they go first.
  schema.properties = { claimConflicts: { type: 'array', items: {
    type: 'object', additionalProperties: false,
    properties: Object.fromEntries(['observationId', 'firstQuote', 'secondQuote', 'conflict'].map(k => [k, { type: 'string' }])),
    required: ['observationId', 'firstQuote', 'secondQuote', 'conflict'],
  } }, keyRelationCoverage: { type: 'array', minItems: 1, items: {
    type: 'object', additionalProperties: false,
    properties: { element: { type: 'string' }, covered: { type: 'boolean' }, observationId: { type: 'string' }, quote: { type: 'string' } },
    required: ['element', 'covered', 'observationId', 'quote'],
  } }, ...schema.properties };
  schema.properties.studentClaims = { type: 'array', minItems: 1, items: {
    type: 'object', additionalProperties: false,
    properties: Object.fromEntries(['observationId', 'quote', 'claimAsStated', 'sourceCheck', 'sourceBasis']
      .map(k => [k, k === 'sourceCheck' ? { type: 'string', enum: ['CONSISTENT', 'CONTRADICTED', 'OFF_TARGET', 'UNDETERMINED'] } : { type: 'string' }])),
    required: ['observationId', 'quote', 'claimAsStated', 'sourceCheck', 'sourceBasis'],
  } };
  schema.required = [...schema.required, 'claimConflicts', 'keyRelationCoverage', 'studentClaims'];
  return schema;
}
const normalize = (text: string) => text.replace(/\s+/gu, ' ').trim();
export const overlaps = (a: { observationId: string; quote: string }, b: { observationId: string; quote: string }) => a.observationId === b.observationId && normalize(a.quote) && normalize(b.quote)
  && (normalize(a.quote).includes(normalize(b.quote)) || normalize(b.quote).includes(normalize(a.quote)));
export function validateClaims(assessment: any, observations: { observationId: string; text: string }[], options: { correctChoice: boolean } = { correctChoice: false }) {
  const fail = (reason: string): never => { throw new Error(`CLAIMS_CONTRACT: ${reason}`); };
  const claims = assessment?.studentClaims;
  if (!Array.isArray(claims) || !claims.length) fail('studentClaims must be nonempty');
  const keys = ['observationId', 'quote', 'claimAsStated', 'sourceCheck', 'sourceBasis'];
  for (const claim of claims) {
    if (!claim || Object.keys(claim).length !== keys.length || keys.some(k => typeof claim[k] !== 'string')
      || !['CONSISTENT', 'CONTRADICTED', 'OFF_TARGET', 'UNDETERMINED'].includes(claim.sourceCheck)) fail('invalid claim structure');
    const text = observations.find(o => o.observationId === claim.observationId)?.text;
    if (typeof text !== 'string' || !normalize(claim.quote) || !normalize(text).includes(normalize(claim.quote))) fail('quote not in observation');
  }
  if (assessment.reconstructability === 'RECONSTRUCTABLE') {
    const contradicted = claims.filter((c: any) => c.sourceCheck === 'CONTRADICTED');
    const offTarget = claims.filter((c: any) => c.sourceCheck === 'OFF_TARGET');
    const errors = assessment.errors;
    if (!Array.isArray(errors)) fail('errors must be an array');
    const matches = (error: any, claim: any) => Array.isArray(error?.studentEvidence)
      && error.studentEvidence.some((e: any) => typeof e?.quote === 'string' && overlaps(e, claim));
    const stated = errors.filter((e: any) => e?.basis !== 'INFERRED');
    const content = stated.filter((e: any) => e?.errorType !== 'TARGET');
    const target = stated.filter((e: any) => e?.errorType === 'TARGET');
    for (const error of errors.filter((e: any) => e?.basis === 'INFERRED'))
      if (!claims.some((c: any) => matches(error, c))) fail('inferred error has no starting claim');
    for (const claim of contradicted) if (!content.some((e: any) => matches(e, claim))) fail('CONTRADICTED claim has no error');
    for (const claim of offTarget) if (!target.some((e: any) => matches(e, claim))) fail('OFF_TARGET claim has no target error');
    for (const error of content) if (!contradicted.some((c: any) => matches(error, c))) fail('error has no CONTRADICTED claim');
    for (const error of target) if (!offTarget.some((c: any) => matches(error, c))) fail('target error has no OFF_TARGET claim');
    if (target.length > 1) fail('at most one target error');
    if (!contradicted.length && !offTarget.length && assessment.contentAssessment === 'ERROR' && !errors.some((e: any) => e?.basis === 'INFERRED')) fail('ERROR without CONTRADICTED or OFF_TARGET claim');
  }
  const conflicts = assessment.claimConflicts;
  if (!Array.isArray(conflicts)) fail('claimConflicts must be an array');
  const conflictKeys = ['observationId', 'firstQuote', 'secondQuote', 'conflict'];
  for (const c of conflicts) {
    if (!c || Object.keys(c).length !== conflictKeys.length || conflictKeys.some(k => typeof c[k] !== 'string')) fail('invalid claimConflict structure');
    const text = observations.find(o => o.observationId === c.observationId)?.text;
    if (typeof text !== 'string' || [c.firstQuote, c.secondQuote].some((q: string) => !normalize(q) || !normalize(text).includes(normalize(q)))) fail('conflict quote not in observation');
    if (overlaps({ observationId: c.observationId, quote: c.firstQuote }, { observationId: c.observationId, quote: c.secondQuote })) fail('conflict quotes overlap');
  }
  if (conflicts.length && (assessment.reconstructability !== 'UNKNOWN' || !Array.isArray(assessment.errors) || assessment.errors.length)) fail('claimConflicts requires UNKNOWN and no errors');
  const coverage = assessment.keyRelationCoverage;
  if (!Array.isArray(coverage) || !coverage.length) fail('keyRelationCoverage must be nonempty');
  const coverageKeys = ['element', 'covered', 'observationId', 'quote'];
  for (const c of coverage) {
    if (!c || Object.keys(c).length !== coverageKeys.length || typeof c.element !== 'string' || typeof c.covered !== 'boolean'
      || typeof c.observationId !== 'string' || typeof c.quote !== 'string') fail('invalid keyRelationCoverage structure');
    if (c.covered) {
      const text = observations.find(o => o.observationId === c.observationId)?.text;
      if (typeof text !== 'string' || !normalize(c.quote) || !normalize(text).includes(normalize(c.quote))) fail('covered element quote not in observation');
    } else if (c.observationId !== '' || c.quote !== '') fail('uncovered element must have empty observationId and quote');
  }
  if (options.correctChoice && assessment.reconstructability === 'RECONSTRUCTABLE' && assessment.contentAssessment === 'SUPPORTED') {
    if (coverage.some((c: any) => !c.covered)) fail('SUPPORTED requires every key relation element covered by a student quote');
    // Two elements at least (source fact, link to the choice's deciding point), each backed by its own part of the student's words.
    if (coverage.length < 2) fail('SUPPORTED requires at least two key relation elements');
    if (coverage.some((a: any, i: number) => coverage.some((b: any, j: number) => i < j && overlaps(a, b)))) fail('SUPPORTED requires non-overlapping quotes for different key relation elements');
  }
  return claims;
}
