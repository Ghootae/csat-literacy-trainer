import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { ParagraphDiagnosticGoldSchema } from '../dialogue-experiment/schema.js';
import {
  ParagraphPropositionBundleSchema,
  artifactHash,
} from '../paragraph-analysis/production.js';

const projectRoot = process.cwd();
const batchRoot = resolve(
  projectRoot,
  'docs/experiments/prospective-paragraph-gold-24-2026-09-04/batches/paragraph-gold-batch-002-next-10',
);
const pendingPath = resolve(batchRoot, 'approval-pending-manifest-v1.json');
const approvalPath = resolve(batchRoot, 'approved-manifest-v1.json');

function readJson(path: string): unknown {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function verifyArtifact(pathValue: unknown, hashValue: unknown, kind: 'diagnostic' | 'bundle'): void {
  if (typeof pathValue !== 'string' || typeof hashValue !== 'string') {
    throw new Error('승인 대상의 파일 경로 또는 해시가 없다.');
  }
  const path = resolve(projectRoot, pathValue);
  if (!existsSync(path)) throw new Error(`승인 대상 파일이 없다: ${pathValue}`);
  const value = kind === 'diagnostic'
    ? ParagraphDiagnosticGoldSchema.parse(readJson(path))
    : ParagraphPropositionBundleSchema.parse(readJson(path));
  if (artifactHash(value) !== hashValue) throw new Error(`승인 대상 해시가 다르다: ${pathValue}`);
}

const pending = readJson(pendingPath) as {
  readonly batchId?: unknown;
  readonly counts?: Record<string, unknown>;
  readonly paragraphs?: readonly Record<string, unknown>[];
};
if (
  pending.batchId !== 'paragraph-gold-batch-002-next-10' ||
  pending.counts?.['total'] !== 10 ||
  pending.counts?.['automaticAgentAudited'] !== 7 ||
  pending.counts?.['semiautomaticPendingUserApproval'] !== 3 ||
  !Array.isArray(pending.paragraphs)
) {
  throw new Error('승인 대기 manifest의 배치 또는 집계가 예상과 다르다.');
}

let automaticCount = 0;
let semiautomaticCount = 0;
const paragraphs = pending.paragraphs.map((paragraph) => {
  if (paragraph['approvalLabel'] === 'AUTOMATIC_AGENT_AUDITED') {
    const diagnostic = paragraph['approvedDiagnosticGold'] as Record<string, unknown>;
    const bundle = paragraph['approvedPropositionBundle'] as Record<string, unknown>;
    verifyArtifact(diagnostic?.['path'], diagnostic?.['hash'], 'diagnostic');
    verifyArtifact(bundle?.['path'], bundle?.['hash'], 'bundle');
    automaticCount += 1;
    return {
      ...paragraph,
      approvalEvidence: {
        authority: 'AGENT_AUDIT_PIPELINE',
        userBatchApproval: '2026-09-04 대화에서 두 번째 10문단 전체 승인',
      },
      productionEligible: true,
    };
  }
  if (paragraph['approvalLabel'] === 'SEMIAUTOMATIC_PENDING_USER_APPROVAL') {
    const diagnostic = paragraph['proposedDiagnosticGold'] as Record<string, unknown>;
    const bundle = paragraph['proposedPropositionBundle'] as Record<string, unknown>;
    verifyArtifact(diagnostic?.['path'], diagnostic?.['hash'], 'diagnostic');
    verifyArtifact(bundle?.['path'], bundle?.['hash'], 'bundle');
    const validationPath = resolve(
      batchRoot,
      'collaborative-repair',
      String(paragraph['paragraphId']),
      'validation.json',
    );
    const validation = readJson(validationPath) as {
      readonly schemaValidation?: unknown;
      readonly sourceTextPreserved?: unknown;
      readonly semanticChecks?: readonly { readonly passed?: unknown }[];
    };
    if (
      validation.schemaValidation !== 'PASS' ||
      validation.sourceTextPreserved !== true ||
      !Array.isArray(validation.semanticChecks) ||
      validation.semanticChecks.some((check) => check.passed !== true)
    ) {
      throw new Error(`${String(paragraph['paragraphId'])}: 반자동 수리 검증이 통과하지 않았다.`);
    }
    semiautomaticCount += 1;
    const { proposedDiagnosticGold, proposedPropositionBundle, ...identity } = paragraph;
    return {
      ...identity,
      approvalLabel: 'SEMIAUTOMATIC_USER_AGENT_APPROVED',
      approvedDiagnosticGold: proposedDiagnosticGold,
      approvedPropositionBundle: proposedPropositionBundle,
      approvalEvidence: {
        authority: 'USER',
        record: '2026-09-04 대화에서 두 번째 10문단 전체 승인',
        validationPath: validationPath.replace(`${projectRoot}/`, ''),
      },
      productionEligible: true,
    };
  }
  throw new Error(`지원하지 않는 승인 경로: ${String(paragraph['approvalLabel'])}`);
});

if (automaticCount !== 7 || semiautomaticCount !== 3 || paragraphs.length !== 10) {
  throw new Error(`승인 수 오류: 자동 ${automaticCount}, 반자동 ${semiautomaticCount}`);
}

writeFileSync(approvalPath, `${JSON.stringify({
  artifactType: 'paragraph-gold-approved-batch-manifest-v1',
  batchId: pending.batchId,
  userApprovalRecordedOn: '2026-09-04',
  sourcePendingManifestPath: pendingPath.replace(`${projectRoot}/`, ''),
  sourcePendingManifestHash: artifactHash(pending),
  counts: {
    total: paragraphs.length,
    automaticAgentAudited: automaticCount,
    semiautomaticUserAgentApproved: semiautomaticCount,
    productionEligible: paragraphs.length,
  },
  labels: {
    AUTOMATIC_AGENT_AUDITED: '자동 생성·감사 및 최대 1차 수리 안에서 통과한 문단',
    SEMIAUTOMATIC_USER_AGENT_APPROVED: '자동 단계 후 남은 문제를 사용자와 에이전트가 협업 수리하여 승인한 문단',
  },
  nextBatchPolicy: {
    automaticRepairCycles: 1,
    pauseAfterFirstReaudit: true,
    reportRemainingIssuesBeforeCollaborativeRepair: true,
  },
  paragraphs,
}, null, 2)}\n`, 'utf8');

process.stdout.write(
  `배치 002 승인 기록 완료: 전체 10, 자동 7, 반자동 3\n${approvalPath}\n`,
);
