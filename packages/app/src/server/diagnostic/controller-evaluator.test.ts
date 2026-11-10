import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it, vi } from 'vitest';
import type { FeedbackEvaluator } from '@csat/pipeline';

const created = vi.hoisted(() => [] as unknown[]);
vi.mock('@csat/pipeline', async importOriginal => {
  const actual = await importOriginal<typeof import('@csat/pipeline')>();
  return { ...actual, OpenAIFeedbackEvaluator: class extends actual.OpenAIFeedbackEvaluator {
    constructor(options?: ConstructorParameters<typeof actual.OpenAIFeedbackEvaluator>[0]) { super(options); created.push(options); }
  } };
});
const { DIAGNOSTIC_JUDGMENT, DIAGNOSTIC_SELECTION_MODELS, DiagnosticController } = await import('./controller.js');
const { MemoryStore, summaryEvaluator, diagnosisFake, judgeFake, feedbackFake } = await import('./test-support.js');

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../../../..');

const make = (feedbackEvaluator?: FeedbackEvaluator) => new DiagnosticController({ store: new MemoryStore(), summaryEvaluator,
  diagnosisTransport: diagnosisFake().transport, judgeTransport: judgeFake().transport, ...(feedbackEvaluator ? { feedbackEvaluator } : {}) });

describe('진단 기본 평가기 (D-0213 6)', () => {
  it('평가기를 주입하지 않으면 정답·오답 선택 판정 모두 sol로 만든다(교정 판정은 평가기 기본 luna)', () => {
    created.length = 0;
    make();
    expect(created).toEqual([{ selectionModels: { correct: 'gpt-6.1-sol', incorrect: 'gpt-6.1-sol' }, ...DIAGNOSTIC_JUDGMENT }]);
    expect(DIAGNOSTIC_SELECTION_MODELS).toEqual({ correct: 'gpt-6.1-sol', incorrect: 'gpt-6.1-sol' });
  });
  it('판정 지시문은 v5.10이고 지시문 파일이 있다 (D-0216)', () => {
    expect(DIAGNOSTIC_JUDGMENT).toEqual({ judgmentRules: 'v5.10',
      promptPath: 'packages/pipeline/experiments/problem-solving/source-direct-problem-feedback-v5.10.md', promptVersion: 'problem-feedback-v5.10' });
    expect(existsSync(resolve(REPO_ROOT, DIAGNOSTIC_JUDGMENT.promptPath))).toBe(true);
  });
  it('주입한 평가기가 있으면 평가기를 새로 만들지 않는다', () => {
    created.length = 0;
    make(feedbackFake().evaluator);
    expect(created).toEqual([]);
  });
});
