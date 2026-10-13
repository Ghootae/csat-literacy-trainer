// Port of scripts/lib/v5-marker-judgment.mjs; preserve its JSON contract and validation semantics.
export function extendedSelectionSchema(base: Record<string, any>) {
  const schema = structuredClone(base);
  schema.properties.studentClaims = { type: 'array', minItems: 1, items: {
    type: 'object', additionalProperties: false,
    properties: Object.fromEntries(['observationId', 'quote', 'claimAsStated', 'sourceCheck', 'sourceBasis']
      .map(k => [k, k === 'sourceCheck' ? { type: 'string', enum: ['CONSISTENT', 'CONTRADICTED', 'UNDETERMINED'] } : { type: 'string' }])),
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
      || !['CONSISTENT', 'CONTRADICTED', 'UNDETERMINED'].includes(claim.sourceCheck)) fail('invalid claim structure');
    const text = observations.find(o => o.observationId === claim.observationId)?.text;
    if (typeof text !== 'string' || !normalize(claim.quote) || !normalize(text).includes(normalize(claim.quote))) fail('quote not in observation');
  }
  if (assessment.reconstructability === 'RECONSTRUCTABLE') {
    const contradicted = claims.filter((c: any) => c.sourceCheck === 'CONTRADICTED');
    const errors = assessment.errors;
    if (!Array.isArray(errors)) fail('errors must be an array');
    const matches = (error: any, claim: any) => Array.isArray(error?.studentEvidence)
      && error.studentEvidence.some((e: any) => typeof e?.quote === 'string' && overlaps(e, claim));
    for (const claim of contradicted) if (!errors.some((e: any) => matches(e, claim))) fail('CONTRADICTED claim has no error');
    for (const error of errors) if (!contradicted.some((c: any) => matches(error, c))) fail('error has no CONTRADICTED claim');
    if (!contradicted.length && assessment.contentAssessment === 'ERROR') fail('ERROR without CONTRADICTED claim');
  }
  return claims;
}
