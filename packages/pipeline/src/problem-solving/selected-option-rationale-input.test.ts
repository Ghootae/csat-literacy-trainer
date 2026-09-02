import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import { ProblemQuestionGoldSchema, type ProblemQuestionGold } from './gold.js';
import {
  allowedSelectedOptionRationaleRefs,
  createSelectedOptionRationaleInput,
  validateSelectedOptionRationaleOutput,
} from './selected-option-rationale-input.js';

function fixture(name: string): ProblemQuestionGold {
  return ProblemQuestionGoldSchema.parse(JSON.parse(readFileSync(resolve(
    process.cwd(),
    'packages/pipeline/fixtures/experiments/problem-solving',
    name,
  ), 'utf8')));
}

describe('selected option rationale input', () => {
  const rationale = 'pH가 높아져도 크기 감소는 지문에서 도출되지 않는다.';

  it('전체 골드 기준군에서도 대표 오답 경로와 보충 해설은 제거한다', () => {
    const { input, auditManifest } = createSelectedOptionRationaleInput({
      arm: 'BASELINE_FULL_GOLD',
      gold: fixture('mrna-vaccine-lipid-nanoparticle-q19.json'),
      selectedChoiceId: 'C5',
      studentRationale: rationale,
    });
    expect(input.arm).toBe('BASELINE_FULL_GOLD');
    expect(input.sufficiencyPolicy.groundSetScope)
      .toBe('NON_EXHAUSTIVE_ALLOW_SOURCE_GROUNDED_ALTERNATIVES');
    expect(auditManifest).toBeNull();
    const serialized = JSON.stringify(input);
    expect(serialized).not.toContain('representativeWrongPaths');
    expect(serialized).not.toContain('supplementalExplanationInferences');
  });

  it('슬라이스군 모델 입력에는 선택 선지 포함 manifest만 넣고 excluded 감사 로그는 분리한다', () => {
    const gold = { ...fixture('mrna-vaccine-lipid-nanoparticle-q19.json'), reviewStatus: 'candidate' as const };
    const { input, auditManifest } = createSelectedOptionRationaleInput({
      arm: 'SELECTED_OPTION_COMPLETE',
      gold,
      selectedChoiceId: 'C5',
      studentRationale: rationale,
      experimentAuditId: 'EXPERIMENT-MRNA-C5',
    });
    expect(input.arm).toBe('SELECTED_OPTION_COMPLETE');
    expect(input.sufficiencyPolicy.groundSetScope)
      .toBe('EXHAUSTIVE_WITHIN_INCLUDED_SLICE');
    expect(input.evaluationContext.profile).toBe('CORRECT_REJECTED');
    expect(auditManifest?.excluded.some((item) => item.id === 'OC1-1')).toBe(true);
    const serialized = JSON.stringify(input);
    expect(serialized).not.toContain('excluded');
    expect(serialized).not.toContain('answerChoiceId');
    expect(serialized).not.toContain('fallbackSupplementalInferenceIds');
  });

  it('학생 원문 인용과 골드 참조를 결정적으로 검증한다', () => {
    const { input } = createSelectedOptionRationaleInput({
      arm: 'SELECTED_OPTION_COMPLETE',
      gold: fixture('mrna-vaccine-lipid-nanoparticle-q19.json'),
      selectedChoiceId: 'C5',
      studentRationale: rationale,
      experimentAuditId: 'EXPERIMENT-MRNA-C5',
    });
    const valid = {
      outputVersion: 'selected-option-rationale-output-v1',
      rationaleAssessment: 'SUPPORTED',
      reason: '결정적 비정당화 근거를 포착했다.',
      evidenceFindings: [{
        studentQuote: '크기 감소는 지문에서 도출되지 않는다',
        relationToGold: 'MATCHES',
        decisionRelevance: 'DECISIVE',
        sourceRefs: ['II4'],
      }],
    };
    expect(validateSelectedOptionRationaleOutput(valid, input).rationaleAssessment)
      .toBe('SUPPORTED');
    expect(() => validateSelectedOptionRationaleOutput({
      ...valid,
      evidenceFindings: [{
        ...valid.evidenceFindings[0],
        studentQuote: '학생이 쓰지 않은 문장',
      }],
    }, input)).toThrow(/학생 원문에 없는 인용/);
    expect(() => validateSelectedOptionRationaleOutput({
      ...valid,
      evidenceFindings: [{
        ...valid.evidenceFindings[0],
        sourceRefs: ['OC1-1'],
      }],
    }, input)).toThrow(/허용되지 않은 골드 참조/);
  });

  it('혼합 근거에서 결정적 충돌을 SUPPORTED로 덮지 못하게 한다', () => {
    const { input } = createSelectedOptionRationaleInput({
      arm: 'SELECTED_OPTION_COMPLETE',
      gold: fixture('mrna-vaccine-lipid-nanoparticle-q19.json'),
      selectedChoiceId: 'C5',
      studentRationale: rationale,
      experimentAuditId: 'EXPERIMENT-MRNA-C5',
    });
    expect(() => validateSelectedOptionRationaleOutput({
      outputVersion: 'selected-option-rationale-output-v1',
      rationaleAssessment: 'SUPPORTED',
      reason: '일치와 충돌이 섞여 있다.',
      evidenceFindings: [
        {
          studentQuote: '지문에서 도출되지 않는다',
          relationToGold: 'MATCHES',
          decisionRelevance: 'DECISIVE',
          sourceRefs: ['II4'],
        },
        {
          studentQuote: 'pH가 높아져도',
          relationToGold: 'CONFLICTS',
          decisionRelevance: 'DECISIVE',
          sourceRefs: ['MP4'],
        },
      ],
    }, input)).toThrow(/결정적 충돌/);
  });

  it('복수 전제 중 일부의 결정적 일치가 있어도 전체 충분 집합이 미완성이면 INSUFFICIENT를 허용한다', () => {
    const { input } = createSelectedOptionRationaleInput({
      arm: 'SELECTED_OPTION_COMPLETE',
      gold: fixture('mrna-vaccine-lipid-nanoparticle-q19.json'),
      selectedChoiceId: 'C5',
      studentRationale: rationale,
      experimentAuditId: 'EXPERIMENT-MRNA-C5',
    });
    expect(validateSelectedOptionRationaleOutput({
      outputVersion: 'selected-option-rationale-output-v1',
      rationaleAssessment: 'INSUFFICIENT',
      reason: '결정적 전제 하나는 맞지만 ALL_OF 집합의 나머지가 없다.',
      evidenceFindings: [{
        studentQuote: 'pH가 높아져도',
        relationToGold: 'MATCHES',
        decisionRelevance: 'DECISIVE',
        sourceRefs: ['MP4'],
      }],
    }, input).rationaleAssessment).toBe('INSUFFICIENT');
  });

  it('위험 프로브의 전체 골드 근거는 유효하고 현재 슬라이스의 의도된 coverage 결손은 세 사례뿐이다', () => {
    const corpus = JSON.parse(readFileSync(resolve(
      process.cwd(),
      'packages/pipeline/experiments/problem-solving/selected-option-risk-probes-v1.json',
    ), 'utf8')) as any;
    const missingByProbe = new Map<string, string[]>();
    for (const probe of corpus.probes) {
      for (const expected of probe.expectedFindings) {
        expect(probe.rationale).toContain(expected.quoteAnchor);
      }
      const goldPath = resolve(
        process.cwd(),
        'docs/experiments/problem-gold-explanation-audit-cycle-2026-09-02/artifacts',
        probe.caseId,
        'c-gold.json',
      );
      const gold = ProblemQuestionGoldSchema.parse(JSON.parse(readFileSync(goldPath, 'utf8')));
      const full = createSelectedOptionRationaleInput({
        arm: 'BASELINE_FULL_GOLD',
        gold,
        selectedChoiceId: probe.choiceId,
        studentRationale: probe.rationale,
      }).input;
      const slice = createSelectedOptionRationaleInput({
        arm: 'SELECTED_OPTION_COMPLETE',
        gold,
        selectedChoiceId: probe.choiceId,
        studentRationale: probe.rationale,
        experimentAuditId: `TEST:${probe.probeId}`,
      }).input;
      const fullRefs = allowedSelectedOptionRationaleRefs(full);
      const sliceRefs = allowedSelectedOptionRationaleRefs(slice);
      const missing = new Set<string>();
      for (const expected of probe.expectedFindings) {
        expect(expected.sourceRefsAny.some((ref: string) => fullRefs.has(ref))).toBe(true);
        if (!expected.sourceRefsAny.some((ref: string) => sliceRefs.has(ref))) {
          expected.sourceRefsAny.forEach((ref: string) => missing.add(ref));
        }
      }
      if (missing.size > 0) missingByProbe.set(probe.probeId, [...missing]);
    }
    expect(Object.fromEntries(missingByProbe)).toEqual({
      'RP2-MIXED-ANCILLARY-ERROR': ['SF2'],
      'RP3-RELATED-NONDECISIVE': ['MP1', 'MP2'],
      'RP6-OUTSIDE-SLICE-VALID': ['MP4'],
    });
  });
});
