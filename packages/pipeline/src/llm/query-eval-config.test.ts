import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  STUDENT_REGION_EVAL_DEFAULTS,
  TITLE_EVAL_CONFIG,
  evalRequestFingerprint,
  resolveQueryEvaluationConfig,
} from './query-eval.js';

const ORIGINAL = {
  model: process.env['EVAL_MODEL'],
  effort: process.env['EVAL_EFFORT'],
  coverage: process.env['EVAL_PROPOSITION_COVERAGE'],
};

function unsetOverrides(): void {
  delete process.env['EVAL_MODEL'];
  delete process.env['EVAL_EFFORT'];
  delete process.env['EVAL_PROPOSITION_COVERAGE'];
}

beforeEach(unsetOverrides);

afterEach(() => {
  for (const [key, value] of [
    ['EVAL_MODEL', ORIGINAL.model],
    ['EVAL_EFFORT', ORIGINAL.effort],
    ['EVAL_PROPOSITION_COVERAGE', ORIGINAL.coverage],
  ] as const) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

describe('학생 영역 평가 운영 프로필', () => {
  it('환경변수가 없으면 low/off다', () => {
    expect(STUDENT_REGION_EVAL_DEFAULTS).toEqual({ effort: 'low', propositionCoverage: false });
    expect(resolveQueryEvaluationConfig()).toMatchObject({
      model: 'claude-opus-4-8',
      effort: 'low',
      propositionCoverage: false,
    });
    const fingerprint = evalRequestFingerprint();
    expect(fingerprint.systemPrompt).not.toContain('# 명제별 커버리지');
    expect(JSON.stringify(fingerprint.outputFormat)).not.toContain('propositionCoverage');
  });

  it('medium/on 환경변수는 명시적 롤백 경로이며 fingerprint도 분리한다', () => {
    const normal = evalRequestFingerprint();
    process.env['EVAL_EFFORT'] = 'medium';
    process.env['EVAL_PROPOSITION_COVERAGE'] = 'on';
    const rollback = evalRequestFingerprint();

    expect(rollback.effort).toBe('medium');
    expect(rollback.propositionCoverage).toBe(true);
    expect(rollback.systemPrompt).toContain('# 명제별 커버리지');
    expect(rollback).not.toEqual(normal);
  });

  it('타이틀의 명시적 medium/on 프로필은 학생 영역 환경변수와 분리된다', () => {
    process.env['EVAL_EFFORT'] = 'low';
    process.env['EVAL_PROPOSITION_COVERAGE'] = 'off';
    expect(resolveQueryEvaluationConfig(TITLE_EVAL_CONFIG)).toMatchObject({
      effort: 'medium',
      propositionCoverage: true,
    });
  });

  it('잘못된 환경변수를 조용히 기본값으로 되돌리지 않는다', () => {
    process.env['EVAL_EFFORT'] = 'fast';
    expect(() => resolveQueryEvaluationConfig()).toThrow('EVAL_EFFORT가 잘못됐다');
    delete process.env['EVAL_EFFORT'];
    process.env['EVAL_PROPOSITION_COVERAGE'] = 'maybe';
    expect(() => resolveQueryEvaluationConfig()).toThrow('EVAL_PROPOSITION_COVERAGE가 잘못됐다');
  });
});
