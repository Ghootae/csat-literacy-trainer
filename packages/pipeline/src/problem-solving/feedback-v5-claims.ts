// Port of scripts/lib/v5-marker-judgment.mjs; preserve its JSON contract and validation semantics.
export function extendedSelectionSchema(base: Record<string, any>) {
  const schema = structuredClone(base);
  schema.properties.studentClaims = { type: 'array', minItems: 1, items: {
    type: 'object', additionalProperties: false,
    properties: Object.fromEntries(['observationId', 'quote', 'claimAsStated', 'sourceCheck', 'sourceBasis']
      .map(k => [k, k === 'sourceCheck' ? { type: 'string', enum: ['CONSISTENT', 'CONTRADICTED', 'OFF_TARGET', 'UNDETERMINED'] } : { type: 'string' }])),
    required: ['observationId', 'quote', 'claimAsStated', 'sourceCheck', 'sourceBasis'],
  } };
  schema.required = [...schema.required, 'studentClaims'];
  return schema;
}
const normalize = (text: string) => text.replace(/\s+/gu, ' ').trim();
const overlaps = (a: { observationId: string; quote: string }, b: { observationId: string; quote: string }) => a.observationId === b.observationId && normalize(a.quote) && normalize(b.quote)
  && (normalize(a.quote).includes(normalize(b.quote)) || normalize(b.quote).includes(normalize(a.quote)));
export function validateClaims(assessment: any, observations: { observationId: string; text: string }[]) {
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
  return claims;
}
