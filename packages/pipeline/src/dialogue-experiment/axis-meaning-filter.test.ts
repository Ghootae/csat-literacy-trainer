import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import type OpenAI from 'openai';
import { ParagraphDiagnosticGoldSchema } from './schema.js';
import { applyAxisMeaningFilter, buildAxisMeaningFilterPayload, validateAxisMeaningFilter, OpenAIAxisMeaningFilter } from './axis-meaning-filter.js';
const gold = ParagraphDiagnosticGoldSchema.parse(JSON.parse(readFileSync('packages/pipeline/fixtures/experiments/dialogue/gold-v2/gongsun-long-later-mohists-p1.json', 'utf8')));
const result = () => ({ paragraphId: gold.paragraphId, axes: gold.centralAxes.map(a => ({
  axisId: a.id, originalDescription: a.description, axisContribution: '중심 설명',
  semanticUnits: [{ unitId: 'U1', meaning: a.description, basisQuote: a.description, status: 'required', omissionImpact: '중심 설명 소실' }],
  retainedUnitIds: ['U1'], filteredDescription: a.description, jointOmissionCheck: '관계 유지', scopeCheck: '범위 유지',
})) });
describe('offline minimum-meaning filter', () => {
  it('excludes students, expectations, story and detailed relations from input', () => {
    const p = JSON.parse(buildAxisMeaningFilterPayload({ ...gold, studentResponse: 'SECRET' } as typeof gold));
    expect(Object.keys(p).sort()).toEqual(['centralAxes', 'centralObject', 'paragraphId', 'paragraphText']);
    expect(Object.keys(p.centralAxes[0])).toEqual(['id', 'description']);
    expect(JSON.stringify(p)).not.toContain('SECRET');
  });
  it('preserves no-op gold and isolates editing units from runtime', () => {
    expect(applyAxisMeaningFilter(gold, result())).toEqual(gold);
    const r = result(); r.axes[1]!.filteredDescription = '공손룡과 후기 묵가는 명실 문제의 논쟁 주체다.';
    const before = JSON.stringify(gold); const copy = applyAxisMeaningFilter(gold, r);
    expect(JSON.stringify(gold)).toBe(before);
    expect(copy.coreRelations).toEqual(gold.coreRelations);
    expect(Object.keys(copy.centralAxes[1]!)).toEqual(Object.keys(gold.centralAxes[1]!));
    expect(JSON.stringify(copy)).not.toContain('semanticUnits');
    expect(validateAxisMeaningFilter(r, gold).axes[1]!.changed).toBe(true);
  });
  it.each(['paragraph', 'order', 'count', 'original', 'quote', 'blank', 'duplicate', 'unknown-ref', 'missing-ref', 'optional-ref', 'unchanged-optional'])('rejects %s corruption', kind => {
    const r = result(); const a = r.axes[0]!;
    if (kind === 'paragraph') r.paragraphId = 'wrong';
    if (kind === 'order') r.axes.reverse();
    if (kind === 'count') r.axes.pop();
    if (kind === 'original') a.originalDescription = 'wrong';
    if (kind === 'quote') a.semanticUnits[0]!.basisQuote = '원문에만 있는 표현';
    if (kind === 'blank') a.scopeCheck = ' ';
    if (kind === 'duplicate') a.semanticUnits.push({ ...a.semanticUnits[0]! });
    if (kind === 'unknown-ref') a.retainedUnitIds.push('U99');
    if (kind === 'missing-ref') a.retainedUnitIds = [];
    if (kind === 'optional-ref') { a.semanticUnits[0]!.status = 'optional'; a.filteredDescription = '수정'; }
    if (kind === 'unchanged-optional') a.semanticUnits[0]!.status = 'optional';
    expect(() => validateAxisMeaningFilter(r, gold)).toThrow();
  });
  it('accepts traceable optional omission without pretending to prove semantic fidelity', () => {
    const r = result(); const a = r.axes[1]!;
    a.filteredDescription = '공손룡과 후기 묵가는 명실 문제의 논쟁 주체다.';
    a.semanticUnits.push({ unitId: 'U2', meaning: '전문성', basisQuote: '전문적으로', status: 'optional', omissionImpact: '논쟁 주체 관계 유지' });
    expect(validateAxisMeaningFilter(r, gold).axes[1]!.excluded).toHaveLength(1);
    // A bogus rewrite still passes structural checks: human semantic review remains necessary.
    a.filteredDescription = '원문에 없는 새 원인이 추가됨';
    expect(() => validateAxisMeaningFilter(r, gold)).not.toThrow();
  });
  it('uses one nonstored request, no retries, and preserves raw output', async () => {
    const parse = vi.fn().mockResolvedValue({ output_parsed: result(), id: 'mock', usage: {} });
    const out = await new OpenAIAxisMeaningFilter({ client: { responses: { parse } } as unknown as OpenAI }).filter(gold);
    expect(parse).toHaveBeenCalledTimes(1);
    expect(parse.mock.calls[0]![0]).toMatchObject({ store: false, service_tier: 'default', model: 'gpt-5.6-terra' });
    expect(parse.mock.calls[0]![1]).toMatchObject({ maxRetries: 0 });
    expect(out.metadata.rawResult).toEqual(result());
  });
  it('rejects refusal/incomplete output', async () => {
    const parse = vi.fn().mockResolvedValue({ output_parsed: null });
    await expect(new OpenAIAxisMeaningFilter({ client: { responses: { parse } } as unknown as OpenAI }).filter(gold)).rejects.toThrow('no structured output');
  });
});
