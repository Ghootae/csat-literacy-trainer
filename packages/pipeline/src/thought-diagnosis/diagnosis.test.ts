import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import * as v01 from '../../../../scripts/test-thought-diagnosis-v01.mjs';
import {
  THOUGHT_DIAGNOSIS_DIR, THOUGHT_DIAGNOSIS_JSON_SCHEMA, diagnoseThought, jsonHash, loadThoughtDiagnosisPrompts, thoughtDiagnosisRequest,
  validateThoughtDiagnosisOutput,
} from './diagnosis.js';

const read = (name: string) => JSON.parse(readFileSync(`${THOUGHT_DIAGNOSIS_DIR}/${name}`, 'utf8'));
const frozen = read('FROZEN.json'); const prompts = loadThoughtDiagnosisPrompts();
const sources = read('sources.json'); const cases = read('prepared-cases.json') as { id: string; questionId: string; choiceId: string; rationale: string }[];

describe('사고 진단 v0.1 모듈', () => {
  it('지시문·스키마 해시가 동결 자료와 같다', () => {
    expect(jsonHash(prompts)).toBe(frozen.promptsHash);
    expect(jsonHash(THOUGHT_DIAGNOSIS_JSON_SCHEMA)).toBe(frozen.schemaHash);
    expect(THOUGHT_DIAGNOSIS_JSON_SCHEMA).toEqual(frozen.schema);
  });
  it('요청 본문이 스크립트 requestFor와 깊은 비교로 같다(사례 전체)', () => {
    expect(cases.length).toBeGreaterThanOrEqual(3);
    for (const c of cases) {
      const expected = v01.requestFor('gpt-6.1-sol', sources[c.questionId], c, prompts);
      const actual = thoughtDiagnosisRequest(sources[c.questionId], { caseId: c.id, choiceId: c.choiceId, rationale: c.rationale }, prompts.instructions);
      expect(actual).toEqual(expected);
    }
  });
  it('출력 검증이 스크립트 validateOutput과 같은 판정을 한다', () => {
    const gold = read('gold-labels.json').labels as { caseId: string }[];
    for (const label of gold) {
      expect(validateThoughtDiagnosisOutput(label, label.caseId)).toEqual(v01.validateOutput(label, label.caseId));
    }
    const bad = { ...gold[0]!, caseId: 'other' };
    expect(() => validateThoughtDiagnosisOutput(bad, gold[0]!.caseId)).toThrow('CASE_ID');
    expect(() => v01.validateOutput(bad, gold[0]!.caseId)).toThrow();
    expect(() => validateThoughtDiagnosisOutput({ ...gold[0]!, firstFailedStep: 'S1_STEM', steps: { ...(gold[0] as any).steps, S1_STEM: 'PASS' } }, gold[0]!.caseId)).toThrow();
  });
  it('가짜 transport로 호출하고 옳지 않은 응답은 던진다', async () => {
    const c = cases[0]!; const label = (read('gold-labels.json').labels as { caseId: string }[]).find(l => l.caseId === c.id)!;
    const calls: unknown[] = [];
    const transport = { async create(request: unknown) { calls.push(request); return { status: 'completed', output_text: JSON.stringify(label), usage: { input_tokens: 3, output_tokens: 4 } }; } };
    const result = await diagnoseThought(transport as never, sources[c.questionId], { caseId: c.id, choiceId: c.choiceId, rationale: c.rationale }, prompts.instructions);
    expect(result.output.caseId).toBe(c.id); expect(result.metadata).toMatchObject({ model: 'gpt-6.1-sol', inputTokens: 3, outputTokens: 4 }); expect(calls).toHaveLength(1);
    const incomplete = { async create() { return { status: 'incomplete', output_text: '' }; } };
    await expect(diagnoseThought(incomplete as never, sources[c.questionId], { caseId: c.id, choiceId: c.choiceId, rationale: c.rationale }, prompts.instructions)).rejects.toThrow(/RESPONSE_STATUS/);
  });
});
