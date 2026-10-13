import { readFileSync } from 'node:fs';
import { describe, it, expect } from 'vitest';
import { ISOLATION_CASES, isolateAxisInput, isolationOutcome } from './axis-context-isolation.js';
const root = 'docs/experiments/axis-direct-judgment-v2-relational-boundary-2026-09-20';
const templates = JSON.parse(readFileSync(`${root}/request-templates.json`, 'utf8'));
const get = (id: string, arm = 'v1') => templates.find((t: { caseId: string; arm: string }) => t.caseId === id && t.arm === arm).request;
describe('axis context isolation without new judgment rules', () => {
  it('selects five existing utterances and their actual failure axes', () => {
    expect(ISOLATION_CASES).toHaveLength(5);
    expect(ISOLATION_CASES.filter(c => c.targetAxisId === 'AX2')).toHaveLength(2);
    for (const c of ISOLATION_CASES) expect(get(c.sourceCaseId)).toBeDefined();
  });
  it('changes only centralAxes while keeping the entire paragraph and response', () => {
    for (const c of ISOLATION_CASES) {
      const original = JSON.parse(get(c.sourceCaseId).input);
      const isolated = JSON.parse(isolateAxisInput(get(c.sourceCaseId).input, c.targetAxisId));
      expect(isolated).toEqual({ ...original, centralAxes: original.centralAxes.filter((a: { id: string }) => a.id === c.targetAxisId) });
      expect(isolated.evidence.initialResponse).toBe(original.evidence.initialResponse);
      expect(isolated.centralAxes).toHaveLength(1);
    }
  });
  it('does not insert gold, instructions, evidence fields or diagnostic metadata', () => {
    const a = JSON.parse(get('P01-insufficient').input), b = JSON.parse(isolateAxisInput(get('P01-insufficient').input, 'AX1'));
    expect(Object.keys(a)).toEqual(Object.keys(b));
    expect(b.evidence.initialResponse).toContain('티로신→레보도파→도파민');
  });
  it('retains both frozen prompt variants with identical non-prompt settings', () => {
    for (const c of ISOLATION_CASES) {
      const { instructions: a, ...ar } = get(c.sourceCaseId, 'v1');
      const { instructions: b, ...br } = get(c.sourceCaseId, 'candidate');
      expect(a).not.toBe(b); expect(ar).toEqual(br);
    }
  });
  it('keeps the exact AX2 student sentence across the two Gongsun cases', () => {
    const a = JSON.parse(get('P04-insufficient').input).evidence.initialResponse;
    const b = JSON.parse(get('P04-sufficient').input).evidence.initialResponse;
    expect(a.slice(a.indexOf('공손룡'))).toBe(b.slice(b.indexOf('공손룡')));
    expect(a).not.toBe(b);
  });
  it('rejects absent target axes', () => expect(() => isolateAxisInput(get('P01-insufficient').input, 'AX999')).toThrow());
  it('evaluates only the specified target rather than confusing other-axis incompleteness', () => {
    const raw = { axes: [{ axisId: 'AX1', status: 'UNCLEAR_SERIOUS', reason: '변화 미확인' }, { axisId: 'AX2', status: 'PASS', reason: '논쟁 확인' }] };
    expect(isolationOutcome(raw, get('P04-insufficient').input, 'AX2', ['PASS']).expectedMatch).toBe(true);
  });
  it('separates contract failure from semantic mismatch without relabeling', () => {
    const input = isolateAxisInput(get('P01-insufficient').input, 'AX1');
    const result = isolationOutcome({ axes: [{ axisId: 'AX1', status: 'PASS', reason: '확인' }] }, input, 'AX1', ['UNCLEAR_SERIOUS']);
    expect(result.targetStatus).toBe('PASS'); expect(result.expectedMatch).toBe(false);
    const failed = isolationOutcome({ axes: [] }, input, 'AX1', ['UNCLEAR_SERIOUS']);
    expect(failed.contractValid).toBe(false); expect(failed.expectedMatch).toBeNull();
  });
});
