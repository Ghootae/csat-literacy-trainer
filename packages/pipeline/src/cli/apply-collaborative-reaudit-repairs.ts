import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';

import { ParagraphDiagnosticGoldSchema, type ParagraphDiagnosticGold } from '../dialogue-experiment/schema.js';
import {
  ParagraphPropositionBundleSchema,
  artifactHash,
  type ParagraphPropositionBundle,
} from '../paragraph-analysis/production.js';

const PROJECT_ROOT = process.cwd();
const EXPERIMENT_ROOT = resolve(
  PROJECT_ROOT,
  'docs/experiments/paragraph-gold-collaborative-reaudit-16-2026-09-09',
);
const PLAN_PATH = resolve(EXPERIMENT_ROOT, 'execution-plan.json');
const SUMMARY_PATH = resolve(EXPERIMENT_ROOT, 'reaudit-summary.json');
const OUTPUT_ROOT = resolve(EXPERIMENT_ROOT, 'repairs-v1');
const OVERLAY_PATH = resolve(EXPERIMENT_ROOT, 'repair-approved-overlay-v1.json');
const REPAIR_RUN_PREFIX = 'collaborative-reaudit-repair-2026-09-09';

interface PlanTarget {
  readonly batchId: string;
  readonly sourceId: string;
  readonly paragraphId: string;
  readonly diagnosticGoldPath: string;
  readonly diagnosticGoldHash: string;
  readonly propositionBundlePath: string;
  readonly propositionBundleHash: string;
}

interface SummaryRecord {
  readonly paragraphId: string;
  readonly decision: string;
  readonly auditArtifactPath: string;
  readonly auditArtifactHash: string;
}

interface RepairDefinition {
  readonly paragraphId: string;
  readonly disposition: 'REPAIRED' | 'ACCEPTED_UNCHANGED';
  readonly rationale: string;
  readonly operations: readonly Record<string, unknown>[];
  readonly repair: (
    diagnosticGold: ParagraphDiagnosticGold,
    propositionBundle: ParagraphPropositionBundle,
  ) => {
    readonly diagnosticGold: ParagraphDiagnosticGold;
    readonly propositionBundle: ParagraphPropositionBundle;
  };
}

function readJson(path: string): unknown {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function writeJson(path: string, value: unknown): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function projectPath(path: string): string {
  return relative(PROJECT_ROOT, path);
}

function repairedBundle(
  parent: ParagraphPropositionBundle,
  paragraphId: string,
  changes: Partial<Pick<ParagraphPropositionBundle, 'propositions' | 'propositionEdges'>>,
): ParagraphPropositionBundle {
  return ParagraphPropositionBundleSchema.parse({
    ...parent,
    ...changes,
    derivation: 'AUDIT_REPAIR',
    parentBundleHash: artifactHash(parent),
    repairRunId: `${REPAIR_RUN_PREFIX}-${paragraphId}`,
    auditStatus: 'NOT_AUDITED',
    productionEligible: false,
  });
}

const DEFINITIONS: readonly RepairDefinition[] = [
  {
    paragraphId: '69bcae308095df3b8c53d9a2-p4',
    disposition: 'REPAIRED',
    rationale: '확장성의 두 독립 요건을 중심 진단 구조에 함께 보존하고 E7의 현재까지라는 범위를 명시한다. P12는 이미 “아직 없다”를 포함하므로 변경하지 않는다.',
    operations: [
      { operation: 'EXPAND_CENTRAL_STORY_SCALABILITY_DEFINITION' },
      { operation: 'EXPAND_CORE_RELATION', relationId: 'MR5' },
      { operation: 'RESTORE_TEMPORAL_SCOPE', edgeId: 'E7' },
      { operation: 'REJECT_FALSE_POSITIVE', issueId: 'ISSUE1', reason: 'P12 already contains 아직 없다' },
    ],
    repair: (diagnosticGold, propositionBundle) => {
      const repairedDiagnostic = ParagraphDiagnosticGoldSchema.parse({
        ...diagnosticGold,
        centralStory: '블록체인에서 보안성, 탈중앙성, 확장성은 각각 데이터 변경·중복 방지, 다수 노드의 비지배적 승인 참여, 목표 응용 분야에 적용 가능할 만큼 높은 성능과 노드 증가에도 서비스 유지가 가능한 성질이다. 높은 확장성은 노드 증가에 따른 성능 저하가 크지 않음을 뜻한다. 승인 시간이 줄거나 노드 수가 감소하면 보안성이 낮아지고, 노드 수 감소는 탈중앙성도 낮춘다. 반면 노드 수 증가는 성능을 저하시켜 확장성 확보를 위해 노드 수를 제한하기도 한다. 아직까지 세 특성을 함께 높일 방법이 없어 블록체인은 대규모로 채택되지 못하고 있다.',
        coreRelations: diagnosticGold.coreRelations.map((relation) => relation.id === 'MR5'
          ? {
              ...relation,
              description: '확장성은 목표 응용 분야에 적용 가능할 만큼 성능이 높고 노드 수가 증가해도 서비스 유지가 가능한 성질이며, 높은 확장성은 노드 증가에 따른 성능 저하가 크지 않은 상태를 뜻한다.',
            }
          : relation),
      });
      return {
        diagnosticGold: repairedDiagnostic,
        propositionBundle: repairedBundle(propositionBundle, diagnosticGold.paragraphId, {
          propositionEdges: propositionBundle.propositionEdges.map((edge) => edge.id === 'E7'
            ? {
                ...edge,
                direction: '현재까지 세 특성을 함께 높일 방법의 부재에서 대규모 채택 실패로',
                description: '아직까지 세 특성을 함께 높일 방법이 없어서 블록체인 기술은 대규모로 채택되지 못하고 있다.',
              }
            : edge),
        }),
      };
    },
  },
  {
    paragraphId: '69bffa62fa5063deffe19c88-p6',
    disposition: 'REPAIRED',
    rationale: '일반적인 갱신 거절 사유에서 주택 실거주 예시로 향하도록 E6 방향을 바로잡는다.',
    operations: [{ operation: 'REVERSE_EXAMPLE_EDGE', edgeId: 'E6', from: ['P8'], to: ['P9'] }],
    repair: (diagnosticGold, propositionBundle) => ({
      diagnosticGold,
      propositionBundle: repairedBundle(propositionBundle, diagnosticGold.paragraphId, {
        propositionEdges: propositionBundle.propositionEdges.map((edge) => edge.id === 'E6'
          ? {
              ...edge,
              fromPropositionIds: ['P8'],
              toPropositionIds: ['P9'],
              direction: 'P8 → P9',
              description: '임대인이 임차물인 주택에 실거주하려는 경우는 법정 갱신 거절 사유의 예이다.',
            }
          : edge),
      }),
    }),
  },
  {
    paragraphId: '69c006f178128b2a9bedd2f3-p5',
    disposition: 'REPAIRED',
    rationale: '반복으로 최종 후보군을 얻은 뒤 그 후보군에서 직선 L을 선택하는 절차 연결을 추가한다.',
    operations: [{ operation: 'ADD_PROCEDURAL_EDGE', edgeId: 'E8', from: ['P9'], to: ['P10'] }],
    repair: (diagnosticGold, propositionBundle) => ({
      diagnosticGold,
      propositionBundle: repairedBundle(propositionBundle, diagnosticGold.paragraphId, {
        propositionEdges: [
          ...propositionBundle.propositionEdges,
          {
            id: 'E8',
            fromPropositionIds: ['P9'],
            toPropositionIds: ['P10'],
            type: '조건-결과',
            direction: '반복을 통한 최종 후보군 확보 → 후보군에서 정상치 집합이 최대인 직선을 L로 선택',
            description: '반복 절차로 최종 후보군을 구한 뒤, 그 후보군에 포함된 직선 중 정상치 집합의 데이터 개수가 최대인 직선을 L로 선택한다.',
          },
        ],
      }),
    }),
  },
  {
    paragraphId: '69c0994b78128b2a9bee0922-p2',
    disposition: 'REPAIRED',
    rationale: '원문이 허가하지 않는 계산 요건→중요성 간선과 병렬 정의의 대조 간선을 제거하고, 인장 시험의 두 절차 요소는 대응 관계로 제한한다.',
    operations: [
      { operation: 'REMOVE_UNSUPPORTED_EDGES', edgeIds: ['E4', 'E5'] },
      { operation: 'CHANGE_EDGE_TYPE', edgeId: 'E7', from: '구체화', to: '대응' },
    ],
    repair: (diagnosticGold, propositionBundle) => ({
      diagnosticGold,
      propositionBundle: repairedBundle(propositionBundle, diagnosticGold.paragraphId, {
        propositionEdges: propositionBundle.propositionEdges
          .filter((edge) => edge.id !== 'E4' && edge.id !== 'E5')
          .map((edge) => edge.id === 'E7'
            ? {
                ...edge,
                type: '대응' as const,
                direction: '인장하중의 점진적 변화 ↔ 그 변화에 따른 시편의 늘어난 길이 측정',
                description: '인장 시험에서는 하중을 점진적으로 변화시키면서 그 변화에 따른 시편의 늘어난 길이를 측정한다.',
              }
            : edge),
      }),
    }),
  },
  {
    paragraphId: '69fd388386fd308968e0b9f4-p3',
    disposition: 'ACCEPTED_UNCHANGED',
    rationale: '주광선의 비광축 입사는 명제에 보존되어 있고 중심 진단 구조는 물체점 이탈→회전 대칭성 상실→비점 수차의 핵심 인과를 충분히 보존한다. 중간 단계를 centralStory와 축에 모두 강제하는 것은 과잉 감사로 판정한다.',
    operations: [{ operation: 'HUMAN_ADJUDICATION_NO_CHANGE', rejectedIssueIds: ['ISSUE1', 'ISSUE2'] }],
    repair: (diagnosticGold, propositionBundle) => ({ diagnosticGold, propositionBundle }),
  },
  {
    paragraphId: '6a2294f386fd308968e10e95-p4',
    disposition: 'REPAIRED',
    rationale: '충돌과 흡착을 구체화로 연결한 E2와, 응축핵 형성을 성장의 조건으로 확대한 E4를 제거한다. 각 명제와 E3가 표면 에너지 원인 및 지속적 충돌 원인을 보존한다.',
    operations: [{ operation: 'REMOVE_UNSUPPORTED_EDGES', edgeIds: ['E2', 'E4'] }],
    repair: (diagnosticGold, propositionBundle) => ({
      diagnosticGold,
      propositionBundle: repairedBundle(propositionBundle, diagnosticGold.paragraphId, {
        propositionEdges: propositionBundle.propositionEdges.filter(
          (edge) => edge.id !== 'E2' && edge.id !== 'E4',
        ),
      }),
    }),
  },
] as const;

function main(): void {
  const plan = readJson(PLAN_PATH) as { readonly planHash: string; readonly targets: readonly PlanTarget[] };
  const summary = readJson(SUMMARY_PATH) as {
    readonly records: readonly SummaryRecord[];
  };
  const targetById = new Map(plan.targets.map((target) => [target.paragraphId, target]));
  const summaryById = new Map(summary.records.map((record) => [record.paragraphId, record]));
  const overlayEntries: Record<string, unknown>[] = [];

  for (const definition of DEFINITIONS) {
    const target = targetById.get(definition.paragraphId);
    const audit = summaryById.get(definition.paragraphId);
    if (target === undefined || audit === undefined || audit.decision !== 'REPAIR_REQUIRED') {
      throw new Error(`${definition.paragraphId}: 수리 대상이나 재감사 상태가 예상과 다름`);
    }
    const parentDiagnostic = ParagraphDiagnosticGoldSchema.parse(
      readJson(resolve(PROJECT_ROOT, target.diagnosticGoldPath)),
    );
    const parentBundle = ParagraphPropositionBundleSchema.parse(
      readJson(resolve(PROJECT_ROOT, target.propositionBundlePath)),
    );
    if (artifactHash(parentDiagnostic) !== target.diagnosticGoldHash ||
        artifactHash(parentBundle) !== target.propositionBundleHash) {
      throw new Error(`${definition.paragraphId}: 부모 승인본 해시 불일치`);
    }
    const result = definition.repair(parentDiagnostic, parentBundle);
    const diagnosticGold = ParagraphDiagnosticGoldSchema.parse(result.diagnosticGold);
    const propositionBundle = ParagraphPropositionBundleSchema.parse(result.propositionBundle);
    if (diagnosticGold.paragraphText !== parentDiagnostic.paragraphText ||
        propositionBundle.paragraphHash !== parentBundle.paragraphHash) {
      throw new Error(`${definition.paragraphId}: 원문 무결성 변경`);
    }

    let diagnosticPath = target.diagnosticGoldPath;
    let bundlePath = target.propositionBundlePath;
    if (definition.disposition === 'REPAIRED') {
      const root = resolve(OUTPUT_ROOT, definition.paragraphId);
      diagnosticPath = projectPath(resolve(root, 'diagnostic-gold.json'));
      bundlePath = projectPath(resolve(root, 'proposition-bundle.json'));
      writeJson(resolve(PROJECT_ROOT, diagnosticPath), diagnosticGold);
      writeJson(resolve(PROJECT_ROOT, bundlePath), propositionBundle);
      writeJson(resolve(root, 'repair-record.json'), {
        artifactType: 'collaborative-reaudit-repair-record-v1',
        approvedOn: '2026-09-09',
        paragraphId: definition.paragraphId,
        parentDiagnosticGold: { path: target.diagnosticGoldPath, hash: target.diagnosticGoldHash },
        parentPropositionBundle: { path: target.propositionBundlePath, hash: target.propositionBundleHash },
        sourceAudit: { path: audit.auditArtifactPath, hash: audit.auditArtifactHash },
        rationale: definition.rationale,
        operations: definition.operations,
        repairedDiagnosticGoldHash: artifactHash(diagnosticGold),
        repairedPropositionBundleHash: artifactHash(propositionBundle),
      });
    }

    overlayEntries.push({
      batchId: target.batchId,
      sourceId: target.sourceId,
      paragraphId: target.paragraphId,
      disposition: definition.disposition,
      approvalLabel: 'SEMIAUTOMATIC_USER_AGENT_APPROVED',
      approvalAmendment: '2026-09-09 재감사 지적의 제한 수리 또는 사람 판정 승인',
      productionEligible: true,
      approvedDiagnosticGold: { path: diagnosticPath, hash: artifactHash(diagnosticGold) },
      approvedPropositionBundle: { path: bundlePath, hash: artifactHash(propositionBundle) },
      sourceAudit: { path: audit.auditArtifactPath, hash: audit.auditArtifactHash },
      rationale: definition.rationale,
      repairRecordPath: definition.disposition === 'REPAIRED'
        ? projectPath(resolve(OUTPUT_ROOT, definition.paragraphId, 'repair-record.json'))
        : null,
      postRepairAudit: null,
    });
  }

  writeJson(OVERLAY_PATH, {
    artifactType: 'paragraph-gold-approved-repair-overlay-v1',
    approvedOn: '2026-09-09',
    baseReauditPlanPath: projectPath(PLAN_PATH),
    baseReauditPlanHash: plan.planHash,
    resolutionPolicy: 'Apply an entry from this overlay over the matching paragraph in the four base approved manifests.',
    counts: { total: 6, repaired: 5, acceptedUnchanged: 1, pendingPostRepairAudit: 5 },
    paragraphs: overlayEntries,
  });
  console.log(JSON.stringify({ output: projectPath(OVERLAY_PATH), repaired: 5, acceptedUnchanged: 1 }, null, 2));
}

main();
