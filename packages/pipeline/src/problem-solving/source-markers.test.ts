import { readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { SourceDirectProblemBundleSchema, createSourceDirectProblemEvaluatorInput } from './source-direct-evaluator.js';
import { createSourceDirectProblemRequestContent } from './source-direct-evaluator-runtime.js';
import { createProblemSolvingSession, submitInitialProblemResponse } from './session.js';
import { createFeedbackSession, submitFeedbackCommand, applyFeedbackAssessment } from './feedback-v4.js';
import { feedbackRequestContent } from './feedback-v4-evaluator.js';

const root = 'packages/pipeline/fixtures/experiments';
const read = (p: string) => JSON.parse(readFileSync(p, 'utf8'));
const references = read(`${root}/problem-solving/source-direct-runtime-v1.json`).questions;
const ids: string[] = readdirSync(`${root}/dialogue/passages`).filter(f => f.endsWith('.json'))
  .map(f => read(`${root}/dialogue/passages/${f}`).problemQuestionId).filter(Boolean);
function source(id = 'gongsun-long-later-mohists-q12') {
  const { media, textAnnotations, ...content } = read(`${root}/problem-solving/public/${id}.json`);
  const reference = references.find((r: { questionId: string }) => r.questionId === id);
  return SourceDirectProblemBundleSchema.parse({ schemaVersion: 'source-direct-problem-bundle-v2', ...content,
    textAnnotations, media: media.map(({ alt: _alt, ...m }: Record<string, unknown>) => m),
    stemPolarity: reference.stemPolarity, answerChoiceId: reference.answerChoiceId, officialExplanation: reference.officialExplanation });
}
const decode = (content: Array<Record<string, unknown>>) => JSON.parse(content[0]!.text as string);

describe('원자료 기호 범위', () => {
  it('현재 UI 문항 전체를 포함하고 29개 범위가 저장 원문과 일치한다', () => {
    expect(ids).toHaveLength(6);
    const audit = read('docs/experiments/problem-source-markers-2026-10-02/audit.json');
    expect(audit.rows.map((r: { questionId: string }) => r.questionId).sort()).toEqual([...ids].sort());
    expect(ids.reduce((n, id) => n + source(id).textAnnotations!.length, 0)).toBe(29);
    for (const id of ids) {
      const s = source(id);
      for (const a of s.textAnnotations!) {
        const text = a.location === 'PASSAGE' ? s.passage : s.scenario;
        expect(text.slice(a.start, a.end)).toBe(a.text);
        const recorded = audit.rows.find((r: { questionId: string }) => r.questionId === id).annotations
          .find((r: { location: string; marker: string }) => r.location === a.location && r.marker === a.marker);
        expect([a.start, a.end, a.text]).toEqual([recorded.start, recorded.end, recorded.text]);
      }
    }
  });
  it('공손룡의 반복된 옷 중 원자료의 정확한 ⓒ를 지정한다', () => {
    const s = source();
    const c = s.textAnnotations!.find(a => a.marker === 'ⓒ')!;
    expect(c.location).toBe('SCENARIO');
    expect(s.scenario.slice(c.start - 4, c.end + 5)).toContain('무슨 ⓒ옷이 없어');
    expect(s.scenario).not.toContain('옷장 안에 ⓒ옷');
    expect(s.textAnnotations!.find(a => a.marker === 'ⓔ')!.text).toBe('빨간 옷');
  });
  it('도파민 보기의 명시적 가나다는 원문 항목 범위로만 제공한다', () => {
    const a = source('dopamine-motor-control-q13').textAnnotations!.filter(a => a.location === 'SCENARIO');
    expect(a.map(x => x.marker)).toEqual(['(가)', '(나)', '(다)']);
    expect(a.map(x => x.text.split(':')[0])).toEqual(['레보도파', '카르비도파', '프라미펙솔']);
  });
  it.each(['offset', 'text', 'context', 'duplicate'] as const)('잘못된 %s는 평가 전 거부한다', kind => {
    const s = source();
    const a = s.textAnnotations![0]!;
    if (kind === 'offset') a.end = s.passage.length + 1;
    if (kind === 'text') a.text = '다른 문자열';
    if (kind === 'context') a.contextBefore = '원문에 없는 문맥';
    if (kind === 'duplicate') s.textAnnotations!.push({ ...a });
    expect(() => SourceDirectProblemBundleSchema.parse(s)).toThrow(/기호/);
  });
  it('범위 메타데이터 없는 과거 세션도 보존한다', () => {
    const { textAnnotations: _annotations, ...old } = source();
    expect(SourceDirectProblemBundleSchema.parse(old)).not.toHaveProperty('textAnnotations');
  });
  it.each(ids)('%s의 v3와 v4 실제 요청 JSON에 같은 범위를 전달한다', id => {
    const s = source(id);
    const v3 = submitInitialProblemResponse(createProblemSolvingSession({ sessionId: 'v3', questionId: id,
      answerChoiceId: s.answerChoiceId }), { initialChoiceId: 'C1', rationale: '근거를 제시합니다.' });
    const v3Input = createSourceDirectProblemEvaluatorInput({ evaluationMode: 'DIAGNOSE_PATH', session: v3, source: s });
    const v4 = submitFeedbackCommand(createFeedbackSession('v4', s), { type: 'SELECT', choiceId: 'C1',
      rationale: { mode: 'PROVIDED', text: '근거를 제시합니다.' } }, 'o1');
    for (const payload of [decode(createSourceDirectProblemRequestContent(v3Input)), decode(feedbackRequestContent(v4))]) {
      expect(payload.source.textAnnotations).toEqual(s.textAnnotations);
      expect(payload.sourceTextAnnotationGuide).toContain('UTF-16');
      expect(payload.sourceTextAnnotationGuide).toContain('의미 해석이나 정답 근거를 제공하는 것이 아니다');
    }
  });
  it('v4 교정 후속에도 최초 범위 정보를 유지한다', () => {
    const s = source();
    const text = 'd는 빨간 옷이라고 생각했어요.';
    const first = submitFeedbackCommand(createFeedbackSession('repair', s), { type: 'SELECT', choiceId: 'C4',
      rationale: { mode: 'PROVIDED', text } }, 'o1');
    const studentEvidence = [{ observationId: 'o1', quote: text }];
    const sourceEvidence = [{ location: 'SCENARIO', quote: 'ⓓ옷이 정말 없다는 게 아니라', mediaId: null, visualObservation: null }];
    const questioned = applyFeedbackAssessment(first, { mode: 'SELECTION', boundary: 'NONE', reason: '대응 관계 오류',
      reconstructability: 'RECONSTRUCTABLE', reconstructedPath: ['잘못된 대응'], rationaleImpliedVerdict: 'INVALID',
      contentAssessment: 'ERROR', insufficiencyKind: 'NONE', studentEvidence, sourceEvidence,
      errors: [{ errorId: 'E1', errorType: 'CONTENT', description: '대응 관계 오류', studentEvidence, sourceEvidence, basis: 'STATED', question: 'd의 표현 범위를 확인해 보세요.' }],
      errorHypothesis: null, selectionMismatchQuestion: null, coaching: '표현의 범위를 다시 확인합니다.' });
    const reply = submitFeedbackCommand(questioned, { type: 'CORRECT', errorId: 'E1', text: '색을 한정하지 않은 옷이네요.' }, 'o2');
    const payload = decode(feedbackRequestContent(reply));
    expect(payload.mode).toBe('REPAIR');
    expect(payload.source.textAnnotations).toEqual(s.textAnnotations);
  });
});
