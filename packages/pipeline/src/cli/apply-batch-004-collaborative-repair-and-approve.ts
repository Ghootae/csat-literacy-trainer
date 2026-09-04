import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';

import { ParagraphDiagnosticGoldSchema } from '../dialogue-experiment/schema.js';
import {
  ParagraphGoldAuditOutputSchema,
  ParagraphPropositionBundleSchema,
  artifactHash,
  type ParagraphPropositionBundle,
} from '../paragraph-analysis/production.js';

const batchId = 'paragraph-gold-batch-004-three-passages';
const projectRoot = process.cwd();
const batchRoot = resolve(
  projectRoot,
  'docs/experiments/prospective-paragraph-gold-24-2026-09-04/batches',
  batchId,
);
const artifactRoot = resolve(batchRoot, 'artifacts');
const outputRoot = resolve(batchRoot, 'collaborative-repair');
const postFirstManifestPath = resolve(batchRoot, 'post-first-repair-manifest-v1.json');

function readJson(path: string): unknown {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function writeJson(path: string, value: unknown): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function writeText(path: string, value: string): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, value, 'utf8');
}

function projectPath(path: string): string {
  return relative(projectRoot, path);
}

function currentArtifacts(sourceId: string, paragraphId: string) {
  const root = resolve(artifactRoot, sourceId, paragraphId);
  return {
    diagnosticGold: ParagraphDiagnosticGoldSchema.parse(
      readJson(resolve(root, 'diagnostic-gold-repaired.json')),
    ),
    propositionBundle: ParagraphPropositionBundleSchema.parse(
      readJson(resolve(root, 'proposition-bundle-repaired.json')),
    ),
    reaudit: ParagraphGoldAuditOutputSchema.parse(
      (readJson(resolve(root, '06-reaudit.json')) as { readonly result: unknown }).result,
    ),
  };
}

function collaborativeBundle(options: {
  readonly parent: ParagraphPropositionBundle;
  readonly propositions?: ParagraphPropositionBundle['propositions'];
  readonly propositionEdges?: ParagraphPropositionBundle['propositionEdges'];
}): ParagraphPropositionBundle {
  return ParagraphPropositionBundleSchema.parse({
    ...options.parent,
    derivation: 'AUDIT_REPAIR',
    parentBundleHash: artifactHash(options.parent),
    repairRunId: `collaborative-${batchId}-${options.parent.paragraphId}`,
    propositions: options.propositions ?? options.parent.propositions,
    propositionEdges: options.propositionEdges ?? options.parent.propositionEdges,
    auditStatus: 'NOT_AUDITED',
    productionEligible: false,
  });
}

interface SemanticCheck {
  readonly name: string;
  readonly passed: boolean;
  readonly explanation: string;
}

interface RepairResult {
  readonly sourceId: string;
  readonly paragraphId: string;
  readonly title: string;
  readonly repairSummary: string;
  readonly operations: readonly Record<string, unknown>[];
  readonly diagnosticGold: ReturnType<typeof ParagraphDiagnosticGoldSchema.parse>;
  readonly propositionBundle: ParagraphPropositionBundle;
  readonly reaudit: ReturnType<typeof ParagraphGoldAuditOutputSchema.parse>;
  readonly semanticChecks: readonly SemanticCheck[];
}

const results: RepairResult[] = [];

// 결측치·이상치 5문단: 절차적 연속을 목적-수단으로 확정한 두 간선만 제거한다.
{
  const sourceId = '69c006f178128b2a9bedd2f3';
  const paragraphId = `${sourceId}-p5`;
  const current = currentArtifacts(sourceId, paragraphId);
  const propositionEdges = current.propositionBundle.propositionEdges.filter(
    (edge) => edge.id !== 'E1' && edge.id !== 'E6',
  );
  const propositionBundle = collaborativeBundle({
    parent: current.propositionBundle,
    propositionEdges,
  });
  results.push({
    sourceId,
    paragraphId,
    title: '데이터의 결측치와 이상치 처리 · 5문단',
    repairSummary: '절차 순서를 목적-수단 관계로 과도하게 확정한 E1과 E6을 제거하고 명시 사실은 유지했다.',
    operations: [
      { operation: 'REMOVE_UNLICENSED_EDGE', edgeIds: ['E1', 'E6'] },
      { operation: 'PRESERVE_PROPOSITIONS', propositionIds: current.propositionBundle.propositions.map((item) => item.id) },
    ],
    diagnosticGold: current.diagnosticGold,
    propositionBundle,
    reaudit: current.reaudit,
    semanticChecks: [
      {
        name: '과도한 목적-수단 간선 제거',
        passed: !propositionEdges.some((edge) => edge.id === 'E1' || edge.id === 'E6'),
        explanation: '원문이 명시하지 않은 목적 관계만 제거한다.',
      },
      {
        name: '절차 명제 보존',
        passed: propositionBundle.propositions.length === current.propositionBundle.propositions.length &&
          propositionBundle.propositions.some((item) => item.id === 'P2') &&
          propositionBundle.propositions.some((item) => item.id === 'P3') &&
          propositionBundle.propositions.some((item) => item.id === 'P9') &&
          propositionBundle.propositions.some((item) => item.id === 'P10'),
        explanation: '두 점 선택, 후보 직선 구성, 반복, 최종 선택 사실은 모두 남긴다.',
      },
    ],
  });
}

// 법 모델 4문단: 원문에 없는 시간 순서 부사만 제거한다.
{
  const sourceId = '69bffa62fa5063deffe19c88';
  const paragraphId = `${sourceId}-p4`;
  const current = currentArtifacts(sourceId, paragraphId);
  const diagnosticGold = ParagraphDiagnosticGoldSchema.parse({
    ...current.diagnosticGold,
    centralStory:
      '세 법 모델은 시대의 요구에 따라 등장했지만, 후속 모델이 선행 모델을 대체하여 법체계를 ' +
      '지배해 온 것은 아니다. 각 모델은 고유한 타당성과 필요성을 지닌 채 현재의 법체계 안에 공존한다.',
  });
  const propositionBundle = collaborativeBundle({ parent: current.propositionBundle });
  results.push({
    sourceId,
    paragraphId,
    title: '법 모델과 임대차 보호 제도 · 4문단',
    repairSummary: 'centralStory에서 원문이 명시하지 않은 시간 순서 표현인 ‘차례로’를 제거했다.',
    operations: [{ operation: 'REMOVE_UNSUPPORTED_TEMPORAL_QUALIFIER', target: 'centralStory', value: '차례로' }],
    diagnosticGold,
    propositionBundle,
    reaudit: current.reaudit,
    semanticChecks: [
      {
        name: '근거 없는 시간 순서 제거',
        passed: !diagnosticGold.centralStory.includes('차례로') &&
          diagnosticGold.centralStory.includes('시대의 요구에 따라 등장'),
        explanation: '등장 사실은 보존하고 명시되지 않은 순차성만 제거한다.',
      },
      {
        name: '대체 부정과 공존 의미 보존',
        passed: diagnosticGold.centralStory.includes('대체하여 법체계를 지배해 온 것은 아니다') &&
          diagnosticGold.centralStory.includes('현재의 법체계 안에 공존'),
        explanation: '문단의 두 핵심 방향은 그대로 유지한다.',
      },
    ],
  });
}

// 법 모델 6문단: 계약 원칙과 임차인 보호 예외의 대비를 중심 진단 구조에 복원한다.
{
  const sourceId = '69bffa62fa5063deffe19c88';
  const paragraphId = `${sourceId}-p6`;
  const current = currentArtifacts(sourceId, paragraphId);
  const diagnosticGold = ParagraphDiagnosticGoldSchema.parse({
    ...current.diagnosticGold,
    centralObject:
      '임대차 내용의 계약 결정 원칙과 주택·상가에서 계약보다 우선하는 임차인 보호 제도, ' +
      '특히 최단 존속 기간과 갱신 요구권의 작동 및 제한',
    centralStory:
      '임대차 내용은 원칙적으로 계약으로 정해지지만, 생활·생업의 근거인 주택·상가에서는 ' +
      '계약만으로 임차인 보호가 어려워 법정 제도가 계약보다 우선하고 짧게 정한 계약기간에도 ' +
      '최단 존속 기간을 보장한다. 종료 전 정해진 기간에 임대인이 종료를 요구할 때 임차인이 ' +
      '갱신 요구권을 행사하면 최단 존속 기간만큼 연장되지만, 이 권리는 기간이 정해진 임대차에 ' +
      '한정되고 임대인이 법정 거절 사유를 증명하면 갱신을 거절할 수 있다.',
    centralAxes: current.diagnosticGold.centralAxes.map((axis) => axis.id === 'AX1'
      ? {
          ...axis,
          description:
            '임대차 내용은 원칙적으로 계약으로 정해지지만, 생활·생업의 근거인 주택·상가에서는 ' +
            '계약만으로 임차인 보호가 어려워 법정 제도가 계약보다 우선하며 짧은 약정 기간에도 ' +
            '최단 존속 기간을 보장한다.',
        }
      : axis),
    coreRelations: current.diagnosticGold.coreRelations.map((relation) => relation.id === 'MR1'
      ? {
          ...relation,
          description:
            '임대차 내용은 원칙적으로 계약으로 정해지지만, 생활·생업의 근거인 주택·상가에서는 ' +
            '계약만으로 임차인 보호가 어려워 임대차보호법상 제도가 계약보다 우선 적용된다.',
        }
      : relation),
    keyMappings: [
      { left: '임대차 내용 결정의 원칙', right: '계약으로 정함' },
      ...(current.diagnosticGold.keyMappings ?? []),
    ],
  });
  const propositionBundle = collaborativeBundle({ parent: current.propositionBundle });
  results.push({
    sourceId,
    paragraphId,
    title: '법 모델과 임대차 보호 제도 · 6문단',
    repairSummary: '임대차의 계약 결정 원칙과 주택·상가 보호 제도의 예외·우선 관계를 중심 이야기·축·핵심 관계에 복원했다.',
    operations: [
      { operation: 'RESTORE_PRINCIPLE_EXCEPTION_CONTRAST', targetIds: ['centralObject', 'centralStory', 'AX1', 'MR1'] },
      { operation: 'ADD_KEY_MAPPING', left: '임대차 내용 결정의 원칙', right: '계약으로 정함' },
    ],
    diagnosticGold,
    propositionBundle,
    reaudit: current.reaudit,
    semanticChecks: [
      {
        name: '계약 원칙 복원',
        passed: diagnosticGold.centralStory.startsWith('임대차 내용은 원칙적으로 계약으로 정해지지만') &&
          diagnosticGold.centralAxes.some((axis) => axis.id === 'AX1' && axis.description.includes('원칙적으로 계약')) &&
          diagnosticGold.coreRelations.some((relation) => relation.id === 'MR1' && relation.description.includes('원칙적으로 계약')),
        explanation: 'P1의 원칙을 중심 진단 구조에서 추적할 수 있다.',
      },
      {
        name: '주택·상가 예외와 후속 제도 보존',
        passed: diagnosticGold.centralStory.includes('법정 제도가 계약보다 우선') &&
          diagnosticGold.centralStory.includes('갱신 요구권') &&
          diagnosticGold.coreRelations.length === 5,
        explanation: '원칙을 복원하면서 기존 보호 제도와 갱신 제한을 잃지 않는다.',
      },
    ],
  });
}

// 법 모델 8문단: 조정 개시의 필수 조건과 합의 여부에 따른 절차 분기를 보존한다.
{
  const sourceId = '69bffa62fa5063deffe19c88';
  const paragraphId = `${sourceId}-p8`;
  const current = currentArtifacts(sourceId, paragraphId);
  const propositions = current.propositionBundle.propositions.map((proposition) => proposition.id === 'P6'
    ? {
        ...proposition,
        description:
          '임대차 분쟁 조정 절차는 당사자들이 분쟁 해결을 위해 그 절차를 따르기로 합의해야 시작된다.',
      }
    : proposition);
  const propositionEdges: ParagraphPropositionBundle['propositionEdges'] = [
    ...current.propositionBundle.propositionEdges,
    {
      id: 'E4',
      fromPropositionIds: ['P6'],
      toPropositionIds: ['P8'],
      type: '대조',
      direction: '조정 절차 합의가 있어야 조정이 시작됨 ↔ 합의가 이루어지지 않으면 재판 절차를 따라야 함',
      description: '당사자의 합의 성립 여부에 따라 조정 개시와 재판 절차 적용으로 갈리는 두 조건부 경로를 대조한다.',
    },
  ];
  const propositionBundle = collaborativeBundle({
    parent: current.propositionBundle,
    propositions,
    propositionEdges,
  });
  results.push({
    sourceId,
    paragraphId,
    title: '법 모델과 임대차 보호 제도 · 8문단',
    repairSummary: '조정 개시 합의를 필수 조건으로 복원하고, 합의 성립 여부에 따른 조정·재판 절차 분기를 E4에 명시했다.',
    operations: [
      { operation: 'RESTORE_NECESSARY_CONDITION_MODALITY', targetId: 'P6' },
      { operation: 'ADD_CONDITIONAL_BRANCH_EDGE', edgeId: 'E4', branchPropositionIds: ['P6', 'P8'] },
    ],
    diagnosticGold: current.diagnosticGold,
    propositionBundle,
    reaudit: current.reaudit,
    semanticChecks: [
      {
        name: '조정 개시의 필수 조건 보존',
        passed: propositionBundle.propositions.some((proposition) =>
          proposition.id === 'P6' && proposition.description.endsWith('합의해야 시작된다.')),
        explanation: '‘시작될 수 있다’라는 가능성 약화를 제거한다.',
      },
      {
        name: '합의 여부에 따른 절차 분기 보존',
        passed: propositionBundle.propositionEdges.some((edge) =>
          edge.id === 'E4' && edge.fromPropositionIds.includes('P6') &&
          edge.toPropositionIds.includes('P8') && edge.description.includes('두 조건부 경로')),
        explanation: '합의 시 조정 개시와 합의 불성립 시 재판 적용을 하나의 분기 구조로 추적한다.',
      },
    ],
  });
}

for (const result of results) {
  if (result.reaudit.decision !== 'REPAIR_REQUIRED') {
    throw new Error(`${result.paragraphId}: 협업 수리 대상의 재감사 상태가 다르다.`);
  }
  if (result.semanticChecks.some((check) => !check.passed)) {
    throw new Error(`${result.paragraphId}: 의미 검사가 실패했다.`);
  }
  if (result.diagnosticGold.paragraphId !== result.paragraphId ||
      result.propositionBundle.paragraphId !== result.paragraphId) {
    throw new Error(`${result.paragraphId}: 원천 ID가 바뀌었다.`);
  }
  const root = resolve(outputRoot, result.paragraphId);
  writeJson(resolve(root, 'diagnostic-gold.json'), result.diagnosticGold);
  writeJson(resolve(root, 'proposition-bundle.json'), result.propositionBundle);
  writeJson(resolve(root, 'repair.json'), {
    artifactType: 'paragraph-gold-collaborative-repair-v1',
    batchId,
    sourceId: result.sourceId,
    paragraphId: result.paragraphId,
    parentDiagnosticGoldHash: artifactHash(currentArtifacts(result.sourceId, result.paragraphId).diagnosticGold),
    parentPropositionBundleHash: result.propositionBundle.parentBundleHash,
    sourceReauditHash: artifactHash(result.reaudit),
    repairSummary: result.repairSummary,
    operations: result.operations,
    apiExecutionAdded: false,
  });
  writeJson(resolve(root, 'validation.json'), {
    artifactType: 'paragraph-gold-collaborative-validation-v1',
    batchId,
    paragraphId: result.paragraphId,
    schemaValidation: 'PASS',
    sourceTextPreserved: result.diagnosticGold.paragraphText ===
      currentArtifacts(result.sourceId, result.paragraphId).diagnosticGold.paragraphText,
    semanticChecks: result.semanticChecks,
    status: 'SEMIAUTOMATIC_USER_AGENT_APPROVED',
  });
}

const casebook = {
  artifactType: 'paragraph-gold-collaborative-casebook-v1',
  batchId,
  cases: [
    {
      caseId: 'PGC-016',
      paragraphId: '69c006f178128b2a9bedd2f3-p5',
      problemType: 'PROCEDURAL_SEQUENCE_AS_PURPOSE_MEANS',
      generalizedRule: 'PG-RULE-001_EDGE_EVIDENCE_BEFORE_DIRECTION',
      resolution: '절차 순서는 명제로 보존하되 원문이 목적 관계를 허가하지 않는 E1·E6을 제거했다.',
    },
    {
      caseId: 'PGC-017',
      paragraphId: '69bffa62fa5063deffe19c88-p4',
      problemType: 'UNSUPPORTED_TEMPORAL_QUALIFIER',
      generalizedRule: null,
      resolution: '등장 사실은 유지하고 근거 없는 순차 부사 ‘차례로’만 제거했다.',
    },
    {
      caseId: 'PGC-018',
      paragraphId: '69bffa62fa5063deffe19c88-p6',
      problemType: 'PRINCIPLE_EXCEPTION_COVERAGE_LOSS',
      generalizedRule: 'PG-RULE-003_DIAGNOSTIC_COVERAGE_INVARIANT',
      resolution: '계약 결정 원칙과 임차인 보호 예외의 대비를 중심 이야기·축·핵심 관계에 복원했다.',
    },
    {
      caseId: 'PGC-019',
      paragraphId: '69bffa62fa5063deffe19c88-p8',
      problemType: 'NECESSARY_CONDITION_WEAKENED_TO_POSSIBILITY',
      generalizedRule: 'PG-RULE-002_QUALIFIER_SCOPE_FIDELITY',
      resolution: '조정 개시에는 합의가 필요하다는 필수 조건 양상을 복원했다.',
    },
    {
      caseId: 'PGC-020',
      paragraphId: '69bffa62fa5063deffe19c88-p8',
      problemType: 'CONDITIONAL_BRANCH_EDGE_OMISSION',
      generalizedRule: 'PG-RULE-003_DIAGNOSTIC_COVERAGE_INVARIANT',
      resolution: '합의 성립과 불성립에 따른 조정·재판 절차 분기를 하나의 대조 간선으로 추가했다.',
    },
  ],
};
writeJson(resolve(outputRoot, 'casebook.json'), casebook);

writeJson(resolve(outputRoot, 'summary.json'), {
  artifactType: 'paragraph-gold-collaborative-repair-summary-v1',
  batchId,
  repairedParagraphCount: results.length,
  results: results.map((result) => ({
    paragraphId: result.paragraphId,
    title: result.title,
    repairSummary: result.repairSummary,
    semanticChecks: result.semanticChecks,
    status: 'SEMIAUTOMATIC_USER_AGENT_APPROVED',
  })),
  automaticAgentAuditedCount: 14,
  semiautomaticUserAgentApprovedCount: results.length,
  productionEligibleCount: 18,
  apiExecutionAddedByCollaborativeRepair: { responseCount: 0, costUsd: 0 },
});

const postFirst = readJson(postFirstManifestPath) as {
  readonly counts?: Record<string, unknown>;
  readonly paragraphs?: readonly Record<string, unknown>[];
};
if (postFirst.counts?.['automaticAgentAudited'] !== 14 ||
    postFirst.counts?.['reviewRequired'] !== 4 || !Array.isArray(postFirst.paragraphs)) {
  throw new Error('1차 수리 후 manifest 집계가 예상과 다르다.');
}

const resultByParagraph = new Map(results.map((result) => [result.paragraphId, result]));
const approvedParagraphs = postFirst.paragraphs.map((paragraph) => {
  const paragraphId = String(paragraph['paragraphId']);
  const sourceId = String(paragraph['sourceId']);
  const collaborative = resultByParagraph.get(paragraphId);
  if (collaborative !== undefined) {
    const root = resolve(outputRoot, paragraphId);
    const diagnosticGold = ParagraphDiagnosticGoldSchema.parse(readJson(resolve(root, 'diagnostic-gold.json')));
    const propositionBundle = ParagraphPropositionBundleSchema.parse(readJson(resolve(root, 'proposition-bundle.json')));
    return {
      sourceId,
      paragraphId,
      approvalLabel: 'SEMIAUTOMATIC_USER_AGENT_APPROVED',
      productionEligible: true,
      approvedDiagnosticGold: {
        path: projectPath(resolve(root, 'diagnostic-gold.json')),
        hash: artifactHash(diagnosticGold),
      },
      approvedPropositionBundle: {
        path: projectPath(resolve(root, 'proposition-bundle.json')),
        hash: artifactHash(propositionBundle),
      },
      approvalEvidence: {
        authority: 'USER',
        record: '2026-09-04 대화에서 배치 004의 세 지문 검토·수정 후 전체 승인',
        validationPath: projectPath(resolve(root, 'validation.json')),
      },
    };
  }
  if (paragraph['status'] !== 'AGENT_AUDITED' || paragraph['productionEligible'] !== true) {
    throw new Error(`${paragraphId}: 자동 승인 대상 상태가 아니다.`);
  }
  const diagnosticInfo = paragraph['currentDiagnosticGold'] as Record<string, unknown>;
  const bundleInfo = paragraph['currentPropositionBundle'] as Record<string, unknown>;
  const diagnosticPath = resolve(batchRoot, String(diagnosticInfo['path']));
  const bundlePath = resolve(batchRoot, String(bundleInfo['path']));
  const diagnosticGold = ParagraphDiagnosticGoldSchema.parse(readJson(diagnosticPath));
  const propositionBundle = ParagraphPropositionBundleSchema.parse(readJson(bundlePath));
  if (artifactHash(diagnosticGold) !== diagnosticInfo['hash'] ||
      artifactHash(propositionBundle) !== bundleInfo['hash']) {
    throw new Error(`${paragraphId}: 자동 통과 산출물 해시가 다르다.`);
  }
  return {
    sourceId,
    paragraphId,
    approvalLabel: 'AUTOMATIC_AGENT_AUDITED',
    productionEligible: true,
    approvedDiagnosticGold: {
      path: projectPath(diagnosticPath),
      hash: artifactHash(diagnosticGold),
    },
    approvedPropositionBundle: {
      path: projectPath(bundlePath),
      hash: artifactHash(propositionBundle),
    },
    approvalEvidence: {
      authority: 'AGENT_AUDIT_PIPELINE',
      userBatchApproval: '2026-09-04 대화에서 배치 004의 세 지문 전체 승인',
    },
  };
});

if (approvedParagraphs.length !== 18 ||
    approvedParagraphs.filter((item) => item.approvalLabel === 'AUTOMATIC_AGENT_AUDITED').length !== 14 ||
    approvedParagraphs.filter((item) => item.approvalLabel === 'SEMIAUTOMATIC_USER_AGENT_APPROVED').length !== 4) {
  throw new Error('최종 승인 집계가 예상과 다르다.');
}

writeJson(resolve(batchRoot, 'approved-manifest-v1.json'), {
  artifactType: 'paragraph-gold-approved-batch-manifest-v1',
  batchId,
  userApprovalRecordedOn: '2026-09-04',
  sourcePostFirstRepairManifestPath: projectPath(postFirstManifestPath),
  sourcePostFirstRepairManifestHash: artifactHash(postFirst),
  counts: {
    passages: 3,
    passageComplete: 3,
    total: 18,
    automaticAgentAudited: 14,
    semiautomaticUserAgentApproved: 4,
    productionEligible: 18,
  },
  labels: {
    AUTOMATIC_AGENT_AUDITED: '자동 생성·감사 및 최대 1차 수리 안에서 통과한 문단',
    SEMIAUTOMATIC_USER_AGENT_APPROVED: '자동 단계 후 남은 문제를 사용자와 에이전트가 협업 수리하여 승인한 문단',
  },
  paragraphs: approvedParagraphs,
});

const report = `# 배치 004 세 지문 협업 수리 및 승인 보고

## 1. 전체 맥락

배치 004의 세 지문 18문단 중 14문단은 자동 감사 경로로 통과했고, 4문단은 한 차례 자동 수리
후에도 의미 쟁점이 남아 검토 대기 상태였다. 이번 작업에서는 이 네 문단만 원문과 재감사 결과에
맞춰 협업 수리하고 세 지문 전체의 승인 상태를 확정했다.

## 2. 수행한 작업에 대한 목적

자동 수리를 반복하지 않고 남은 문제만 좁게 고쳐, 정상인 14문단을 훼손하지 않으면서 세 지문의
모든 문단을 문제 골드 입력으로 사용할 수 있게 하는 것이 목적이다. 자동 성공과 협업 성공의
계보는 별도 라벨로 유지한다.

## 3. 작업 과정

- 네 검토 대상의 원문, 최초 골드, 1차 수리본과 재감사 쟁점을 대조했다.
- 지적된 의미 결함만 별도 자식 산출물에서 수정했다.
- 문단 ID와 원문 보존, JSON 스키마, 명제·간선 참조, 사례별 의미 조건을 검사했다.
- 자동 통과 14문단의 실제 산출물 해시도 다시 확인했다.
- 새로운 유료 API 호출은 하지 않았다.

## 4. 작업 결과

| 지문 | 자동 성공 | 협업 성공 | 최종 승인 |
|---|---:|---:|---:|
| 데이터의 결측치와 이상치 처리 | 4 | 1 | 5/5 |
| 유동성과 금리의 관계 | 5 | 0 | 5/5 |
| 법 모델과 임대차 보호 제도 | 5 | 3 | 8/8 |
| 합계 | 14 | 4 | 18/18 |

협업 수정은 다음과 같다.

1. 결측치·이상치 5문단: 절차적 연속을 목적-수단으로 과도하게 표현한 E1·E6만 삭제했다.
2. 법 모델 4문단: 원문에 없는 시간 순서 표현 ‘차례로’를 중심 이야기에서 삭제했다.
3. 법 모델 6문단: 계약 결정 원칙과 주택·상가 보호 예외의 대비를 중심 이야기·축·핵심 관계에 복원했다.
4. 법 모델 8문단: 조정 개시 합의를 필수 조건으로 복원하고, 합의 여부에 따른 조정·재판 분기를 추가했다.

모든 수정본은 스키마·원문 보존·의미 검사를 통과했다. 18문단 모두 productionEligible=true로
승인됐고, 세 지문 모두 지문 단위 완료 상태다.

## 5. 결과 해석

이번 네 건 중 세 건은 이미 일반화한 간선 근거, 조건·양상 보존, 진단 coverage 규칙의 재발
사례였다. 따라서 기존 일반화 판단은 유지된다. ‘차례로’ 추가는 아직 독립 일반 규칙으로 만들
근거가 부족하므로 사례로만 기록했다.

자동 성공 14개와 협업 성공 4개를 구분했기 때문에, 이후 문제 골드 생성에서는 18개를 모두
사용하면서도 어느 문단이 사람-에이전트 협업 경로를 거쳤는지 추적할 수 있다.
`;
writeText(resolve(batchRoot, 'COLLABORATIVE-REPAIR-AND-APPROVAL-REPORT.md'), report);

process.stdout.write('배치 004 승인 완료: 전체 18, 자동 14, 협업 4, 완료 지문 3\n');
