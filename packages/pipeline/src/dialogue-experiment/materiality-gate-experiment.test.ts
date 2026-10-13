import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import type OpenAI from 'openai';
import { loadCentralStoryGatePrompt } from './gate.js';
import { MaterialityGateExperiment, materialityInstructions } from './materiality-gate-experiment.js';
import { ParagraphDiagnosticGoldSchema } from './schema.js';
const gold = ParagraphDiagnosticGoldSchema.parse(JSON.parse(readFileSync('packages/pipeline/fixtures/experiments/dialogue/gold-v2/gongsun-long-later-mohists-p1.json', 'utf8')));
describe('single-call materiality candidate', () => {
  it('baseline remains byte identical', () => {
    const base = loadCentralStoryGatePrompt('v4'); expect(materialityInstructions(base, 'baseline')).toBe(base);
  });
  it('replaces only feedback criteria while preserving boundaries and recording supplements', () => {
    const base = loadCentralStoryGatePrompt('v4') + '\nSENTINEL claims/error recording';
    const changed = materialityInstructions(base, 'candidate');
    expect(changed.split('## 학생 선택형 피드백 v4')[0]).toBe(base.split('## 학생 선택형 피드백 v4')[0]);
    expect(changed.slice(changed.indexOf('revealedText는 학생 직접 인용도'))).toBe(base.slice(base.indexOf('revealedText는 학생 직접 인용도')));
    expect(changed).toContain('이미 표현한 내용을 함께 고려');
    expect(changed).not.toContain('중심 관계는 드러나지만 일부 의미가 아직 미확인인 축.');
  });
  it('fails closed if the expected baseline section changes', () => expect(() => materialityInstructions('unrecognized', 'candidate')).toThrow());
  it('uses the identical input/schema and one request per arm, no fallback or extra gate', async () => {
    const seen: any[] = [];
    const parse = vi.fn(async (req, opts) => { seen.push({ req, opts }); throw new Error('test-stop'); });
    const input = { gold, goldVersion: 'test', goldHash: 'test', initialResponse: '짧은 답', history: [], turn: 1, questionsAsked: 0, maxQuestions: 3 };
    for (const arm of ['baseline', 'candidate'] as const) {
      await expect(new MaterialityGateExperiment({ arm, client: { responses: { parse } } as unknown as OpenAI }).evaluate(input)).rejects.toThrow('test-stop');
    }
    expect(parse).toHaveBeenCalledTimes(2);
    expect(seen[0].req.input).toBe(seen[1].req.input);
    expect(JSON.stringify(seen[0].req.text)).toBe(JSON.stringify(seen[1].req.text));
    expect(seen[0].req.instructions).not.toBe(seen[1].req.instructions);
    for (const s of seen) { expect(s.req.store).toBe(false); expect(s.opts.maxRetries).toBe(0); }
  });
});
