import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import type OpenAI from 'openai';
import { ParagraphDiagnosticGoldSchema } from './schema.js';
import { buildAxisFunctionFilterPayload, validateAxisFunctionFilter, applyAxisFunctionFilter, OpenAIAxisFunctionFilter } from './axis-function-filter.js';
const gold = ParagraphDiagnosticGoldSchema.parse(JSON.parse(readFileSync('packages/pipeline/fixtures/experiments/dialogue/gold-v2/gongsun-long-later-mohists-p1.json', 'utf8')));
const result = () => ({ paragraphId: gold.paragraphId, axes: gold.centralAxes.map(a => ({
  axisId: a.id, originalDescription: a.description, explanationFunction: '대상에 대한 기존 설명 기능',
  functionBasisAxisQuote: a.description, objectConnection: '중심 대상의 관계를 설명한다.',
  filteredDescription: a.description, rationale: '기존 의미 유지', preservationCheck: '방향과 관계 유지',
  excluded: [] as {originalQuote: string; reason: string}[],
})) });
describe('function-first axis filtering', () => {
  it('allowlists object, axes, paragraph only; excludes story/relations/student', () => {
    const p = JSON.parse(buildAxisFunctionFilterPayload({ ...gold, studentResponse: 'SECRET' } as typeof gold));
    expect(Object.keys(p).sort()).toEqual(['centralAxes', 'centralObject', 'paragraphId', 'paragraphText']);
    expect(p.centralObject).toBe(gold.centralObject);
    expect(JSON.stringify(p)).not.toContain('SECRET');
    expect(Object.keys(p.centralAxes[0])).toEqual(['id', 'description']);
  });
  it('derives changed without asking the model and never forwards function audit', () => {
    const r = result(); r.axes[1]!.filteredDescription = '공손룡과 후기 묵가는 명실 문제를 두고 논쟁했다.';
    const before = JSON.stringify(gold);
    const parsed = validateAxisFunctionFilter(r, gold);
    expect(parsed.axes.map(a => a.changed)).toEqual([false, true]);
    const filtered = applyAxisFunctionFilter(gold, r);
    expect(JSON.stringify(gold)).toBe(before);
    expect(Object.keys(filtered).sort()).toEqual(Object.keys(gold).sort());
    expect(filtered.coreRelations).toEqual(gold.coreRelations);
    expect(filtered.centralObject).toBe(gold.centralObject);
    expect(Object.keys(filtered.centralAxes[1]!)).toEqual(Object.keys(gold.centralAxes[1]!));
    expect(JSON.stringify(filtered)).not.toContain('explanationFunction');
  });
  it('keeps an already sufficient axis unchanged', () => expect(applyAxisFunctionFilter(gold, result())).toEqual(gold));
  it.each(['id', 'order', 'count', 'original', 'basis', 'excluded', 'blank', 'unchanged'])('rejects invalid %s', kind => {
    const r = result();
    if (kind === 'id') r.paragraphId = 'wrong';
    if (kind === 'order') r.axes.reverse();
    if (kind === 'count') r.axes.pop();
    if (kind === 'original') r.axes[0]!.originalDescription = 'wrong';
    if (kind === 'basis') r.axes[0]!.functionBasisAxisQuote = 'not in original';
    if (kind === 'excluded') { r.axes[0]!.filteredDescription = '정제'; r.axes[0]!.excluded = [{ originalQuote: 'not in original', reason: 'x' }]; }
    if (kind === 'blank') r.axes[0]!.explanationFunction = ' ';
    if (kind === 'unchanged') r.axes[0]!.excluded = [{ originalQuote: '명실', reason: 'x' }];
    expect(() => validateAxisFunctionFilter(r, gold)).toThrow();
  });
  it('preserves raw output and uses one nonstored API call', async () => {
    const parse = vi.fn().mockResolvedValue({ output_parsed: result(), id: 'mock', usage: { input_tokens: 1, output_tokens: 1 } });
    const out = await new OpenAIAxisFunctionFilter({ client: { responses: { parse } } as unknown as OpenAI }).filter(gold);
    expect(parse).toHaveBeenCalledTimes(1);
    expect(parse.mock.calls[0]![0].store).toBe(false);
    expect(out.metadata.rawResult).toEqual(result());
    expect(out.result.axes[0]!.changed).toBe(false);
    expect(out.metadata.originalGoldHash).toBe(out.metadata.filteredGoldHash);
  });
});
