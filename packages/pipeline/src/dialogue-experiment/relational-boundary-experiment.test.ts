import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';
import type OpenAI from 'openai';
import { DirectJudgmentExperiment, DIRECT_JUDGMENT_PROMPT_PATH } from './direct-judgment-experiment.js';
import { ParagraphDiagnosticGoldSchema } from './schema.js';
import { boundaryPayload, boundaryOutcome, buildBoundaryRequest, evaluateBoundary,
  relationalBoundaryInstructions, OLD_RELATION_RULE, NEW_RELATION_RULE, OLD_PASS_RULE, NEW_PASS_RULE,
  type BoundaryPair } from './relational-boundary-experiment.js';

const prior = 'docs/experiments/axis-direct-judgment-v1-2026-09-20';
const read = (p: string) => JSON.parse(readFileSync(p, 'utf8'));
const pairs: BoundaryPair[] = read('packages/pipeline/experiments/dialogue/relational-boundary-pairs-v1.json');
const sources = read(`${prior}/sources.json`);
const base = readFileSync(DIRECT_JUDGMENT_PROMPT_PATH, 'utf8').trim();
const payload = boundaryPayload(pairs[0]!, 'insufficient', sources);
const raw = { axes: payload.centralAxes.map(a => ({ axisId: a.id, status: 'PASS', reason: '확인' })) };

describe('relational boundary preparation (no paid calls)', () => {
  it('keeps v1 byte-identical to the completed experiment', () => {
    expect(createHash('sha256').update(base).digest('hex')).toBe(read(`${prior}/manifest.json`).instructionHashes.direct);
    expect(relationalBoundaryInstructions(base, 'v1')).toBe(base);
  });
  it('replaces exactly two passages without unrelated prompt changes', () => {
    const candidate = relationalBoundaryInstructions(base, 'candidate');
    expect(candidate.replace(NEW_RELATION_RULE, OLD_RELATION_RULE).replace(NEW_PASS_RULE, OLD_PASS_RULE)).toBe(base);
    expect(candidate).not.toContain(OLD_RELATION_RULE);
  });
  it('fails closed on missing or duplicated replacement anchors', () => {
    expect(() => relationalBoundaryInstructions(base.replace(OLD_RELATION_RULE, ''), 'candidate')).toThrow();
    expect(() => relationalBoundaryInstructions(base + OLD_PASS_RULE, 'candidate')).toThrow();
  });
  it('changes only instructions: same model, reasoning, input and minimal output schema', () => {
    const { instructions: v1, ...a } = buildBoundaryRequest(payload, 'v1');
    const { instructions: candidate, ...b } = buildBoundaryRequest(payload, 'candidate');
    expect(v1).not.toBe(candidate); expect(a).toEqual(b);
    expect(Object.keys(a.text.format.schema.properties!)).toEqual(['axes']);
  });
  it('matches the original v1 request builder exactly for original gold', async () => {
    const parse = vi.fn().mockResolvedValue({ output_parsed: raw });
    await new DirectJudgmentExperiment({ responses: { parse } } as unknown as OpenAI).evaluate({
      gold: ParagraphDiagnosticGoldSchema.parse(sources[pairs[0]!.sourceParagraphId!].gold),
      goldHash: 'test', goldVersion: 'test', initialResponse: pairs[0]!.insufficient,
      history: [], turn: 1, questionsAsked: 0, maxQuestions: 3,
    });
    expect(parse.mock.calls[0]![0]).toEqual(buildBoundaryRequest(payload, 'v1'));
  });
  it('contains 10 unique contrastive pairs including all required categories', () => {
    expect(pairs).toHaveLength(10); expect(new Set(pairs.map(p => p.id)).size).toBe(10);
    for (const category of ['대조', '논쟁', '인과', '조건', '변화']) expect(pairs.some(p => p.category === category)).toBe(true);
    for (const p of pairs) expect(p.insufficient).not.toBe(p.sufficient);
  });
  it('preserves the original dopamine failure and all original axes', () => {
    expect(pairs[0]!.insufficient).toBe(read(`${prior}/cases.json`).find((c: { id: string }) => c.id === 'dopamine-motor-control-p1--core-gap').initial);
    expect(payload.centralAxes).toHaveLength(2);
    expect(pairs.find(p => p.anchor === 'gongsun-modifier-protection')!.sufficient).not.toMatch(/대표|전문/);
  });
  it('keeps categories, expectations, notes and detailed gold out of every model payload', () => {
    for (const pair of pairs) for (const side of ['insufficient', 'sufficient'] as const) {
      const p = boundaryPayload(pair, side, sources);
      expect(Object.keys(p)).toEqual(['paragraphText', 'centralAxes', 'evidence', 'turn']);
      for (const a of p.centralAxes) expect(Object.keys(a)).toEqual(['id', 'description']);
      expect(p.evidence.initialResponse).toBe(pair[side]);
    }
  });
  it('makes only one call and disables automatic retries for both arms', async () => {
    for (const arm of ['v1', 'candidate'] as const) {
      const parse = vi.fn().mockResolvedValue({ output_parsed: raw });
      await evaluateBoundary(payload, arm, { responses: { parse } } as unknown as OpenAI);
      expect(parse).toHaveBeenCalledTimes(1);
      expect(parse.mock.calls[0]![1]).toEqual({ timeout: 60_000, maxRetries: 0 });
    }
  });
  it('does not retry contract or transport failures', async () => {
    for (const response of [new Error('transport'), { output_parsed: { axes: [] } }]) {
      const parse = response instanceof Error ? vi.fn().mockRejectedValue(response) : vi.fn().mockResolvedValue(response);
      await expect(evaluateBoundary(payload, 'candidate', { responses: { parse } } as unknown as OpenAI)).rejects.toThrow();
      expect(parse).toHaveBeenCalledTimes(1);
    }
  });
  it('counts missing-relation PASS and sufficient nonPASS separately, without relabeling', () => {
    expect(boundaryOutcome(raw, payload, 'AX1', 'insufficient').overAcceptance).toBe(true);
    expect(boundaryOutcome(raw, payload, 'AX1', 'sufficient').overHolding).toBe(false);
    for (const status of ['UNCLEAR_OK', 'UNCLEAR_SERIOUS']) {
      const output = { axes: raw.axes.map(a => a.axisId === 'AX1' ? { ...a, status } : a) };
      expect(boundaryOutcome(output, payload, 'AX1', 'insufficient').overAcceptance).toBe(false);
      expect(boundaryOutcome(output, payload, 'AX1', 'sufficient').overHolding).toBe(true);
      expect(boundaryOutcome(output, payload, 'AX1', 'sufficient').axes).toEqual(output.axes);
    }
  });
  it('separates unsupported ERROR and contract failure from primary semantic metrics', () => {
    const output = { axes: raw.axes.map(a => ({ ...a, status: 'ERROR' })) };
    expect(boundaryOutcome(output, payload, 'AX1', 'insufficient').unsupportedError).toBe(true);
    const invalid = boundaryOutcome({ axes: [] }, payload, 'AX1', 'insufficient');
    expect(invalid.contractValid).toBe(false); expect(invalid.overAcceptance).toBeNull();
    expect(invalid.overHolding).toBeNull();
  });
});
