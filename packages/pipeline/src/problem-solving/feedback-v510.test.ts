import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { z } from 'zod/v4';
import { extendedSelectionSchema, normalizeCells, readingSummary, settleConclusion, validateClaims, type ClaimsOptions } from './feedback-claims.js';
import { FeedbackSelectionAssessmentSchema, createFeedbackSession, submitFeedbackCommand as submit } from './feedback.js';
import { feedbackEvaluationInput } from './feedback-evaluator.js';
import type { SourceDirectProblemBundle } from './source-direct-evaluator.js';

// v5.10 judgment rules (D-0214): sufficiency on the supported target only, LOCATION_ONLY ground, lenient-item raise.
const GOLD = '경마식 보도는 선거와 정치에 무관심한 유권자들의 선거 참여, 정치 참여를 독려하는 장점이 있다.';
const PASSAGE = `경마식 보도는 선거일이 가까워질수록 증가한다. ${GOLD} 그러나 공정성을 저해할 수 있다.`;
const CHOICE = '정치에 무관심한 유권자의 참여를 독려한다. 선거일이 가까워질수록 늘어난다.';
const C1 = '정치에 무관심한 유권자의 참여를 독려한다.';
const C2 = '선거일이 가까워질수록 늘어난다.';
const TEXT = '참여를 독려하는 장점이 있다고 했으니까 맞는 말이야. 1문단 어딘가에 나와.';
const READ = '참여를 독려하는 장점';
const GROUND_QUOTE = '참여를 독려하는 장점이 있다고 했으니까';
const WHERE = '1문단 어딘가에 나와';
const obs = [{ observationId: 'o1', text: TEXT }];
const reading = (claimId: string, choiceText: string, relation: string) => ({ claimId, choiceText,
  studentReading: relation === 'UNTOUCHED' ? '' : '읽은 뜻', relation, readingQuote: relation === 'UNTOUCHED' ? null : { observationId: 'o1', quote: READ }, blanks: [] });
const ref = (quote: string) => ({ observationId: 'o1', quote });
function make(over: any = {}, rules: 'v5.8' | 'v5.10' = 'v5.10') {
  const ground = { kind: 'FACT', ...ref(GROUND_QUOTE), ...(rules === 'v5.10' ? { locatedSource: null } : {}), ...over.ground };
  const { ground: _g, ...rest } = over;
  return { boundary: 'NONE', reconstructability: 'RECONSTRUCTABLE', rationaleImpliedVerdict: 'VALID', contentAssessment: 'INSUFFICIENT', insufficiencyKind: 'MISSING_LINK',
    claimConflicts: [], errors: [], sourceEvidence: [{ location: 'PASSAGE', quote: GOLD }],
    studentClaims: [{ ...ref(GROUND_QUOTE), claimAsStated: '장점이 있다', sourceCheck: 'CONSISTENT', sourceBasis: '대조' }],
    choiceReading: { claims: [reading('c1', C1, 'EXACT'), reading('c2', C2, 'UNTOUCHED')] }, ground,
    judgment: { verdict: 'VALID', targetClaimIds: ['c1'], contradiction: '지점', holds: true }, ...rest };
}
const opts = (rules: 'v5.8' | 'v5.10', over: Partial<ClaimsOptions> = {}): ClaimsOptions => ({ correctChoice: true, targetVerdict: 'VALID', choiceText: CHOICE,
  ...(rules === 'v5.10' ? { rules, passage: PASSAGE, scenario: '' } : {}), ...over });
function run(a: any, o: ClaimsOptions) {
  const n = normalizeCells(a, o); const s = settleConclusion(n.assessment, obs, o);
  validateClaims(s.assessment, obs, o);
  return { a: s.assessment, notes: [...n.notes, ...s.notes], summary: readingSummary(s.assessment, o) };
}
const lenient = { supportSentences: [GOLD] };

describe('v5.10 schema', () => {
  const base = z.toJSONSchema(FeedbackSelectionAssessmentSchema);
  it('v5.8 (default) schema is unchanged and v5.10 adds LOCATION_ONLY and locatedSource', () => {
    const v58 = extendedSelectionSchema(base); const ground = v58.properties.ground;
    expect(JSON.stringify(extendedSelectionSchema(base, 'v5.8'))).toBe(JSON.stringify(v58));
    expect(Object.keys(ground.properties)).toEqual(['kind', 'observationId', 'quote']);
    expect(ground.properties.kind.enum).toEqual(['FACT', 'CONCLUSION_RESTATED', 'JUDGMENT_METHOD', 'NONE']);
    const g = extendedSelectionSchema(base, 'v5.10').properties.ground;
    expect(g.properties.kind.enum).toContain('LOCATION_ONLY');
    expect(g.properties.locatedSource).toEqual({ anyOf: [{ type: 'string' }, { type: 'null' }] });
    expect(g.required).toContain('locatedSource'); expect(g.additionalProperties).toBe(false);
  });
});

describe('v5.10 sufficiency on the supported target', () => {
  it('one EXACT target with the other claim UNTOUCHED is SUPPORTED; v5.8 is INSUFFICIENT PARTIAL_SUPPORT', () => {
    const sup = { contentAssessment: 'SUPPORTED', insufficiencyKind: 'NONE' };
    const r = run(make(sup), opts('v5.10'));
    expect(r.a).toMatchObject({ contentAssessment: 'SUPPORTED', insufficiencyKind: 'NONE' });
    const old = run(make(sup, 'v5.8'), opts('v5.8'));
    expect(old.a).toMatchObject({ contentAssessment: 'INSUFFICIENT', insufficiencyKind: 'MISSING_LINK' });
    expect(old.summary.insufficiencyCase).toBe('PARTIAL_SUPPORT');
  });
  it('no targets or holds false is INSUFFICIENT and not PARTIAL_SUPPORT', () => {
    const o = opts('v5.10');
    const noTargets = make({ judgment: { verdict: 'VALID', targetClaimIds: [], contradiction: '지점', holds: true } });
    const s = readingSummary(noTargets, o).insufficiencyCase;
    expect(s).not.toBeNull(); expect(s).not.toBe('PARTIAL_SUPPORT');
    const r = run(make({ contentAssessment: 'SUPPORTED', insufficiencyKind: 'NONE', judgment: { verdict: 'VALID', targetClaimIds: ['c1'], contradiction: '지점', holds: false } }), o);
    expect(r.a.contentAssessment).toBe('INSUFFICIENT'); expect(r.summary.insufficiencyCase).not.toBe('PARTIAL_SUPPORT');
  });
  it('a touched claim that does not fit still blocks a true choice', () => {
    const a = make({ choiceReading: { claims: [reading('c1', C1, 'EXACT'), reading('c2', C2, 'WEAKER')] } });
    expect(run(a, opts('v5.10')).a.contentAssessment).toBe('INSUFFICIENT');
  });
  it('a false-choice judgment is the same under both rules', () => {
    for (const relation of ['EXACT', 'STRONGER']) {
      const mk = (rules: 'v5.8' | 'v5.10') => make({ rationaleImpliedVerdict: 'INVALID', judgment: { verdict: 'INVALID', targetClaimIds: ['c1'], contradiction: '지점', holds: true },
        choiceReading: { claims: [reading('c1', C1, relation), reading('c2', C2, 'UNTOUCHED')] } }, rules);
      const [a, b] = (['v5.8', 'v5.10'] as const).map(rules => run(mk(rules), opts(rules, { targetVerdict: 'INVALID' })));
      expect(a!.a.contentAssessment).toBe(b!.a.contentAssessment);
      expect(a!.a.insufficiencyKind).toBe(b!.a.insufficiencyKind);
      expect(a!.summary.insufficiencyCase).toBe(b!.summary.insufficiencyCase);
    }
  });
});

describe('v5.10 LOCATION_ONLY ground', () => {
  it('locatedSource must be in the passage or scenario', () => {
    const ok = make({ ground: { kind: 'LOCATION_ONLY', ...ref(WHERE), locatedSource: GOLD } });
    expect(() => validateClaims(settleConclusion(ok, obs, opts('v5.10')).assessment, obs, opts('v5.10'))).not.toThrow();
    const bad = make({ ground: { kind: 'LOCATION_ONLY', ...ref(WHERE), locatedSource: '원문에 없는 문장이다.' } });
    expect(() => run(bad, opts('v5.10'))).toThrow(/CLAIMS_CONTRACT/);
  });
  it('is CONCLUSION_ONLY with JUDGMENT_METHOD and conclusionOnly', () => {
    const r = run(make({ ground: { kind: 'LOCATION_ONLY', ...ref(WHERE) } }), opts('v5.10'));
    expect(r.a).toMatchObject({ contentAssessment: 'INSUFFICIENT', insufficiencyKind: 'JUDGMENT_METHOD' });
    expect(r.summary).toMatchObject({ insufficiencyCase: 'CONCLUSION_ONLY', conclusionOnly: true });
  });
  it('locatedSource on another ground kind is normalized to null with a note', () => {
    const n = normalizeCells(make({ ground: { locatedSource: GOLD } }), opts('v5.10'));
    expect(n.assessment.ground.locatedSource).toBeNull();
    expect(n.notes.some(x => x.includes('locatedSource'))).toBe(true);
  });
});

describe('v5.10 lenient raise (D-0214)', () => {
  const restated = (over: any = {}) => make({ ground: { kind: 'CONCLUSION_RESTATED', ...ref('맞는 말이야') },
    choiceReading: { claims: [reading('c1', C1, 'EXACT'), reading('c2', C2, 'EXACT')] }, insufficiencyKind: 'JUDGMENT_METHOD', ...over });
  const located = (source: string | null) => make({ ground: { kind: 'LOCATION_ONLY', ...ref(WHERE), locatedSource: source }, insufficiencyKind: 'JUDGMENT_METHOD' });
  const o = opts('v5.10', { lenient });
  it('(a) whole-choice restatement is raised with a note', () => {
    const r = run(restated(), o);
    expect(r.a).toMatchObject({ contentAssessment: 'SUPPORTED', insufficiencyKind: 'NONE' });
    expect(r.notes).toContain('contentAssessment raised to SUPPORTED: lenient item (D-0214), RESTATED_WHOLE_CHOICE, model said INSUFFICIENT/JUDGMENT_METHOD');
  });
  it('(b) the gold sentence is raised; a paragraph only (null) or another sentence is not', () => {
    const r = run(located(GOLD), o);
    expect(r.a.contentAssessment).toBe('SUPPORTED');
    expect(r.notes.some(x => x.includes('LOCATED_SUPPORT_SENTENCE, model said INSUFFICIENT/JUDGMENT_METHOD'))).toBe(true);
    expect(run(located(null), o).a.contentAssessment).toBe('INSUFFICIENT');
    expect(run(located('경마식 보도는 선거일이 가까워질수록 증가한다.'), o).a.contentAssessment).toBe('INSUFFICIENT');
  });
  it('(c) no lenient marker, (d) partial restatement and (e) an error do not raise', () => {
    expect(run(restated(), opts('v5.10')).a.contentAssessment).toBe('INSUFFICIENT');
    expect(run(restated({ choiceReading: { claims: [reading('c1', C1, 'EXACT'), reading('c2', C2, 'UNTOUCHED')] } }), o).a.contentAssessment).toBe('INSUFFICIENT');
    const withError = restated({ errors: [{ errorId: 'E1', errorType: 'CONTENT', basis: 'INFERRED', studentEvidence: [ref('맞는 말이야')] }] });
    const s = settleConclusion(withError, obs, o).assessment;
    expect(s.contentAssessment).toBe('INSUFFICIENT');
  });
  it('v5.8 never raises even with a lenient marker', () => {
    const a = make({ ground: { kind: 'CONCLUSION_RESTATED', ...ref('맞는 말이야') }, choiceReading: { claims: [reading('c1', C1, 'EXACT'), reading('c2', C2, 'EXACT')] }, insufficiencyKind: 'JUDGMENT_METHOD' }, 'v5.8');
    expect(run(a, opts('v5.8', { lenient })).a.contentAssessment).toBe('INSUFFICIENT');
  });
});

describe('lenientCorrect data', () => {
  const bundle = { schemaVersion: 'source-direct-problem-bundle-v2', questionId: 'Q', questionNumber: 1, passageId: 'P', title: 't', exam: 'e', passage: PASSAGE,
    stem: '맞는 것은?', stemPolarity: 'SELECT_CORRECT', scenario: '', media: [], choices: [{ choiceId: 'C1', position: 1, text: C1 }, { choiceId: 'C2', position: 2, text: C2 }],
    answerChoiceId: 'C1', officialExplanation: '해설', lenientCorrect: lenient } as SourceDirectProblemBundle;
  it('is removed from the judge input', () => {
    let s = createFeedbackSession('S', bundle);
    s = submit(s, { type: 'SELECT', choiceId: 'C1', rationale: { mode: 'PROVIDED', text: '맞는 말이야' } }, 'o1');
    expect(feedbackEvaluationInput(s).source).not.toHaveProperty('lenientCorrect');
    expect(s.source.lenientCorrect).toEqual(lenient);
  });
  it('runtime reference sentences are in their passages', () => {
    const dir = 'packages/pipeline/fixtures/experiments/sns-diagnostic/';
    const catalog = JSON.parse(readFileSync(dir + 'runtime-reference.json', 'utf8'));
    for (const [id, file] of [['horse-race-reporting-q4', 'horse-race-reporting'], ['audio-perceptual-coding-q15', 'audio-perceptual-coding']] as const) {
      const q = catalog.questions.find((x: any) => x.questionId === id);
      const passage = readFileSync(`${dir}passages/${file}.json`, 'utf8');
      expect(q.lenientCorrect.supportSentences).toHaveLength(1);
      for (const sentence of q.lenientCorrect.supportSentences) expect(passage.replace(/\s+/gu, ' ')).toContain(sentence);
    }
  });
});
