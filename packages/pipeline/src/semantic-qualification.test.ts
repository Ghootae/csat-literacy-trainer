import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it, vi } from 'vitest';

import type { Gold } from './gold.js';
import {
  applyGuardedRepairPlan,
  assertV2QualificationGate,
  issueBlocksProduction,
  makeVerificationRecordV2,
  parseCompatibleVerificationRecord,
  runSemanticQualification,
  semanticReportHash,
  stableSemanticIssueKey,
  type QualificationVerifierResult,
  type SemanticAssetType,
} from './semantic-qualification.js';
import {
  SEMANTIC_REPORT_SCHEMA_VERSION,
  SEMANTIC_VERIFICATION_EFFORT,
  SEMANTIC_VERIFIER_VERSION,
  semanticVerifierFingerprint,
  type SemanticIssue,
  type SemanticVerificationReport,
  type SegmentEvidenceVerificationReport,
} from './semantic-verification.js';
import { runSelectedSemanticVerifier, type SemanticVerifierDependencies } from './semantic-verification-routing.js';

const SOURCE = '원문의 정확한 근거';
const CLEAN: SemanticVerificationReport = { summary: 'clean', issues: [] };
const WARNING: SemanticVerificationReport = {
  summary: 'warning only',
  issues: [{
    id: 'w1', severity: 'warning', category: 'title_scope', goldPath: '/nodes/0',
    sourceSentenceIds: ['S1'], sourceEvidence: '원문의', problem: '개선 권고', suggestedAction: 'narrow',
  }],
};
const BLOCKER: SemanticVerificationReport = {
  summary: 'blocking',
  issues: [{
    id: 'e1', severity: 'error', category: 'unsupported_content', goldPath: '/nodes/0/text',
    sourceSentenceIds: [], sourceEvidence: '', problem: '원문 밖 내용', suggestedAction: 'remove',
  }],
};

interface TinyCandidate { readonly value: number }

async function execute(
  outputs: readonly (QualificationVerifierResult | Error)[],
  options: {
    readonly maxRepairCycles?: number;
    readonly persistReport?: (report: SemanticVerificationReport, pass: number) => string | undefined;
    readonly persistInvalidReport?: (report: SemanticVerificationReport, pass: number) => string | undefined;
  } = {},
) {
  const queue = [...outputs];
  return runSemanticQualification<TinyCandidate>({
    assetType: 'gold',
    verifierKind: 'gold',
    sourceText: SOURCE,
    initial: { value: 1 },
    provider: 'anthropic',
    model: 'fake-model',
    effort: 'medium',
    promptVersion: 'fake-prompt-v1',
    reportSchemaVersion: SEMANTIC_REPORT_SCHEMA_VERSION,
    ...(options.maxRepairCycles === undefined ? {} : { maxRepairCycles: options.maxRepairCycles }),
    verify: async () => {
      const next = queue.shift();
      if (next === undefined) throw new Error('fake verifier 결과 부족');
      if (next instanceof Error) throw next;
      return next;
    },
    repair: async (candidate, _issues, repairCycle) => ({
      candidate: { value: candidate.value + 1 },
      plan: { repairs: [] },
      diffs: [],
      artifactPath: `repair-${repairCycle}.json`,
    }),
    validate: () => undefined,
    ...(options.persistReport === undefined ? {} : { persistReport: options.persistReport }),
    ...(options.persistInvalidReport === undefined ? {} : {
      persistInvalidReport: options.persistInvalidReport,
    }),
  });
}

function output(report: unknown, invocationId?: string, resultReplay = false): QualificationVerifierResult {
  return {
    output: report,
    ...(invocationId === undefined ? {} : { invocationId }),
    resultReplay,
  };
}

function productionGold(): { sourceText: string; gold: Gold } {
  const id = 'photosynthesis-p4';
  const root = process.cwd();
  const sourceText = (JSON.parse(readFileSync(resolve(root, `content/${id}/passage.json`), 'utf8')) as { text: string }).text;
  const gold = JSON.parse(readFileSync(resolve(root, `content/${id}/gold.json`), 'utf8')) as Gold;
  return { sourceText, gold };
}

describe('semantic qualification 상태 기계', () => {
  it('clean 1회는 아직 qualified가 아니고 서로 다른 clean invocation 2회만 qualified다', async () => {
    const oneThenFailure = await execute([output(CLEAN, 'one'), new Error('중단')]);
    expect(oneThenFailure.status).toBe('incomplete');
    expect(oneThenFailure.cleanStreak).toBe(1);

    const qualified = await execute([output(CLEAN, 'one'), output(CLEAN, 'two')]);
    expect(qualified.status).toBe('qualified');
    expect(qualified.cleanStreak).toBe(2);
    expect(qualified.runs.map((run) => run.invocationId)).toEqual(['one', 'two']);
  });

  it('result replay는 clean streak에 포함하지 않는다', async () => {
    const execution = await execute([output(CLEAN, 'same'), output(CLEAN, 'same', true)]);
    expect(execution.status).toBe('incomplete');
    expect(execution.cleanStreak).toBe(0);
    expect(execution.runs.at(-1)?.resultReplay).toBe(true);
  });

  it('동일 invocation ID를 복제한 clean 결과도 독립 pass로 인정하지 않는다', async () => {
    const execution = await execute([output(CLEAN, 'same'), output(CLEAN, 'same')]);
    expect(execution.status).toBe('incomplete');
    expect(execution.cleanStreak).toBe(0);
    expect(execution.failureReason).toMatch(/동일 invocation/);
  });

  it('blocker는 repair 뒤 clean streak를 처음부터 두 번 다시 쌓는다', async () => {
    const execution = await execute([
      output(BLOCKER, 'block'), output(CLEAN, 'clean-1'), output(CLEAN, 'clean-2'),
    ]);
    expect(execution.status).toBe('qualified');
    expect(execution.repairCycles).toBe(1);
    expect(execution.runs.map((run) => run.verdict)).toEqual(['blocking', 'clean', 'clean']);
    expect(execution.stateHistory).toContain('repairing');
  });

  it('첫 clean 뒤 blocker가 나오면 streak가 0으로 초기화된다', async () => {
    const execution = await execute([output(CLEAN), output(BLOCKER)], { maxRepairCycles: 0 });
    expect(execution.status).toBe('quarantined');
    expect(execution.cleanStreak).toBe(0);
  });

  it('warning-only report는 non-blocking이다', async () => {
    const execution = await execute([output(WARNING), output(WARNING)]);
    expect(execution.status).toBe('qualified');
    expect(execution.runs.every((run) => run.verdict === 'clean')).toBe(true);
    expect(issueBlocksProduction(WARNING.issues[0]!)).toBe(false);
  });

  it('malformed output과 evidence 계약 위반은 incomplete다', async () => {
    expect((await execute([output({ nope: true })])).status).toBe('incomplete');
    const badEvidence: SemanticVerificationReport = {
      summary: 'bad evidence',
      issues: [{ ...WARNING.issues[0]!, sourceEvidence: '원문에 없는 재서술' }],
    };
    expect((await execute([output(badEvidence)])).status).toBe('incomplete');
  });

  it('잘못된 segment ID는 의미 필드를 고정한 1회 교정 뒤에만 clean으로 인정한다', async () => {
    const invalid: SegmentEvidenceVerificationReport = {
      schemaVersion: 'semantic-verification-report-v2-segment-evidence', summary: 'warning',
      issues: [{
        id: 'w1', severity: 'warning', category: 'query_scope', goldPath: '/regions/0',
        sourceEvidenceRefs: [{ sourceSegmentId: 'S99' }], problem: '범위 경고', suggestedAction: 'narrow',
      }],
    };
    const clean: SegmentEvidenceVerificationReport = {
      schemaVersion: 'semantic-verification-report-v2-segment-evidence', summary: 'clean', issues: [],
    };
    const queue = [output(invalid, 'verify-1'), output(clean, 'verify-2')];
    const execution = await runSemanticQualification<TinyCandidate>({
      assetType: 'query', verifierKind: 'query', sourceText: '[S1] 원문',
      evidenceSegments: [{ sourceSegmentId: 'S1', text: '원문' }], initial: { value: 1 },
      provider: 'anthropic', model: 'fake', effort: 'medium', promptVersion: 'segment-v1',
      reportSchemaVersion: 'semantic-verification-report-v2-segment-evidence',
      verify: async () => queue.shift()!,
      correctEvidenceRefs: async (report) => ({
        report: {
          ...report,
          issues: report.issues.map((issue) => ({
            ...issue, sourceEvidenceRefs: [{ sourceSegmentId: 'S1' }],
          })),
        },
        invocationId: 'correction-1',
      }),
      repair: async () => { throw new Error('repair 불필요'); },
      validate: () => undefined,
    });
    expect(execution.status).toBe('qualified');
    expect(execution.runs[0]).toMatchObject({
      verdict: 'clean', evidenceCorrectionInvocationId: 'correction-1',
    });
    expect(execution.reports[0]).toMatchObject({
      issues: [{ sourceEvidenceRefs: [{ sourceSegmentId: 'S1' }] }],
    });
  });

  it('evidence 위반 structured report를 격리 저장하고 clean streak에 포함하지 않는다', async () => {
    const stored = new Map<string, SemanticVerificationReport>();
    const badEvidence = {
      summary: 'bad evidence',
      issues: [{ ...WARNING.issues[0]!, sourceEvidence: '원문에 없는 재서술' }],
      apiKey: 'must-not-be-persisted',
      authorization: 'must-not-be-persisted',
    };
    const execution = await execute([output(badEvidence, 'invalid-1')], {
      persistInvalidReport: (report, pass) => {
        const path = `memory://invalid-pass-${pass}`;
        stored.set(path, report);
        return path;
      },
    });
    const run = execution.runs[0]!;
    expect(execution.status).toBe('incomplete');
    expect(execution.cleanStreak).toBe(0);
    expect(execution.reports).toEqual([]);
    expect(run).toMatchObject({
      verdict: 'incomplete',
      passIndex: 1,
      invalidReportPath: 'memory://invalid-pass-1',
      invalidReportHash: semanticReportHash(stored.get('memory://invalid-pass-1')!),
      failureContract: 'evidence_exact_substring',
      failureIssueId: 'w1',
    });
    expect(run.failureIssueKey).toBe(stableSemanticIssueKey('gold', stored.get('memory://invalid-pass-1')!.issues[0]!));
    expect(stored.get('memory://invalid-pass-1')?.issues[0]?.sourceEvidence).toBe('원문에 없는 재서술');
    expect(JSON.stringify(stored.get('memory://invalid-pass-1'))).not.toMatch(/must-not-be-persisted|authorization|apiKey/);
  });

  it('clean 뒤 invalid report가 나오면 qualification을 완성하지 않는다', async () => {
    const badEvidence: SemanticVerificationReport = {
      summary: 'bad evidence',
      issues: [{ ...WARNING.issues[0]!, sourceEvidence: '원문에 없는 재서술' }],
    };
    const execution = await execute([output(CLEAN, 'clean-1'), output(badEvidence, 'invalid-2')], {
      persistReport: (_report, pass) => `memory://pass-${pass}`,
      persistInvalidReport: (_report, pass) => `memory://invalid-pass-${pass}`,
    });
    expect(execution.status).toBe('incomplete');
    expect(execution.cleanStreak).toBe(0);
    expect(execution.runs.map((run) => run.verdict)).toEqual(['clean', 'incomplete']);
  });

  it('repair cycle 상한을 넘으면 fail-closed quarantined다', async () => {
    const execution = await execute([output(BLOCKER), output(BLOCKER), output(BLOCKER)]);
    expect(execution.status).toBe('quarantined');
    expect(execution.repairCycles).toBe(2);
  });
});

describe('semantic qualification v2 record와 gate', () => {
  async function qualifiedRecord() {
    const { sourceText, gold } = productionGold();
    const reports = new Map<string, SemanticVerificationReport>();
    const execution = await runSemanticQualification<Gold>({
      assetType: 'gold', verifierKind: 'gold', sourceText, initial: gold,
      provider: 'anthropic', model: 'claude-opus-4-8', effort: SEMANTIC_VERIFICATION_EFFORT,
      promptVersion: `${SEMANTIC_VERIFIER_VERSION}:gold`, reportSchemaVersion: SEMANTIC_REPORT_SCHEMA_VERSION,
      verify: vi.fn()
        .mockResolvedValueOnce(output(CLEAN, 'invocation-1'))
        .mockResolvedValueOnce(output(CLEAN, 'invocation-2')),
      repair: async () => { throw new Error('repair 불필요'); },
      validate: () => undefined,
      persistReport: (report, pass) => {
        const path = `memory://report-${pass}`;
        reports.set(path, report);
        return path;
      },
    });
    const fingerprint = semanticVerifierFingerprint('gold');
    const record = makeVerificationRecordV2({
      assetType: 'gold', verifierKind: 'gold', sourceText, candidate: gold,
      verifierFingerprint: fingerprint, execution, createdAt: '2026-08-14T00:00:00.000Z',
    });
    return { sourceText, gold, reports, fingerprint, record };
  }

  it('마지막 두 report의 hash와 서로 다른 invocation을 직접 검증한다', async () => {
    const x = await qualifiedRecord();
    expect(() => assertV2QualificationGate({
      record: x.record, expectedAssetType: 'gold', expectedVerifierKind: 'gold',
      sourceText: x.sourceText, candidate: x.gold, verifierFingerprint: x.fingerprint,
      loadReport: (path) => x.reports.get(path),
    })).not.toThrow();
    expect(x.record.runs.map((run) => run.reportHash)).toEqual([semanticReportHash(CLEAN), semanticReportHash(CLEAN)]);
  });

  it('단일 clean, 동일 invocation, verifier/asset kind 불일치를 차단한다', async () => {
    const x = await qualifiedRecord();
    const gate = (record: unknown, assetType: SemanticAssetType = 'gold', verifierKind: SemanticAssetType = 'gold') =>
      assertV2QualificationGate({
        record, expectedAssetType: assetType, expectedVerifierKind: verifierKind,
        sourceText: x.sourceText, candidate: x.gold, verifierFingerprint: x.fingerprint,
        loadReport: (path) => x.reports.get(path),
      });
    expect(() => gate({ ...x.record, cleanStreak: 1, runs: x.record.runs.slice(0, 1) })).toThrow();
    expect(() => gate({ ...x.record, runs: x.record.runs.map((run) => ({ ...run, invocationId: 'same' })) })).toThrow(/독립/);
    expect(() => gate(x.record, 'query')).toThrow(/asset type/);
    expect(() => gate(x.record, 'gold', 'query')).toThrow(/verifier kind/);
  });

  it('source와 candidate 변경은 기존 qualification을 무효화한다', async () => {
    const x = await qualifiedRecord();
    const base = {
      record: x.record, expectedAssetType: 'gold' as const, expectedVerifierKind: 'gold' as const,
      verifierFingerprint: x.fingerprint, loadReport: (path: string) => x.reports.get(path),
    };
    expect(() => assertV2QualificationGate({ ...base, sourceText: `${x.sourceText} 변경`, candidate: x.gold })).toThrow(/sourceHash/);
    expect(() => assertV2QualificationGate({ ...base, sourceText: x.sourceText, candidate: { ...x.gold, titleId: 'changed' } })).toThrow(/candidateHash/);
  });

  it('격리된 invalid report 뒤 clean 2회만 남으면 gate가 허용하고 invalid 변조는 차단한다', async () => {
    const x = await qualifiedRecord();
    const invalid: SemanticVerificationReport = {
      summary: 'invalid evidence',
      issues: [{ ...WARNING.issues[0]!, sourceEvidence: '원문에 없는 재서술' }],
    };
    const invalidPath = 'memory://invalid-pass-1';
    x.reports.set(invalidPath, invalid);
    const issue = invalid.issues[0]!;
    const invalidRun = {
      ...x.record.runs[0]!,
      invocationId: 'invalid-before-clean-streak',
      verdict: 'incomplete' as const,
      passIndex: 1,
      invalidReportPath: invalidPath,
      invalidReportHash: semanticReportHash(invalid),
      failureContract: 'evidence_exact_substring' as const,
      failureIssueId: issue.id,
      failureIssueKey: stableSemanticIssueKey('gold', issue),
      failureReason: 'w1: sourceEvidence가 원문의 연속 부분 문자열이 아니다',
      issueCount: 1,
      blockingIssueCount: 0,
      reportPath: undefined,
      reportHash: undefined,
    };
    const withInvalidHistory = { ...x.record, runs: [invalidRun, ...x.record.runs] };
    const gate = () => assertV2QualificationGate({
      record: withInvalidHistory,
      expectedAssetType: 'gold',
      expectedVerifierKind: 'gold',
      sourceText: x.sourceText,
      candidate: x.gold,
      verifierFingerprint: x.fingerprint,
      loadReport: (path) => x.reports.get(path),
    });
    expect(gate).not.toThrow();
    x.reports.set(invalidPath, CLEAN);
    expect(gate).toThrow(/invalid qualification report hash/);
  });

  it('v1은 읽을 수 있지만 requalification 대상으로 반환한다', () => {
    const { gold } = productionGold();
    const parsed = parseCompatibleVerificationRecord(gold.semanticVerification);
    expect(parsed.version).toBe('v1');
    expect(parsed.requiresRequalification).toBe(true);
  });
});

describe('repair guard와 verifier routing', () => {
  it('repair는 issue 경로의 허용된 semantic field만 바꾸고 안정적인 issue key를 기록한다', () => {
    const { gold } = productionGold();
    const issue: SemanticIssue = {
      ...BLOCKER.issues[0]!,
      goldPath: '/nodes/0/text',
    };
    const result = applyGuardedRepairPlan({
      assetType: 'gold', candidate: gold, issues: [issue], repairCycle: 1,
      plan: { repairs: [{ issueId: issue.id, operation: 'replace', path: '/nodes/0/text', replacementJson: '"수정"', explanation: '최소 수정' }] },
    });
    expect(result.candidate.nodes[0]?.text).toBe('수정');
    expect(result.diffs[0]?.issueKey).toBe(stableSemanticIssueKey('gold', issue));
  });

  it('allowlist 밖 경로와 보호 metadata 수정을 거부한다', () => {
    const { gold } = productionGold();
    const issue = BLOCKER.issues[0]!;
    expect(() => applyGuardedRepairPlan({
      assetType: 'gold', candidate: gold, issues: [{ ...issue, goldPath: '/sentences/0/text' }], repairCycle: 1,
      plan: { repairs: [{ issueId: issue.id, operation: 'replace', path: '/sentences/0/text', replacementJson: '"변조"', explanation: 'x' }] },
    })).toThrow(/allowlist/);
    expect(() => applyGuardedRepairPlan({
      assetType: 'gold', candidate: gold, issues: [{ ...issue, goldPath: '/paragraphId' }], repairCycle: 1,
      plan: { repairs: [{ issueId: issue.id, operation: 'replace', path: '/paragraphId', replacementJson: '"changed"', explanation: 'x' }] },
    })).toThrow(/보호 metadata/);
  });

  it('gold/query/title 요청을 각 전용 verifier로 보낸다', async () => {
    const { sourceText, gold } = productionGold();
    const queries = JSON.parse(readFileSync(resolve(process.cwd(), 'content/photosynthesis-p4/queries.json'), 'utf8'));
    const dependencies: SemanticVerifierDependencies = {
      gold: vi.fn().mockResolvedValue(CLEAN),
      query: vi.fn().mockResolvedValue(CLEAN),
      titleQuery: vi.fn().mockResolvedValue(CLEAN),
    };
    await runSelectedSemanticVerifier({ kind: 'gold', sourceText, candidate: gold, paragraphId: gold.paragraphId }, dependencies);
    await runSelectedSemanticVerifier({ kind: 'query', sourceText, gold, candidate: queries, paragraphId: gold.paragraphId }, dependencies);
    await runSelectedSemanticVerifier({ kind: 'title-query', sourceText, gold, candidate: queries, paragraphId: gold.paragraphId }, dependencies);
    expect(dependencies.gold).toHaveBeenCalledTimes(1);
    expect(dependencies.query).toHaveBeenCalledTimes(1);
    expect(dependencies.titleQuery).toHaveBeenCalledTimes(1);
  });

  it('full migration과 titles-only가 명시적으로 올바른 kind를 선택한다', () => {
    const source = readFileSync(resolve(process.cwd(), 'packages/pipeline/src/cli/semantic-migrate.ts'), 'utf8');
    expect(source).toContain("kind: 'query', sourceText: passage.text, gold: verifiedGold");
    expect(source).toContain("kind: 'title-query', sourceText: passage.text, gold: verifiedGold");
    expect(source).toContain("kind: 'title-query', sourceText: passage.text, gold, candidate");
    expect(source).not.toContain("kind: 'query', sourceText: passage.text, gold: verifiedGold, candidate: existingTitleQueries");
  });
});
