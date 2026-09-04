import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';

import { ParagraphDiagnosticGoldSchema } from '../dialogue-experiment/schema.js';
import { ParagraphAnalysisResultV3Schema } from '../paragraph-analysis/schema.js';
import {
  ParagraphGoldAuditOutputSchema,
  ParagraphPropositionBundleSchema,
  artifactHash,
  createParagraphPropositionBundle,
  type ParagraphPropositionBundle,
} from '../paragraph-analysis/production.js';

const batchId = 'paragraph-gold-batch-002-next-10';
const projectRoot = process.cwd();
const batchRoot = resolve(
  projectRoot,
  'docs/experiments/prospective-paragraph-gold-24-2026-09-04/batches',
  batchId,
);
const artifactRoot = resolve(batchRoot, 'artifacts');
const outputRoot = resolve(batchRoot, 'collaborative-repair');

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

function paragraphDir(sourceId: string, paragraphId: string): string {
  return resolve(artifactRoot, sourceId, paragraphId);
}

function initialBundle(sourceId: string, paragraphId: string): ParagraphPropositionBundle {
  const dir = paragraphDir(sourceId, paragraphId);
  const source = readJson(resolve(dir, '00-source.json')) as {
    readonly passageId: string;
    readonly passageHash: string;
    readonly paragraph: { readonly position: number };
  };
  const analysisArtifact = readJson(resolve(dir, '01-analysis.json')) as {
    readonly result: unknown;
    readonly metadata?: { readonly responseId?: unknown };
  };
  const analysis = ParagraphAnalysisResultV3Schema.parse(analysisArtifact.result);
  const responseId = analysisArtifact.metadata?.responseId;
  if (typeof responseId !== 'string') throw new Error(`${paragraphId}: 분석 response ID가 없다.`);
  return createParagraphPropositionBundle({
    sourceId,
    passageId: source.passageId,
    position: source.paragraph.position,
    passageHash: source.passageHash,
    analysisRunId: responseId,
    analysis,
  });
}

function collaborativeBundle(
  parent: ParagraphPropositionBundle,
  propositions: ParagraphPropositionBundle['propositions'] = parent.propositions,
): ParagraphPropositionBundle {
  return ParagraphPropositionBundleSchema.parse({
    ...parent,
    derivation: 'AUDIT_REPAIR',
    parentBundleHash: artifactHash(parent),
    repairRunId: `collaborative-${batchId}-${parent.paragraphId}`,
    propositions,
    auditStatus: 'NOT_AUDITED',
    productionEligible: false,
  });
}

interface CollaborativeResult {
  readonly sourceId: string;
  readonly paragraphId: string;
  readonly title: string;
  readonly repairSummary: string;
  readonly issueSource: Record<string, unknown>;
  readonly operations: readonly Record<string, unknown>[];
  readonly diagnosticGold: ReturnType<typeof ParagraphDiagnosticGoldSchema.parse>;
  readonly propositionBundle: ParagraphPropositionBundle;
  readonly semanticChecks: readonly {
    readonly name: string;
    readonly passed: boolean;
    readonly explanation: string;
  }[];
}

const results: CollaborativeResult[] = [];

{
  const sourceId = '69c0994b78128b2a9bee0922';
  const paragraphId = `${sourceId}-p2`;
  const dir = paragraphDir(sourceId, paragraphId);
  const analysisArtifact = readJson(resolve(dir, '01-analysis.json')) as { readonly result: unknown };
  const analysis = ParagraphAnalysisResultV3Schema.parse(analysisArtifact.result);
  const mappingArtifact = readJson(resolve(dir, '03-mapping.json')) as {
    readonly result: { readonly verdict?: unknown; readonly issues?: unknown };
  };
  const parent = initialBundle(sourceId, paragraphId);
  const centralStory =
    '수직하중 중 부재를 수축시키는 힘은 압축하중이고 부재를 늘리는 힘은 인장하중이다. ' +
    '부재는 일반적으로 압축하중보다 인장하중에 더 취약하므로, 구조물 설계에서는 인장하중에 ' +
    '대한 허용하중이 중요하며 이를 계산하려면 먼저 허용응력을 구해야 한다. 인장 허용응력 ' +
    '산출에 필요한 재료의 물리적 성질은 인장하중을 점진적으로 늘리고 그에 따른 시편의 늘어난 ' +
    '길이를 측정하는 인장 시험으로 파악한다.';
  const diagnosticGold = ParagraphDiagnosticGoldSchema.parse({
    ...analysis.diagnosticGold,
    centralStory,
    centralAxes: [{
      id: 'AX1',
      description:
        '수직하중의 압축·인장 방향을 구분하고, 부재의 인장 취약성에 대응하여 인장 허용하중·' +
        '허용응력을 산정하며, 필요한 재료 물성을 인장 시험으로 파악하는 과정',
      relationIds: ['MR1', 'MR2', 'MR3', 'MR4', 'MR5'],
    }],
  });
  const propositionBundle = collaborativeBundle(parent);
  const semanticChecks = [
    {
      name: '누락된 핵심 관계를 중심 서사에 복원',
      passed: diagnosticGold.centralStory.includes('부재를 수축시키는 힘은 압축하중') &&
        diagnosticGold.centralStory.includes('부재를 늘리는 힘은 인장하중'),
      explanation: 'core로 분류된 MR1의 압축·인장 방향 구분이 중심 서사에도 명시된다.',
    },
    {
      name: '모든 핵심 관계의 중심축 연결',
      passed: diagnosticGold.centralAxes[0]?.relationIds.join(',') === 'MR1,MR2,MR3,MR4,MR5',
      explanation: '중심축이 문단의 다섯 핵심 관계를 빠짐없이 참조한다.',
    },
  ];
  results.push({
    sourceId,
    paragraphId,
    title: '구조물의 하중과 허용응력 · 2문단',
    repairSummary: 'core 관계 MR1이 중심 서사와 중심축에서 빠진 불일치를 복원했다.',
    issueSource: {
      type: 'AXIS_MAPPING_NEEDS_REVIEW',
      verdict: mappingArtifact.result.verdict,
      issues: mappingArtifact.result.issues,
    },
    operations: [
      { operation: 'EXPAND_CENTRAL_STORY', relationId: 'MR1' },
      { operation: 'MAP_CORE_RELATION_TO_AXIS', relationId: 'MR1', axisId: 'AX1' },
    ],
    diagnosticGold,
    propositionBundle,
    semanticChecks,
  });
}

{
  const sourceId = '6a2294f386fd308968e10e95';
  const paragraphId = `${sourceId}-p4`;
  const dir = paragraphDir(sourceId, paragraphId);
  const analysisArtifact = readJson(resolve(dir, '01-analysis.json')) as { readonly result: unknown };
  const analysis = ParagraphAnalysisResultV3Schema.parse(analysisArtifact.result);
  const mappingArtifact = readJson(resolve(dir, '03-mapping.json')) as {
    readonly result: { readonly verdict?: unknown; readonly issues?: unknown };
  };
  const parent = initialBundle(sourceId, paragraphId);
  const mr2 = analysis.majorRelations.find((relation) => relation.id === 'MR2');
  if (mr2 === undefined) throw new Error(`${paragraphId}: MR2가 없다.`);
  const diagnosticGold = ParagraphDiagnosticGoldSchema.parse({
    ...analysis.diagnosticGold,
    centralAxes: [
      {
        id: 'AX1',
        description: '친수성 돌기 꼭대기에서 물입자가 응축·병합하여 부착력을 넘는 물방울이 떨어지는 과정',
        relationIds: ['MR1', 'MR2'],
      },
      {
        id: 'AX2',
        description: '소수성 부분이 물방울의 마찰을 줄여 떨어진 물방울을 입까지 쉽게 흘려보내는 과정',
        relationIds: ['MR3', 'MR4'],
      },
    ],
    coreRelations: [
      analysis.diagnosticGold.coreRelations[0],
      { id: mr2.id, description: mr2.description },
      ...analysis.diagnosticGold.coreRelations.slice(1),
    ],
  });
  const propositionBundle = collaborativeBundle(parent);
  const semanticChecks = [
    {
      name: '중심 과정의 누락 관계 승격',
      passed: diagnosticGold.coreRelations.some((relation) => relation.id === 'MR2'),
      explanation: '물방울 병합·임계점·낙하 과정은 centralStory와 AX1에 포함되므로 core로 보존한다.',
    },
    {
      name: '승격 관계의 중심축 연결',
      passed: diagnosticGold.centralAxes.some((axis) =>
        axis.id === 'AX1' && axis.relationIds.includes('MR2')),
      explanation: 'MR2를 AX1에 연결하여 중심축의 의미와 핵심 관계가 일치한다.',
    },
  ];
  results.push({
    sourceId,
    paragraphId,
    title: '나미브 사막 딱정벌레의 수분 획득 원리와 방법 · 4문단',
    repairSummary: '중심 서사에 포함됐지만 supporting으로 분류된 MR2를 core로 승격하고 AX1에 연결했다.',
    issueSource: {
      type: 'AXIS_MAPPING_NEEDS_REVIEW',
      verdict: mappingArtifact.result.verdict,
      issues: mappingArtifact.result.issues,
    },
    operations: [
      { operation: 'PROMOTE_RELATION_TO_CORE', relationId: 'MR2' },
      { operation: 'MAP_CORE_RELATION_TO_AXIS', relationId: 'MR2', axisId: 'AX1' },
    ],
    diagnosticGold,
    propositionBundle,
    semanticChecks,
  });
}

{
  const sourceId = '6a2294f386fd308968e10e95';
  const paragraphId = `${sourceId}-p5`;
  const dir = paragraphDir(sourceId, paragraphId);
  const diagnosticGold = ParagraphDiagnosticGoldSchema.parse(
    readJson(resolve(dir, 'diagnostic-gold-repaired.json')),
  );
  const parent = ParagraphPropositionBundleSchema.parse(
    readJson(resolve(dir, 'proposition-bundle-repaired.json')),
  );
  const reauditArtifact = readJson(resolve(dir, '06-reaudit.json')) as { readonly result: unknown };
  const reaudit = ParagraphGoldAuditOutputSchema.parse(reauditArtifact.result);
  const propositions = parent.propositions.map((proposition) => proposition.id === 'P7'
    ? {
        ...proposition,
        description: '안개 쬐기 자세는 딱정벌레가 생존을 위해 선택한 최적화 전략이라 할 수 있다.',
      }
    : proposition);
  const propositionBundle = collaborativeBundle(parent, propositions);
  const semanticChecks = [{
    name: '평가 양상 보존',
    passed: propositionBundle.propositions.some((proposition) =>
      proposition.id === 'P7' && proposition.description.endsWith('이라 할 수 있다.')),
    explanation: "원문의 완화된 평가 표현인 ‘최적화 전략이라 할 수 있다’를 단정으로 바꾸지 않는다.",
  }];
  results.push({
    sourceId,
    paragraphId,
    title: '나미브 사막 딱정벌레의 수분 획득 원리와 방법 · 5문단',
    repairSummary: 'P7의 단정 표현을 원문의 완화된 평가 양상으로 복원했다.',
    issueSource: {
      type: 'FIRST_REAUDIT_REPAIR_REQUIRED',
      auditHash: artifactHash(reaudit),
      issues: reaudit.issues,
    },
    operations: [{ operation: 'REVISE_PROPOSITION_MODALITY', propositionId: 'P7' }],
    diagnosticGold,
    propositionBundle,
    semanticChecks,
  });
}

for (const result of results) {
  if (result.semanticChecks.some((check) => !check.passed)) {
    throw new Error(`${result.paragraphId}: 협업 수리 의미 점검 실패`);
  }
  const source = readJson(resolve(
    paragraphDir(result.sourceId, result.paragraphId),
    '00-source.json',
  )) as { readonly paragraph: { readonly text: string } };
  if (result.diagnosticGold.paragraphText !== source.paragraph.text) {
    throw new Error(`${result.paragraphId}: 원문이 변경됐다.`);
  }
  const dir = resolve(outputRoot, result.paragraphId);
  writeJson(resolve(dir, 'diagnostic-gold.json'), result.diagnosticGold);
  writeJson(resolve(dir, 'proposition-bundle.json'), result.propositionBundle);
  writeJson(resolve(dir, 'repair.json'), {
    artifactType: 'paragraph-gold-collaborative-repair-v1',
    batchId,
    sourceId: result.sourceId,
    paragraphId: result.paragraphId,
    title: result.title,
    issueSource: result.issueSource,
    repairSummary: result.repairSummary,
    operations: result.operations,
    diagnosticGold: result.diagnosticGold,
    propositionBundle: result.propositionBundle,
    semanticChecks: result.semanticChecks,
    status: 'SEMIAUTOMATIC_REPAIR_PENDING_USER_APPROVAL',
    productionEligible: false,
  });
  writeJson(resolve(dir, 'validation.json'), {
    artifactType: 'paragraph-gold-collaborative-repair-validation-v1',
    batchId,
    paragraphId: result.paragraphId,
    schemaValidation: 'PASS',
    sourceTextPreserved: true,
    semanticChecks: result.semanticChecks,
    outputHashes: {
      diagnosticGold: artifactHash(result.diagnosticGold),
      propositionBundle: artifactHash(result.propositionBundle),
    },
    productionEligible: false,
    reason: '사용자 승인 전인 반자동 수리 후보이다.',
  });
}

const casebook = {
  artifactType: 'paragraph-gold-repair-casebook-v1',
  batchId,
  cases: [
    {
      caseId: 'PGC-005',
      category: 'CORE_RELATION_OUTSIDE_CENTRAL_STORY',
      sourceParagraphId: '69c0994b78128b2a9bee0922-p2',
      failure: 'core로 분류한 압축·인장하중 방향 구분 MR1을 중심 서사와 중심축에서 누락했다.',
      correction: 'MR1 의미를 중심 서사에 복원하고 AX1에 연결했다.',
      generalRule: 'core relation은 중심 서사에 의미가 나타나고 적어도 하나의 중심축에 연결되어야 한다.',
      proposedPromotion: 'PROMOTE_AS_STRUCTURAL_INVARIANT',
    },
    {
      caseId: 'PGC-006',
      category: 'CENTRAL_RELATION_MISCLASSIFIED_AS_SUPPORTING',
      sourceParagraphId: '6a2294f386fd308968e10e95-p4',
      failure: '중심 서사와 AX1의 필수 과정인 물방울 병합·낙하 MR2를 supporting으로 분류했다.',
      correction: 'MR2를 core로 승격하고 AX1에 연결했다.',
      generalRule: '중심 서사나 중심축의 필수 단계를 설명하는 relation을 supporting으로 낮추지 않는다.',
      proposedPromotion: 'PROMOTE_AS_STRUCTURAL_INVARIANT',
    },
    {
      caseId: 'PGC-007',
      category: 'MODALITY_LOSS_IN_PROPOSITION',
      sourceParagraphId: '6a2294f386fd308968e10e95-p5',
      failure: "원문의 ‘최적화 전략이라 할 수 있다’를 ‘최적화 전략이다’로 단정했다.",
      correction: 'P7에 원문의 완화된 평가 양상을 복원했다.',
      generalRule: '‘볼 수 있다’, ‘할 수 있다’, ‘가능하다’ 같은 평가·가능성 양상을 단정으로 강화하지 않는다.',
      proposedPromotion: 'PROMOTE_TO_AUDIT_AND_REPAIR_EXAMPLES',
    },
  ],
};
writeJson(resolve(outputRoot, 'casebook.json'), casebook);
writeText(resolve(outputRoot, 'RULE-PROMOTION-REVIEW.md'), `# 배치 002 일반 규칙 승격 검토

## PGC-005 · core relation과 중심 서사·중심축의 일치

- 판단: 구조적 불변 조건으로 즉시 채택할 가치가 있다.
- 이유: core로 분류한 관계가 중심 서사나 어느 중심축에도 없으면 현재 계약 내부에서 이미
  모순이다.
- 적용 위치: 생성 후 정적 검사와 축-관계 매핑 단계.
- 프롬프트 예시 추가: 보류. 먼저 코드로 검출 가능한 범위를 구현한다.

## PGC-006 · 중심 과정의 supporting 오분류

- 판단: PGC-005와 묶어 구조적 불변 조건으로 관리한다.
- 이유: 중심 서사와 중심축에 명시된 필수 과정이 supporting이면 축을 완성할 core relation이
  없어지고 매핑이 중단된다.
- 적용 위치: 최초 분석과 축-관계 매핑 단계.
- 프롬프트 예시 추가: 다음 배치 전에 사용자 승인 후 검토한다.

## PGC-007 · 평가·가능성 양상의 단정 강화

- 판단: 감사·수리 예시로 승격할 가치가 있다.
- 이유: 원문의 ‘할 수 있다’를 ‘이다’로 바꾸면 명제의 확실성 수준이 달라진다. 최초 감사가
  다른 쟁점만 발견하고 이를 놓쳤으므로 감사 coverage 보완도 필요하다.
- 적용 위치: 최초 생성, 독립 감사, 자동 수리의 인접 필드 점검.
- 프롬프트 예시 추가: 이번 배치의 사용자 승인 후 repair prompt 다음 버전 후보로 제안한다.
`);

const automaticParagraphs: Array<Record<string, unknown>> = [];
for (const sourceId of ['6a2294f386fd308968e10e95', '69c0994b78128b2a9bee0922']) {
  const sourceRoot = resolve(artifactRoot, sourceId);
  for (const paragraphId of
    ['p1', 'p2', 'p3', 'p4', 'p5'].map((suffix) => `${sourceId}-${suffix}`)) {
    if (results.some((result) => result.paragraphId === paragraphId)) continue;
    const dir = resolve(sourceRoot, paragraphId);
    const status = readJson(resolve(dir, 'status.json')) as {
      readonly status?: unknown;
      readonly productionEligible?: unknown;
      readonly diagnosticGoldHash?: unknown;
      readonly propositionBundleHash?: unknown;
    };
    if (
      status.status !== 'AGENT_AUDITED' ||
      status.productionEligible !== true ||
      typeof status.diagnosticGoldHash !== 'string' ||
      typeof status.propositionBundleHash !== 'string'
    ) {
      throw new Error(`${paragraphId}: 자동 감사 통과 문단이 아니다.`);
    }
    const diagnosticPaths = [
      resolve(dir, 'diagnostic-gold-candidate.json'),
      resolve(dir, 'diagnostic-gold-repaired.json'),
    ];
    const bundlePaths = [
      resolve(dir, 'proposition-bundle-candidate.json'),
      resolve(dir, 'proposition-bundle-repaired.json'),
    ];
    const diagnosticPath = diagnosticPaths.find((path) =>
      existsSync(path) && artifactHash(ParagraphDiagnosticGoldSchema.parse(readJson(path))) === status.diagnosticGoldHash);
    const bundlePath = bundlePaths.find((path) =>
      existsSync(path) && artifactHash(ParagraphPropositionBundleSchema.parse(readJson(path))) === status.propositionBundleHash);
    if (diagnosticPath === undefined || bundlePath === undefined) {
      throw new Error(`${paragraphId}: 상태 해시와 일치하는 자동 산출물이 없다.`);
    }
    automaticParagraphs.push({
      sourceId,
      paragraphId,
      approvalLabel: 'AUTOMATIC_AGENT_AUDITED',
      approvedDiagnosticGold: {
        path: projectPath(diagnosticPath),
        hash: status.diagnosticGoldHash,
      },
      approvedPropositionBundle: {
        path: projectPath(bundlePath),
        hash: status.propositionBundleHash,
      },
      productionEligible: true,
    });
  }
}

const semiautomaticParagraphs = results.map((result) => {
  const dir = resolve(outputRoot, result.paragraphId);
  return {
    sourceId: result.sourceId,
    paragraphId: result.paragraphId,
    approvalLabel: 'SEMIAUTOMATIC_PENDING_USER_APPROVAL',
    proposedDiagnosticGold: {
      path: projectPath(resolve(dir, 'diagnostic-gold.json')),
      hash: artifactHash(result.diagnosticGold),
    },
    proposedPropositionBundle: {
      path: projectPath(resolve(dir, 'proposition-bundle.json')),
      hash: artifactHash(result.propositionBundle),
    },
    productionEligible: false,
  };
});
if (automaticParagraphs.length !== 7 || semiautomaticParagraphs.length !== 3) {
  throw new Error(`분류 수 오류: 자동 ${automaticParagraphs.length}, 반자동 ${semiautomaticParagraphs.length}`);
}
writeJson(resolve(batchRoot, 'approval-pending-manifest-v1.json'), {
  artifactType: 'paragraph-gold-batch-approval-pending-manifest-v1',
  batchId,
  counts: {
    total: 10,
    automaticAgentAudited: 7,
    semiautomaticPendingUserApproval: 3,
    productionEligibleBeforeUserApproval: 7,
  },
  paragraphs: [...automaticParagraphs, ...semiautomaticParagraphs],
});

writeJson(resolve(outputRoot, 'summary.json'), {
  artifactType: 'paragraph-gold-collaborative-repair-summary-v1',
  batchId,
  repairedParagraphCount: results.length,
  results: results.map((result) => ({
    paragraphId: result.paragraphId,
    title: result.title,
    repairSummary: result.repairSummary,
    semanticChecks: result.semanticChecks,
    status: 'SEMIAUTOMATIC_REPAIR_PENDING_USER_APPROVAL',
  })),
  productionEligibleCount: 0,
  automaticAgentAuditedCount: 7,
  semiautomaticPendingUserApprovalCount: 3,
  apiExecution: {
    responseCount: 48,
    costUsd: 1.2566028,
  },
});

writeText(resolve(outputRoot, 'REPORT.md'), `# 두 번째 10문단 배치 협업 수리 보고

## 1. 전체 맥락

두 지문의 10개 문단을 동일한 계획 해시로 생성·감사하고 자동 수리를 1회까지만 실행했다.
7개는 자동 감사 경로로 통과했고 3개는 협업 수리 대상으로 남았다.

## 2. 수행한 작업에 대한 목적

자동 단계에서 남은 문단만 최소 수정하고, 실패 원인을 다음 배치에 재사용할 사례로 남기는 것이
목적이다.

## 3. 작업 과정

- 구조물 2문단: core MR1을 중심 서사와 AX1에 복원
- 딱정벌레 4문단: supporting으로 잘못 분류된 MR2를 core로 승격하고 AX1에 연결
- 딱정벌레 5문단: P7의 단정 표현을 원문의 완화된 평가 양상으로 복원
- 기존 API 산출물은 변경하지 않고 별도 자식 Bundle로 저장
- 스키마, 원문 보존, ID 참조 및 사례별 의미 조건 검사

## 4. 작업 결과

세 협업 수리 후보는 정적·사례별 의미 검사를 통과했다. 독립 API 재감사는 추가로 실행하지
않았으며, 사용자 승인 전이므로 생산 자격은 부여하지 않았다.

| 경로 | 문단 수 | 현재 상태 |
|---|---:|---|
| 자동 감사 통과 | 7 | 생산 가능 |
| 반자동 협업 수리 | 3 | 사용자 승인 대기 |

유료 API 응답은 48회이고 계산 비용은 1.2566028달러다. 승인된 10달러 상한을 넘지 않았다.

## 5. 결과 해석

두 문제는 생성 내용 자체보다 core relation과 중심 서사·중심축 사이의 일관성 문제였고,
기존 매핑 게이트가 이를 생산 전에 차단했다. 나머지 하나는 평가 양상을 단정으로 강화한
문제로, 다음 감사·수리 예시에 추가할 가치가 있다.
`);

process.stdout.write(
  `배치 002 협업 수리 완료: 자동 7, 반자동 승인 대기 3\n${outputRoot}\n`,
);
