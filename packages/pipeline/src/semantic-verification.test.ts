import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import type { Gold } from './gold.js';
import type { GeneratedQuerySet } from './llm/query-gen.js';
import {
  applyRepairPlan,
  assertEvidenceContract,
  assertVerificationGate,
  evidenceContractViolations,
  goldVerifierInput,
  makeVerificationRecord,
  queryVerifierInput,
  semanticCandidateHash,
  semanticSourceHash,
  validateGoldStructure,
  validateQueryStructure,
  verifierFingerprint,
} from './semantic-verification.js';

const root = process.cwd();

function fixture(): { source: string; gold: Gold; queries: GeneratedQuerySet } {
  const id = 'photosynthesis-p4';
  const passage = JSON.parse(readFileSync(resolve(root, `content/${id}/passage.json`), 'utf8')) as { text: string };
  const gold = JSON.parse(readFileSync(resolve(root, `content/${id}/gold.json`), 'utf8')) as Gold;
  const queries = JSON.parse(readFileSync(resolve(root, `content/${id}/queries.json`), 'utf8')) as GeneratedQuerySet;
  return { source: passage.text, gold, queries };
}

describe('독립 semantic verification 계약', () => {
  it('모델 입력에서 provenance와 이전 verification을 제거한다', () => {
    const { source, gold, queries } = fixture();
    const markedGold = { ...gold, semanticVerification: { hidden: true } as never };
    const markedQueries = { ...queries, semanticVerification: { hidden: true } as never };
    expect(Object.keys(goldVerifierInput(source, markedGold))).toEqual(['sourceText', 'candidateGold']);
    expect(goldVerifierInput(source, markedGold).candidateGold).not.toHaveProperty('generationMetadata');
    expect(goldVerifierInput(source, markedGold).candidateGold).not.toHaveProperty('semanticVerification');
    const queryInput = queryVerifierInput(source, markedGold, markedQueries);
    expect(Object.keys(queryInput)).toEqual(['sourceText', 'gold', 'relationEdgeIndex', 'candidateQueries']);
    expect(queryInput.gold).not.toHaveProperty('generationMetadata');
    expect(queryInput.gold).not.toHaveProperty('semanticVerification');
    expect(queryInput.candidateQueries).not.toHaveProperty('semanticVerification');
    expect(queryInput.relationEdgeIndex.every((edge) => /^e\d+$|^d\d+$/.test(edge.id))).toBe(true);
  });

  it('paragraph ID와 provenance 변경은 semantic candidate hash를 바꾸지 않는다', () => {
    const { gold } = fixture();
    expect(semanticCandidateHash(gold)).toBe(
      semanticCandidateHash({ ...gold, paragraphId: 'imported-id', generationMetadata: undefined }),
    );
  });

  it('sourceEvidence는 빈 문자열이거나 원문의 정확한 연속 부분 문자열이어야 한다', () => {
    expect(() => assertEvidenceContract('원문의 정확한 근거', {
      summary: '',
      issues: [{ id: 'i1', severity: 'error', category: 'unsupported_content', goldPath: '/nodes/0', sourceSentenceIds: [], sourceEvidence: '원문의 정확한', problem: 'x', suggestedAction: 'remove' }],
    })).not.toThrow();
    expect(() => assertEvidenceContract('원문의 정확한 근거', {
      summary: '',
      issues: [{ id: 'i1', severity: 'error', category: 'unsupported_content', goldPath: '/nodes/0', sourceSentenceIds: [], sourceEvidence: '원문을 바꾼 근거', problem: 'x', suggestedAction: 'remove' }],
    })).toThrow(/연속 부분 문자열/);
    expect(evidenceContractViolations('원문의 정확한 근거', {
      summary: '',
      issues: [{ id: 'i1', severity: 'warning', category: 'title_scope', goldPath: '/nodes/0', sourceSentenceIds: [], sourceEvidence: '바꾼 근거', problem: 'x', suggestedAction: 'narrow' }],
    })).toEqual([{ issueId: 'i1', evidence: '바꾼 근거' }]);
  });

  it('repair는 지정된 JSON Pointer만 결정론적으로 바꾼다', () => {
    expect(applyRepairPlan({ a: { b: 1 }, keep: true }, { repairs: [{
      issueId: 'i1', operation: 'replace', path: '/a/b', replacementJson: '2', explanation: 'fix',
    }] })).toEqual({ a: { b: 2 }, keep: true });
  });

  it('deterministic preflight가 중복 ID와 source/node 참조 오류를 차단한다', () => {
    const { gold, queries } = fixture();
    expect(() => validateGoldStructure(gold)).not.toThrow();
    expect(() => validateQueryStructure(gold, queries)).not.toThrow();
    expect(() => validateGoldStructure({
      ...gold,
      nodes: [...gold.nodes, gold.nodes[0]!],
    })).toThrow(/중복 node ID/);
    expect(() => validateQueryStructure(gold, {
      ...queries,
      paragraphId: '다른-문단',
    })).toThrow(/paragraphId 불일치/);
  });

  it('passed/current hash/fingerprint/zero blockers를 모두 만족해야 gate를 통과한다', () => {
    const { source, gold } = fixture();
    const report = { summary: 'pass', issues: [] };
    const record = makeVerificationRecord({ sourceText: source, candidate: gold, reports: [report, report], repairCycles: 0, reportPaths: ['a', 'b'], verifiedAt: '2026-08-14T00:00:00.000Z' });
    expect(record).toMatchObject({
      status: 'passed', sourceHash: semanticSourceHash(source), candidateHash: semanticCandidateHash(gold), verifierFingerprint: verifierFingerprint(), passes: 2,
    });
    expect(() => assertVerificationGate(source, gold, record)).not.toThrow();
    expect(() => assertVerificationGate(`${source} 변경`, gold, record)).toThrow(/sourceHash/);
    expect(() => assertVerificationGate(source, { ...gold, titleId: 'changed' }, record)).toThrow(/candidateHash/);
  });

  it('content import는 gold와 query 양쪽 semantic gate를 요구한다', () => {
    const source = readFileSync(resolve(root, 'packages/pipeline/src/cli/content-import.ts'), 'utf8');
    expect(source.match(/assertVerificationGate\(/g)).toHaveLength(2);
  });
});
