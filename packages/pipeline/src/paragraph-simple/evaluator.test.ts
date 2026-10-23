import { describe, expect, it, vi } from 'vitest';
import { OpenAISimpleEvaluator, SimpleEvaluationError, evaluateSimple, type SimpleEvaluator, type SimpleModelCall, type SimpleTransport } from './evaluator.js';
import type { SimpleEvaluationInput, SimpleOutput } from './schema.js';

const text = '광합성은 빛에너지를 화학에너지로 바꾼다.';
const input: SimpleEvaluationInput = {
  passage: { title: 't', paragraphs: [{ paragraphId: 'p1', text }] }, targetParagraph: { paragraphId: 'p1', text },
  stage: 'INITIAL', dialogue: [{ role: 'student', text: '빛을 화학에너지로 바꾼다' }], coreParts: null, targetError: null, targetGaps: null,
};
const good: SimpleOutput = { category: 'CAPTURED', reason: 'r', coreParts: [{ description: '전환', sourceQuote: '빛에너지를 화학에너지로 바꾼다' }], corePartsCovered: [true], errors: [], gaps: [], targetErrorResolved: null, targetGapReadings: null, targetGapsFilled: null, restatedSummary: '요약', action: 'PRAISE', message: '잘했어', corePartSummaries: [], closingFeedback: null, coreSourceQuote: null };
const bad: SimpleOutput = { ...good, category: 'ONE_ERROR', action: 'CORRECTION_QUESTION', errors: [{ studentQuote: '없는 인용', correction: 'c', sourceQuote: '빛에너지', corePartIndex: 0, gapIndex: null, feedback: '' }] };
const meta = (n: number) => ({ provider: 'mock' as const, model: 'm', promptVersion: 'v', durationMs: n, inputTokens: n, outputTokens: n, cachedTokens: 0 });
const evaluator = (...raws: unknown[]): SimpleEvaluator & { seen: SimpleEvaluationInput[] } => {
  const seen: SimpleEvaluationInput[] = [];
  return { seen, async complete(i) { seen.push(i); const rawOutput = raws.shift(); if (rawOutput instanceof Error) throw rawOutput; return { rawOutput, metadata: meta(1) } satisfies SimpleModelCall; } };
};

describe('evaluateSimple', () => {
  it('통과하면 재요청 없이 반환한다', async () => {
    const e = evaluator(good);
    const r = await evaluateSimple(e, input);
    expect(r.output).toEqual(good); expect(r.validationFailures).toEqual([]); expect(r.call.attempts).toBe(1); expect(e.seen).toHaveLength(1);
  });
  it('인용 검증 실패 -> 이유를 담아 1회 재요청 -> 통과, 호출 메타는 합산', async () => {
    const e = evaluator(bad, good);
    const r = await evaluateSimple(e, input);
    expect(r.output).toEqual(good);
    expect(e.seen[0]!.validationFeedback).toBeUndefined();
    expect(e.seen[1]!.validationFeedback).toMatch(/studentQuote/);
    expect(r.validationFailures).toHaveLength(1); expect(r.validationFailures[0]!.rawOutput).toEqual(bad);
    expect(r.call).toMatchObject({ attempts: 2, inputTokens: 2, durationMs: 2 });
  });
  it('두 번 실패하면 오류이고 세 번째 호출은 없다', async () => {
    const e = evaluator(bad, bad, good);
    await expect(evaluateSimple(e, input)).rejects.toBeInstanceOf(SimpleEvaluationError);
    expect(e.seen).toHaveLength(2);
  });
  it('v4.5: 원문 문장을 통째로 옮기면 sourceCopyDetected를 싣고, COPY가 아니면 재요청한다', async () => {
    const copy = { ...input, dialogue: [{ role: 'student' as const, text }] };
    const copyOut: SimpleOutput = { ...good, category: 'COPY', action: 'RETRY_PROMPT', corePartsCovered: [false] };
    const e = evaluator(good, copyOut);
    const r = await evaluateSimple(e, copy);
    expect(e.seen[0]!.sourceCopyDetected).toBe(true);
    expect(e.seen[1]!.validationFeedback).toMatch(/COPY여야/);
    expect(r.output.category).toBe('COPY');
    const plain = evaluator(good);
    await evaluateSimple(plain, input);
    expect(plain.seen[0]!.sourceCopyDetected).toBe(false);
    const later = evaluator({ ...good, coreParts: [] });
    await evaluateSimple(later, { ...copy, stage: 'AFTER_GAP', coreParts: good.coreParts, targetGaps: [] }).catch(() => undefined);
    expect(later.seen[0]!.sourceCopyDetected).toBeUndefined();
  });
  it('API 오류는 재요청하지 않는다', async () => {
    const e = evaluator(new Error('timeout'), good);
    await expect(evaluateSimple(e, input)).rejects.toThrow('timeout');
    expect(e.seen).toHaveLength(1);
  });
});

describe('OpenAISimpleEvaluator (모의 전송)', () => {
  it('프롬프트·strict 스키마·store=false로 호출하고 사용량을 기록한다', async () => {
    const create = vi.fn<SimpleTransport['create']>(async () => ({ status: 'completed', output_text: JSON.stringify(good),
      usage: { input_tokens: 10, output_tokens: 5, input_tokens_details: { cached_tokens: 3 } } }));
    const call = await new OpenAISimpleEvaluator({ model: 'x', transport: { create } }).complete(input);
    const [request, options] = create.mock.calls[0]!;
    expect(request).toMatchObject({ model: 'x', store: false, reasoning: { effort: 'medium' }, text: { format: { type: 'json_schema', strict: true } } });
    expect(String(request.instructions)).toContain('paragraph-simple-holistic-v4.7');
    expect(options).toEqual({ timeout: 60_000, maxRetries: 0 });
    expect(JSON.parse(((request.input as { content: { text: string }[] }[])[0]!.content[0]!.text))).toMatchObject({ stage: 'INITIAL' });
    expect(call.rawOutput).toEqual(good);
    expect(call.metadata).toMatchObject({ provider: 'openai', model: 'x', promptVersion: 'paragraph-simple-holistic-v4.7', inputTokens: 10, outputTokens: 5, cachedTokens: 3 });
  });
  it('환경 변수로 모델을 바꾼다', async () => {
    const create = vi.fn<SimpleTransport['create']>(async () => ({ status: 'completed', output_text: '{}' }));
    vi.stubEnv('PARAGRAPH_SIMPLE_OPENAI_MODEL', 'env-model');
    try { await new OpenAISimpleEvaluator({ transport: { create } }).complete(input); } finally { vi.unstubAllEnvs(); }
    expect(create.mock.calls[0]![0].model).toBe('env-model');
  });
});
