import { describe, expect, it, vi } from 'vitest';
import type OpenAI from 'openai';
import { buildAxisRelationPayload, validateAxisRelations, OpenAIAxisRelationDecomposer } from './axis-relation-decomposition.js';
const input = { paragraphId: 'fixture', centralAxes: [{ id: 'AX1', description: '상태가 A에서 B로 변한다.' }] };
const raw = () => ({ paragraphId: 'fixture', axes: [{ axisId: 'AX1', originalDescription: input.centralAxes[0]!.description,
  relations: [{ relationId: 'R1', statement: '상태가 A에서 B로 변한다.', subjects: ['상태'], objects: [],
    direction: 'state_or_attribute', transition: { from: 'A', to: 'B' },
    conditions: [] as { text: string; basisQuote: string }[], modifiers: [] as { text: string; basisQuote: string }[], evidenceQuotes: ['A에서 B로 변한다.'],
  }], unresolved: [] as { quote: string; issue: string }[] }] });
describe('axis-only relation extraction', () => {
  it('allowlists only axes and opaque paragraph ID', () => {
    const extended = { ...input, paragraphText: 'SECRET', centralObject: 'SECRET', expected: 'SECRET', student: 'SECRET',
      centralAxes: [{ ...input.centralAxes[0]!, relationIds: ['SECRET'] }] };
    const p = JSON.parse(buildAxisRelationPayload(extended));
    expect(Object.keys(p).sort()).toEqual(['centralAxes', 'paragraphId']);
    expect(Object.keys(p.centralAxes[0])).toEqual(['id', 'description']);
    expect(JSON.stringify(p)).not.toContain('SECRET');
  });
  it('preserves original input and transition endpoints', () => {
    const before = JSON.stringify(input);
    expect(validateAxisRelations(raw(), input).axes[0]!.relations[0]!.transition).toEqual({ from: 'A', to: 'B' });
    expect(JSON.stringify(input)).toBe(before);
  });
  it.each(['paragraph', 'axis', 'count', 'original', 'duplicate', 'quote', 'modifier-quote', 'condition-quote', 'blank', 'empty', 'extra'])('rejects %s corruption', kind => {
    const r = raw(); const a = r.axes[0]!;
    if (kind === 'paragraph') r.paragraphId = 'x';
    if (kind === 'axis') a.axisId = 'x';
    if (kind === 'count') r.axes.push(structuredClone(a));
    if (kind === 'original') a.originalDescription = 'x';
    if (kind === 'duplicate') a.relations.push(structuredClone(a.relations[0]!));
    if (kind === 'quote') a.relations[0]!.evidenceQuotes = ['외부 자료'];
    if (kind === 'modifier-quote') a.relations[0]!.modifiers = [{ text: '외부', basisQuote: '외부' }];
    if (kind === 'condition-quote') a.relations[0]!.conditions = [{ text: '외부', basisQuote: '외부' }];
    if (kind === 'blank') a.relations[0]!.statement = ' ';
    if (kind === 'empty') a.relations = [];
    if (kind === 'extra') Object.assign(a.relations[0]!, { importance: 'main' });
    expect(() => validateAxisRelations(r, input)).toThrow();
  });
  it('can preserve unresolved text without inventing a relation', () => {
    const r = raw(); r.axes[0]!.relations = [];
    r.axes[0]!.unresolved = [{ quote: '상태', issue: '대상이 불명확' }];
    expect(validateAxisRelations(r, input).axes[0]!.unresolved).toHaveLength(1);
  });
  it('does not confuse provenance checks with semantic verification', () => {
    const r = raw(); r.axes[0]!.relations[0]!.transition = { from: 'B', to: 'A' };
    expect(() => validateAxisRelations(r, input)).not.toThrow();
  });
  it('makes one nonstored call without retries and preserves raw output', async () => {
    const parse = vi.fn().mockResolvedValue({ id: 'mock', output_parsed: raw(), usage: {} });
    const out = await new OpenAIAxisRelationDecomposer({ client: { responses: { parse } } as unknown as OpenAI }).extract(input);
    expect(parse).toHaveBeenCalledTimes(1);
    expect(parse.mock.calls[0]![0]).toMatchObject({ store: false, service_tier: 'default' });
    expect(parse.mock.calls[0]![1]).toMatchObject({ maxRetries: 0 });
    expect(out.metadata.rawResult).toEqual(raw());
    expect(out).not.toHaveProperty('filteredGold');
  });
  it('rejects incomplete/refusal output', async () => {
    const parse = vi.fn().mockResolvedValue({ output_parsed: null });
    await expect(new OpenAIAxisRelationDecomposer({ client: { responses: { parse } } as unknown as OpenAI }).extract(input)).rejects.toThrow('no structured output');
  });
});
