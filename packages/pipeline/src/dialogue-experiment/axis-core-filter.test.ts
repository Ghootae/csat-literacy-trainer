import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import type OpenAI from 'openai';
import { ParagraphDiagnosticGoldSchema } from './schema.js';
import { applyAxisCoreFilter, buildAxisCoreFilterPayload, OpenAIAxisCoreFilter, validateAxisCoreFilter } from './axis-core-filter.js';

const gold = ParagraphDiagnosticGoldSchema.parse(JSON.parse(readFileSync('packages/pipeline/fixtures/experiments/dialogue/gold-v2/gongsun-long-later-mohists-p1.json', 'utf8')));
const result = () => ({ paragraphId: gold.paragraphId, axes: gold.centralAxes.map(a => ({
  axisId: a.id, originalDescription: a.description, filteredDescription: a.description,
  changed: false, rationale: '핵심 관계 유지', excluded: [] as {originalQuote: string; reason: string}[],
})) });

describe('axis core filter is a separate, provenance-preserving derivative', () => {
  it('does not pass detailed gold or incidental student fields into the filter', () => {
    const payload = JSON.parse(buildAxisCoreFilterPayload({ ...gold, studentResponse: 'secret' } as typeof gold));
    expect(Object.keys(payload).sort()).toEqual(['centralAxes', 'paragraphId', 'paragraphText']);
    expect(JSON.stringify(payload)).not.toContain('secret');
    expect(payload.centralAxes[0]).toEqual({ id: 'AX1', description: gold.centralAxes[0]!.description });
  });
  it('changes descriptions only and retains the original and relation metadata', () => {
    const before = JSON.stringify(gold); const r = result();
    Object.assign(r.axes[1]!, { filteredDescription: '공손룡과 후기 묵가는 명실 문제를 둘러싸고 논쟁했다.', changed: true,
      excluded: [{ originalQuote: '전문적으로', reason: '논쟁 주체 관계를 보존한다.' }] });
    const derivative = applyAxisCoreFilter(gold, r);
    expect(JSON.stringify(gold)).toBe(before);
    expect(derivative.coreRelations).toEqual(gold.coreRelations);
    expect(derivative.centralAxes[1]!.relationIds).toEqual(gold.centralAxes[1]!.relationIds);
    expect(derivative.centralAxes[1]!.description).toBe(r.axes[1]!.filteredDescription);
  });
  it('accepts no-op filtering', () => expect(applyAxisCoreFilter(gold, result())).toEqual(gold));
  it.each(['id', 'count', 'order', 'original', 'quote', 'flag', 'unchanged', 'blank'])('rejects invalid %s provenance', kind => {
    const r = result();
    if (kind === 'id') r.paragraphId = 'wrong';
    if (kind === 'count') r.axes.pop();
    if (kind === 'order') r.axes.reverse();
    if (kind === 'original') r.axes[0]!.originalDescription = 'wrong';
    if (kind === 'quote') { r.axes[0]!.changed = true; r.axes[0]!.filteredDescription = '새 설명'; r.axes[0]!.excluded = [{ originalQuote: '축에 없는 문구', reason: 'x' }]; }
    if (kind === 'flag') r.axes[0]!.changed = true;
    if (kind === 'unchanged') r.axes[0]!.excluded = [{ originalQuote: '명실', reason: 'x' }];
    if (kind === 'blank') { r.axes[0]!.changed = true; r.axes[0]!.filteredDescription = ' '; }
    expect(() => validateAxisCoreFilter(r, gold)).toThrow();
  });
  it('uses one call without student evidence and stores independent lineage', async () => {
    const parse = vi.fn().mockResolvedValue({ output_parsed: result(), id: 'mock', usage: { input_tokens: 10, output_tokens: 20 } });
    const filter = new OpenAIAxisCoreFilter({ client: { responses: { parse } } as unknown as OpenAI });
    const out = await filter.filter(gold);
    expect(parse).toHaveBeenCalledTimes(1);
    expect(parse.mock.calls[0]![0].store).toBe(false);
    expect(out.metadata.originalGoldHash).toBe(out.metadata.filteredGoldHash);
    expect(out.result).toEqual(result());
  });
});
