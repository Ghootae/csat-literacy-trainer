import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import type OpenAI from 'openai';
import { DirectJudgmentExperiment, validateDirectJudgment } from './direct-judgment-experiment.js';
import { buildCentralStoryGatePayload } from './gate.js';
import { ParagraphDiagnosticGoldSchema } from './schema.js';
const gold = ParagraphDiagnosticGoldSchema.parse(JSON.parse(readFileSync('packages/pipeline/fixtures/experiments/dialogue/gold-v2/gongsun-long-later-mohists-p1.json', 'utf8')));
const input = { gold, goldHash: 'test', goldVersion: 'test', initialResponse: '짧은 답', history: [], turn: 1, questionsAsked: 0, maxQuestions: 3 };
const raw = { axes: [{ axisId: 'AX1', status: 'PASS', reason: '확인' }, { axisId: 'AX2', status: 'UNCLEAR_OK', reason: '경계' }] };
describe('axis-direct-judgment-v1', () => {
  it('preserves PASS and OK distinctly without normalization', () => expect(validateDirectJudgment(raw, ['AX1', 'AX2'])).toEqual(raw));
  it('rejects missing axes', () => expect(() => validateDirectJudgment({ axes: raw.axes.slice(0, 1) }, ['AX1', 'AX2'])).toThrow());
  it('rejects duplicated axes', () => expect(() => validateDirectJudgment({ axes: [raw.axes[0], raw.axes[0]] }, ['AX1', 'AX2'])).toThrow());
  it('rejects invented axes', () => expect(() => validateDirectJudgment(raw, ['AX1', 'AX3'])).toThrow());
  it('rejects blank reasons and extra fields', () => {
    expect(() => validateDirectJudgment({ axes: [{ ...raw.axes[0], reason: ' ' }] }, ['AX1'])).toThrow();
    expect(() => validateDirectJudgment({ ...raw, effectiveResponse: '추가' }, ['AX1', 'AX2'])).toThrow();
  });
  it('uses the exact baseline input with only minimal output obligations and one call', async () => {
    const parse = vi.fn().mockResolvedValue({ output_parsed: raw });
    const result = await new DirectJudgmentExperiment({ responses: { parse } } as unknown as OpenAI).evaluate(input);
    expect(result).toEqual(raw);
    expect(parse).toHaveBeenCalledTimes(1);
    const [request, options] = parse.mock.calls[0]!;
    expect(request.input).toBe(buildCentralStoryGatePayload(input));
    expect(request.model).toBe('gpt-5.6-terra'); expect(request.reasoning.effort).toBe('medium');
    expect(request.store).toBe(false); expect(options.maxRetries).toBe(0);
    expect(Object.keys(request.text.format.schema.properties)).toEqual(['axes']);
    expect(Object.keys(request.text.format.schema.properties.axes.items.properties)).toEqual(['axisId', 'status', 'reason']);
  });
  it('does not retry transport or contract failures', async () => {
    for (const response of [new Error('transport'), { output_parsed: { axes: [] } }]) {
      const parse = response instanceof Error ? vi.fn().mockRejectedValue(response) : vi.fn().mockResolvedValue(response);
      await expect(new DirectJudgmentExperiment({ responses: { parse } } as unknown as OpenAI).evaluate(input)).rejects.toThrow();
      expect(parse).toHaveBeenCalledTimes(1);
    }
  });
});
