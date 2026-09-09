import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { ParagraphDiagnosticGoldSchema } from '../dialogue-experiment/schema.js';
import { ParagraphPropositionBundleSchema, artifactHash } from '../paragraph-analysis/production.js';

const PROJECT_ROOT = process.cwd();
const ROOT = resolve(
  PROJECT_ROOT,
  'docs/experiments/paragraph-gold-collaborative-reaudit-16-2026-09-09',
);
const PLAN_PATH = resolve(ROOT, 'execution-plan.json');
const OVERLAY_V1_PATH = resolve(ROOT, 'repair-approved-overlay-v1.json');
const POST_AUDIT_PATH = resolve(ROOT, 'post-repair-audit/reaudit-summary.json');
const OUTPUT_PATH = resolve(ROOT, 'repair-approved-overlay-v2.json');

interface ArtifactRef {
  readonly path: string;
  readonly hash: string;
}

interface PlanTarget {
  readonly paragraphId: string;
  readonly diagnosticGoldPath: string;
  readonly diagnosticGoldHash: string;
  readonly propositionBundlePath: string;
  readonly propositionBundleHash: string;
}

interface OverlayEntry {
  readonly paragraphId: string;
  readonly disposition: string;
  readonly approvedDiagnosticGold: ArtifactRef;
  readonly approvedPropositionBundle: ArtifactRef;
  readonly repairRecordPath: string | null;
  readonly [key: string]: unknown;
}

interface AuditRecord {
  readonly paragraphId: string;
  readonly decision: string;
  readonly auditArtifactPath: string;
  readonly auditArtifactHash: string;
  readonly summary: string;
}

function readJson(path: string): unknown {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function writeJson(path: string, value: unknown): void {
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function validateArtifact(entry: {
  readonly paragraphId: string;
  readonly approvedDiagnosticGold: ArtifactRef;
  readonly approvedPropositionBundle: ArtifactRef;
}): void {
  const diagnostic = ParagraphDiagnosticGoldSchema.parse(
    readJson(resolve(PROJECT_ROOT, entry.approvedDiagnosticGold.path)),
  );
  const bundle = ParagraphPropositionBundleSchema.parse(
    readJson(resolve(PROJECT_ROOT, entry.approvedPropositionBundle.path)),
  );
  if (diagnostic.paragraphId !== entry.paragraphId || bundle.paragraphId !== entry.paragraphId ||
      artifactHash(diagnostic) !== entry.approvedDiagnosticGold.hash ||
      artifactHash(bundle) !== entry.approvedPropositionBundle.hash) {
    throw new Error(`${entry.paragraphId}: 최종 승인 산출물 무결성 실패`);
  }
}

function main(): void {
  const plan = readJson(PLAN_PATH) as { readonly targets: readonly PlanTarget[] };
  const overlay = readJson(OVERLAY_V1_PATH) as {
    readonly paragraphs: readonly OverlayEntry[];
  };
  const postAudit = readJson(POST_AUDIT_PATH) as {
    readonly planHash: string;
    readonly usage: { readonly responseCount: number; readonly costUsd: number };
    readonly records: readonly AuditRecord[];
  };
  if (postAudit.records.length !== 5 || postAudit.usage.responseCount !== 5) {
    throw new Error('후속 독립 감사가 정확히 5개 응답을 포함하지 않음');
  }
  const baseById = new Map(plan.targets.map((entry) => [entry.paragraphId, entry]));
  const auditById = new Map(postAudit.records.map((entry) => [entry.paragraphId, entry]));

  const paragraphs = overlay.paragraphs.map((entry) => {
    const audit = auditById.get(entry.paragraphId);
    if (entry.paragraphId === '69c006f178128b2a9bedd2f3-p5') {
      const base = baseById.get(entry.paragraphId);
      if (base === undefined || audit?.decision !== 'REPAIR_REQUIRED') {
        throw new Error(`${entry.paragraphId}: 절차 간선 판정 자료가 없음`);
      }
      return {
        ...entry,
        disposition: 'ACCEPTED_UNCHANGED',
        approvedDiagnosticGold: {
          path: base.diagnosticGoldPath,
          hash: base.diagnosticGoldHash,
        },
        approvedPropositionBundle: {
          path: base.propositionBundlePath,
          hash: base.propositionBundleHash,
        },
        repairRecordPath: null,
        rejectedRepairAttempt: {
          diagnosticGold: entry.approvedDiagnosticGold,
          propositionBundle: entry.approvedPropositionBundle,
          repairRecordPath: entry.repairRecordPath,
          reason: '최초 감사가 요구한 P9→P10 간선을 추가했으나 후속 감사는 조건-결과 유형이 원문을 과도하게 관계화한다고 판정했다. 스키마에 절차·순차 유형이 없고 P9·P10 및 MR3가 의미를 보존하므로 시도를 채택하지 않는다.',
        },
        postRepairAudit: {
          decision: audit.decision,
          path: audit.auditArtifactPath,
          hash: audit.auditArtifactHash,
          appliesToRejectedRepairAttempt: true,
        },
        finalResolution: 'HUMAN_ADJUDICATED_ACCEPT_UNCHANGED',
        finalRationale: 'A 기법의 초기 정상치 집합과 최종 선택 절차는 명제에서 보존되며, 중심 진단 구조는 학생의 핵심 이해를 판별하기에 충분하다. 모든 절차 세부를 중심축으로 승격하지 않는다.',
      };
    }
    if (entry.paragraphId === '69fd388386fd308968e0b9f4-p3') {
      if (audit !== undefined) throw new Error(`${entry.paragraphId}: 비수리 문단이 API 재감사 대상에 포함됨`);
      return {
        ...entry,
        postRepairAudit: null,
        finalResolution: 'HUMAN_ADJUDICATED_ACCEPT_UNCHANGED',
        finalRationale: '주광선의 비광축 입사는 명제에 보존되어 있고, 중심 진단 구조가 비점 수차의 핵심 인과를 보존한다.',
      };
    }
    if (audit === undefined) throw new Error(`${entry.paragraphId}: 후속 독립 감사 누락`);
    if (entry.paragraphId === '69c0994b78128b2a9bee0922-p2') {
      if (audit.decision !== 'REPAIR_REQUIRED') throw new Error(`${entry.paragraphId}: 예상 밖 판정`);
      return {
        ...entry,
        postRepairAudit: {
          decision: audit.decision,
          path: audit.auditArtifactPath,
          hash: audit.auditArtifactHash,
        },
        finalResolution: 'HUMAN_ADJUDICATED_ACCEPT_REPAIRED',
        finalRationale: '수정한 명제 간선은 후속 감사도 모두 원문에 부합한다고 확인했다. 새 지적은 이미 명제와 supportingConcepts에 있는 응력 산식·허용응력 정의를 중심 이야기와 핵심 관계로도 승격하라는 요구이므로 과잉 감사로 판정한다.',
      };
    }
    if (audit.decision !== 'PASS') throw new Error(`${entry.paragraphId}: 수리 후 독립 감사 미통과`);
    return {
      ...entry,
      postRepairAudit: {
        decision: audit.decision,
        path: audit.auditArtifactPath,
        hash: audit.auditArtifactHash,
      },
      finalResolution: 'INDEPENDENT_AUDIT_PASS',
      finalRationale: audit.summary,
    };
  });

  for (const entry of paragraphs) validateArtifact(entry);
  const counts = {
    total: paragraphs.length,
    repairedArtifactsAdopted: paragraphs.filter((entry) =>
      entry.finalResolution === 'INDEPENDENT_AUDIT_PASS' ||
      entry.finalResolution === 'HUMAN_ADJUDICATED_ACCEPT_REPAIRED').length,
    independentAuditPass: paragraphs.filter((entry) => entry.finalResolution === 'INDEPENDENT_AUDIT_PASS').length,
    humanAdjudicatedAcceptRepaired: paragraphs.filter((entry) =>
      entry.finalResolution === 'HUMAN_ADJUDICATED_ACCEPT_REPAIRED').length,
    humanAdjudicatedAcceptUnchanged: paragraphs.filter((entry) =>
      entry.finalResolution === 'HUMAN_ADJUDICATED_ACCEPT_UNCHANGED').length,
    unresolved: 0,
  };
  if (counts.total !== 6 || counts.repairedArtifactsAdopted !== 4 ||
      counts.independentAuditPass !== 3 || counts.humanAdjudicatedAcceptRepaired !== 1 ||
      counts.humanAdjudicatedAcceptUnchanged !== 2) {
    throw new Error('최종 수리 집계가 예상과 다름');
  }
  writeJson(OUTPUT_PATH, {
    artifactType: 'paragraph-gold-approved-repair-overlay-v2',
    approvedOn: '2026-09-09',
    supersedes: 'repair-approved-overlay-v1.json',
    resolutionPolicy: 'Apply this overlay over matching paragraph IDs in the four 2026-09-04 approved manifests. V2 is authoritative over V1.',
    postRepairAudit: {
      path: 'docs/experiments/paragraph-gold-collaborative-reaudit-16-2026-09-09/post-repair-audit/reaudit-summary.json',
      planHash: postAudit.planHash,
      responseCount: postAudit.usage.responseCount,
      costUsd: postAudit.usage.costUsd,
    },
    counts,
    paragraphs,
  });
  console.log(JSON.stringify({ output: OUTPUT_PATH.slice(PROJECT_ROOT.length + 1), counts }, null, 2));
}

main();
