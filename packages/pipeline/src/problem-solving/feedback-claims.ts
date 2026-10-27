// Port of scripts/lib/v5-marker-judgment.mjs; preserve its JSON contract and validation semantics.
// claimConflicts·choiceReading·ground·judgment는 TS 쪽에만 있음(2026-10-27).
const QUOTE_REF = { type: 'object', additionalProperties: false,
  properties: { observationId: { type: 'string' }, quote: { type: 'string' } }, required: ['observationId', 'quote'] };
const RELATIONS = ['UNTOUCHED', 'EXACT', 'BLANK_FILLED', 'WEAKER', 'STRONGER', 'ADDED', 'REVERSED', 'OTHER_TARGET'] as const;
const GROUND_KINDS = ['FACT', 'CONCLUSION_RESTATED', 'JUDGMENT_METHOD', 'NONE'] as const;
const SOURCE_CHECKS = ['CONSISTENT', 'CONTRADICTED', 'OFF_TARGET', 'UNDETERMINED', 'CHOICE_READING'];
const strictObject = (properties: Record<string, any>) => ({ type: 'object', additionalProperties: false, properties, required: Object.keys(properties) });
export function extendedSelectionSchema(base: Record<string, any>) {
  const schema = structuredClone(base);
  // The three cells (choiceReading, ground, judgment) follow claimConflicts and precede every judgment field, so they go first.
  schema.properties = { claimConflicts: { type: 'array', items: {
    type: 'object', additionalProperties: false,
    properties: Object.fromEntries(['observationId', 'firstQuote', 'secondQuote', 'conflict'].map(k => [k, { type: 'string' }])),
    required: ['observationId', 'firstQuote', 'secondQuote', 'conflict'],
  } }, choiceReading: strictObject({ claims: { type: 'array', minItems: 1, items: strictObject({
    claimId: { type: 'string' }, choiceText: { type: 'string' }, studentReading: { type: 'string' },
    relation: { type: 'string', enum: [...RELATIONS] },
    readingQuote: { anyOf: [QUOTE_REF, { type: 'null' }] },
    blanks: { type: 'array', items: strictObject({
      slot: { type: 'string' }, candidates: { type: 'array', minItems: 1, items: { type: 'string' } }, chosen: { type: 'string' },
      cue: { anyOf: [QUOTE_REF, { type: 'null' }] },
    }) },
  }) } }), ground: strictObject({
    kind: { type: 'string', enum: [...GROUND_KINDS] }, observationId: { type: 'string' }, quote: { type: 'string' },
  }), judgment: strictObject({
    verdict: { type: 'string', enum: ['VALID', 'INVALID', 'NONE'] }, targetClaimIds: { type: 'array', items: { type: 'string' } },
    contradiction: { type: 'string' }, holds: { type: 'boolean' },
  }), ...schema.properties };
  // readingSummary is written by the server after validation; the model never produces it.
  delete schema.properties.readingSummary;
  schema.properties.studentClaims = { type: 'array', minItems: 1, items: {
    type: 'object', additionalProperties: false,
    properties: Object.fromEntries(['observationId', 'quote', 'claimAsStated', 'sourceCheck', 'sourceBasis']
      .map(k => [k, k === 'sourceCheck' ? { type: 'string', enum: SOURCE_CHECKS } : { type: 'string' }])),
    required: ['observationId', 'quote', 'claimAsStated', 'sourceCheck', 'sourceBasis'],
  } };
  schema.required = [...schema.required, 'claimConflicts', 'choiceReading', 'ground', 'judgment', 'studentClaims'];
  return schema;
}
const normalize = (text: string) => text.replace(/\s+/gu, ' ').trim();
export const overlaps = (a: { observationId: string; quote: string }, b: { observationId: string; quote: string }) => a.observationId === b.observationId && normalize(a.quote) && normalize(b.quote)
  && (normalize(a.quote).includes(normalize(b.quote)) || normalize(b.quote).includes(normalize(a.quote)));
export interface ClaimsOptions { correctChoice: boolean; targetVerdict: 'VALID' | 'INVALID'; choiceText: string }
// Three cells decide reconstructability; correct-choice sufficiency is checked from them (supersedes D-0161).
export function validateClaims(assessment: any, observations: { observationId: string; text: string }[], options: ClaimsOptions) {
  const fail = (reason: string): never => { throw new Error(`CLAIMS_CONTRACT: ${reason}`); };
  const claims = assessment?.studentClaims;
  if (!Array.isArray(claims) || !claims.length) fail('studentClaims must be nonempty');
  const keys = ['observationId', 'quote', 'claimAsStated', 'sourceCheck', 'sourceBasis'];
  for (const claim of claims) {
    if (!claim || Object.keys(claim).length !== keys.length || keys.some(k => typeof claim[k] !== 'string')
      || !SOURCE_CHECKS.includes(claim.sourceCheck)) fail('invalid claim structure');
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
    const content = stated.filter((e: any) => e?.errorType !== 'TARGET' && e?.errorType !== 'READING');
    const target = stated.filter((e: any) => e?.errorType === 'TARGET');
    const reading = errors.filter((e: any) => e?.errorType === 'READING');
    if (reading.length && options.correctChoice) fail('READING error is only for a wrong choice');
    if (reading.some((e: any) => e?.basis === 'INFERRED')) fail('READING error must be STATED');
    for (const error of errors.filter((e: any) => e?.basis === 'INFERRED'))
      if (!claims.some((c: any) => matches(error, c))) fail('inferred error has no starting claim');
    for (const claim of contradicted) if (!content.some((e: any) => matches(e, claim))) fail('CONTRADICTED claim has no error');
    for (const claim of offTarget) if (!target.some((e: any) => matches(e, claim))) fail('OFF_TARGET claim has no target error');
    for (const error of content) if (!contradicted.some((c: any) => matches(error, c))) fail('error has no CONTRADICTED claim');
    for (const error of target) if (!offTarget.some((c: any) => matches(error, c))) fail('target error has no OFF_TARGET claim');
    if (target.length > 1) fail('at most one target error');
    if (!contradicted.length && !offTarget.length && assessment.contentAssessment === 'ERROR' && !reading.length && !errors.some((e: any) => e?.basis === 'INFERRED')) fail('ERROR without CONTRADICTED or OFF_TARGET claim');
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
  const cells = validateCells(assessment, observations, options, fail);
  if (!conflicts.length && (assessment.boundary ?? 'NONE') === 'NONE') {
    const reconstructable = cells.touched.length >= 1 && assessment.ground.kind !== 'NONE' && assessment.judgment.verdict !== 'NONE';
    if (reconstructable !== (assessment.reconstructability === 'RECONSTRUCTABLE')) fail('reconstructability must follow the three cells');
    if (reconstructable && assessment.rationaleImpliedVerdict !== assessment.judgment.verdict) fail('rationaleImpliedVerdict must equal judgment.verdict');
  }
  for (const error of Array.isArray(assessment.errors) ? assessment.errors.filter((e: any) => e?.errorType === 'READING') : []) {
    if (!cells.touched.some((c: any) => ['STRONGER', 'WEAKER', 'ADDED', 'REVERSED'].includes(c.relation) && Array.isArray(error?.studentEvidence)
      && error.studentEvidence.some((e: any) => typeof e?.quote === 'string' && overlaps(e, c.readingQuote)))) fail('READING error has no matching choiceReading claim');
  }
  const judged = readingJudgment(assessment, options);
  if (judged && (assessment.contentAssessment === 'SUPPORTED' || assessment.contentAssessment === 'INSUFFICIENT')) {
    if ((assessment.contentAssessment === 'SUPPORTED') !== judged.supported) fail(judged.supported
      ? 'three cells support the choice, so contentAssessment must be SUPPORTED' : 'SUPPORTED requires the three cells to meet the sufficiency criteria');
    if (!judged.supported && assessment.insufficiencyKind !== judged.insufficiencyKind) fail(`insufficiencyKind must be ${judged.insufficiencyKind} for this ground`);
  }
  return claims;
}

type Ref = { observationId: string; quote: string };
const AMBIGUOUS_MIN = 2;
const distinctCandidates = (blank: any) => new Set(blank.candidates.map(normalize)).size;
function validateCells(assessment: any, observations: { observationId: string; text: string }[], options: ClaimsOptions, fail: (reason: string) => never) {
  const quoteIn = (ref: any): boolean => {
    const text = observations.find(o => o.observationId === ref?.observationId)?.text;
    return typeof text === 'string' && typeof ref.quote === 'string' && !!normalize(ref.quote) && normalize(text).includes(normalize(ref.quote));
  };
  const inChoice = (t: unknown): boolean => typeof t === 'string' && !!normalize(t) && normalize(options.choiceText).includes(normalize(t));
  const exactKeys = (o: any, keys: string[]) => !!o && typeof o === 'object' && !Array.isArray(o) && Object.keys(o).length === keys.length && keys.every(k => k in o);
  const refOrNull = (v: any, what: string) => {
    if (v === null) return;
    if (!exactKeys(v, ['observationId', 'quote']) || typeof v.observationId !== 'string' || typeof v.quote !== 'string') fail(`invalid ${what} structure`);
    if (!quoteIn(v)) fail(`${what} not in observation`);
  };
  const reading = assessment.choiceReading;
  if (!exactKeys(reading, ['claims']) || !Array.isArray(reading.claims) || !reading.claims.length) fail('choiceReading.claims must be nonempty');
  const ids = new Set<string>();
  for (const c of reading.claims) {
    if (!exactKeys(c, ['claimId', 'choiceText', 'studentReading', 'relation', 'readingQuote', 'blanks'])
      || typeof c.claimId !== 'string' || typeof c.choiceText !== 'string' || typeof c.studentReading !== 'string'
      || !(RELATIONS as readonly string[]).includes(c.relation) || !Array.isArray(c.blanks)) fail('invalid choiceReading claim structure');
    if (!c.claimId || ids.has(c.claimId)) fail('claimId must be unique');
    ids.add(c.claimId);
    if (!inChoice(c.choiceText)) fail('choiceText not in the chosen choice');
    refOrNull(c.readingQuote, 'readingQuote');
    if (c.relation === 'UNTOUCHED') {
      if (normalize(c.studentReading) || c.readingQuote !== null || c.blanks.length) fail('UNTOUCHED claim must have empty studentReading, null readingQuote and no blanks');
    } else if (!normalize(c.studentReading) || c.readingQuote === null) fail('touched claim needs studentReading and readingQuote');
    for (const b of c.blanks) {
      if (!exactKeys(b, ['slot', 'candidates', 'chosen', 'cue']) || typeof b.slot !== 'string' || typeof b.chosen !== 'string'
        || !Array.isArray(b.candidates) || !b.candidates.length) fail('invalid blank structure');
      if (!b.candidates.every(inChoice) || !inChoice(b.chosen)) fail('blank candidates and chosen must be words of the chosen choice');
      if (!b.candidates.some((x: string) => normalize(x) === normalize(b.chosen))) fail('blank chosen must be one of its candidates');
      refOrNull(b.cue, 'cue');
      if (!options.correctChoice && distinctCandidates(b) >= AMBIGUOUS_MIN) fail('an ambiguous blank is not allowed on a wrong choice');
    }
    if (c.blanks.length && c.relation === 'EXACT') fail('a claim with blanks cannot be EXACT');
  }
  const ground = assessment.ground;
  if (!exactKeys(ground, ['kind', 'observationId', 'quote']) || !(GROUND_KINDS as readonly string[]).includes(ground.kind)
    || typeof ground.observationId !== 'string' || typeof ground.quote !== 'string') fail('invalid ground structure');
  if (ground.kind === 'NONE' ? ground.observationId !== '' || ground.quote !== '' : !quoteIn(ground)) fail(ground.kind === 'NONE' ? 'ground NONE must have empty observationId and quote' : 'ground quote not in observation');
  const judgment = assessment.judgment;
  if (!exactKeys(judgment, ['verdict', 'targetClaimIds', 'contradiction', 'holds']) || !['VALID', 'INVALID', 'NONE'].includes(judgment.verdict)
    || !Array.isArray(judgment.targetClaimIds) || judgment.targetClaimIds.some((x: unknown) => typeof x !== 'string')
    || typeof judgment.contradiction !== 'string' || typeof judgment.holds !== 'boolean') fail('invalid judgment structure');
  const touched = reading.claims.filter((c: any) => c.relation !== 'UNTOUCHED');
  for (const id of judgment.targetClaimIds) if (!touched.some((c: any) => c.claimId === id)) fail('judgment target must be a touched choiceReading claim');
  if (judgment.verdict === 'NONE' ? judgment.targetClaimIds.length || normalize(judgment.contradiction)
    : !judgment.targetClaimIds.length || !normalize(judgment.contradiction)) fail('judgment verdict NONE must have no targets and no contradiction, otherwise both');
  return { touched };
}

/** Sufficiency of a correct choice from the three cells; null when it does not apply (wrong choice, UNKNOWN, other verdict direction). */
function readingJudgment(assessment: any, options: ClaimsOptions) {
  if (!options.correctChoice || assessment.reconstructability !== 'RECONSTRUCTABLE' || assessment.contentAssessment === 'ERROR') return null;
  const { claims } = assessment.choiceReading; const { ground, judgment } = assessment;
  if (judgment.verdict !== options.targetVerdict) return null;
  const negative = options.targetVerdict === 'INVALID';
  const relationOk = (c: any) => (negative ? ['EXACT', 'BLANK_FILLED', 'WEAKER'] : ['EXACT', 'BLANK_FILLED', 'STRONGER', 'ADDED']).includes(c.relation);
  const blankOk = (c: any) => { const ambiguous = c.blanks.filter((b: any) => distinctCandidates(b) >= AMBIGUOUS_MIN); return ambiguous.length <= 1 && ambiguous.every((b: any) => b.cue !== null); };
  // An ambiguous blank's cue stands in for the reading quote; otherwise the reading quote itself must be apart from the ground.
  const separated = (c: any) => { const cues = c.blanks.filter((b: any) => distinctCandidates(b) >= AMBIGUOUS_MIN && b.cue !== null);
    return cues.length ? cues.every((b: any) => !overlaps(b.cue as Ref, ground)) : !overlaps(c.readingQuote as Ref, ground); };
  const fits = (c: any) => relationOk(c) && blankOk(c);
  const touched = claims.filter((c: any) => c.relation !== 'UNTOUCHED');
  const targets = touched.filter((c: any) => judgment.targetClaimIds.includes(c.claimId));
  const groundClaims = (assessment.studentClaims as any[]).filter(c => overlaps(c, ground));
  const claimsOk = negative ? targets.some((c: any) => fits(c) && separated(c)) : touched.length === claims.length && touched.every((c: any) => fits(c) && separated(c));
  const supported = ground.kind === 'FACT' && groundClaims.length > 0 && groundClaims.every(c => c.sourceCheck === 'CONSISTENT') && claimsOk && judgment.holds;
  const fitsAny = negative ? targets.some(fits) : false;
  const insufficiencyCase = supported ? null
    : ground.kind === 'CONCLUSION_RESTATED' ? 'CONCLUSION_ONLY'
    : ground.kind === 'JUDGMENT_METHOD' ? 'JUDGMENT_METHOD'
    : (negative ? !fitsAny && targets.some((c: any) => ['STRONGER', 'ADDED'].includes(c.relation)) : touched.some((c: any) => c.relation === 'WEAKER')) ? 'READING_GAP'
    : (negative ? !fitsAny && targets.some((c: any) => relationOk(c) && !blankOk(c)) : touched.some((c: any) => relationOk(c) && !blankOk(c))) ? 'BLANK_UNSUPPORTED'
    : !negative && touched.length < claims.length ? 'PARTIAL_SUPPORT'
    : 'MISSING_LINK';
  const insufficiencyKind = ['CONCLUSION_RESTATED', 'JUDGMENT_METHOD'].includes(ground.kind) ? 'JUDGMENT_METHOD' : 'MISSING_LINK';
  return { supported, insufficiencyCase, insufficiencyKind };
}

/** What the end explanation keeps of the three cells; stored on the SELECTION assessment, never requested from the model. */
export function readingSummary(assessment: any, options: ClaimsOptions) {
  return {
    insufficiencyCase: readingJudgment(assessment, options)?.insufficiencyCase ?? null,
    readings: assessment.choiceReading.claims.filter((c: any) => c.relation !== 'UNTOUCHED')
      .map((c: any) => ({ choiceText: c.choiceText, studentReading: c.studentReading, relation: c.relation })),
  };
}
